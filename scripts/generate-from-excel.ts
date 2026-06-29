/**
 * generate-from-excel.ts
 *
 * Full AI pipeline driven by an Excel requirements file.
 * The only manual input required is filling in the Excel template.
 *
 * Flow:
 *   1. Read requirements from Excel (requirements/requirements.xlsx by default)
 *   2. Auto-generate missing Knowledge Base JSON files from the URL column
 *   3. Auto-generate missing Page Object Models from the KB JSON files
 *   4. AI expands blank TestCases cells into structured test cases
 *   5. Generate Playwright .spec.ts files for each page
 *   6. Write all reports to a timestamped run folder
 *
 * Usage:
 *   npm run generate:from-excel
 *   npm run generate:from-excel -- --file requirements/my-requirements.xlsx
 *   npm run generate:from-excel -- --file requirements/requirements.xlsx --sheet "Sprint 12"
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";

import { ProviderFactory }        from "../pipeline/providers/ProviderFactory.js";
import { KnowledgeBaseService }   from "../pipeline/kb/KnowledgeBaseService.js";
import { KnowledgeBaseGenerator } from "../pipeline/kb/KnowledgeBaseGenerator.js";
import { ExcelReader }            from "../pipeline/readers/ExcelReader.js";
import { RequirementExpander }    from "../pipeline/readers/RequirementExpander.js";
import { POMGenerator, kbKeyToClassName } from "../pipeline/generators/pom/POMGenerator.js";
import { DataFileGenerator }      from "../pipeline/generators/pom/DataFileGenerator.js";
import { PlaywrightGenerator }    from "../pipeline/generators/playwright/PlaywrightGenerator.js";
import { createRunContext }        from "../pipeline/reporting/RunContext.js";
import { ExcelTestCaseWriter }    from "../pipeline/utils/ExcelTestCaseWriter.js";
import { PageAnalyzer }           from "../pipeline/generators/discovery/PageAnalyzer.js";
import { ScenarioInferenceEngine } from "../pipeline/generators/discovery/ScenarioInferenceEngine.js";
import type { Requirement }       from "../pipeline/readers/ExcelReader.js";
import { ArtifactManifest }       from "../pipeline/utils/ArtifactManifest.js";
import type { KnowledgeBase }     from "../pipeline/models/KnowledgeBase.js";

// ─── CLI args ─────────────────────────────────────────────────────────────────

function getArg(flag: string, fallback: string): string {
  const eqForm    = process.argv.find(a => a.startsWith(`${flag}=`))?.slice(flag.length + 1);
  const argIdx    = process.argv.indexOf(flag);
  const spaceForm = argIdx !== -1 ? process.argv[argIdx + 1] : undefined;
  return eqForm ?? spaceForm ?? fallback;
}

const EXCEL_FILE       = getArg("--file",  "requirements/requirements.xlsx");
const SHEET_NAME       = getArg("--sheet", "");
const OUTPUT_PATH      = "tests/UI/";
// Cap per spec file — keeps each LLM call count manageable for local models.
// Override with env var: SPEC_BATCH_SIZE=50 npm run ai:run
const SPEC_BATCH_SIZE  = parseInt(process.env["SPEC_BATCH_SIZE"] ?? "20", 10);
const SPEC_MANIFEST    = path.join(".llm-cache", "spec-manifest.json");
// GitHub Models allows max 5 concurrent requests; other providers handle 8 fine.
// Override with env var: CONCURRENCY=4 npm run ai:run
const CONCURRENCY = parseInt(process.env["CONCURRENCY"] ?? (
  (process.env["LLM_PROVIDER"] ?? "").toLowerCase() === "github-models" ? "4" : "8"
), 10);

// ─── Spec manifest helpers ─────────────────────────────────────────────────────

interface SpecManifestEntry { hash: string; files: string[]; generatedAt: string; }
type SpecManifest = Record<string, SpecManifestEntry>;

function loadSpecManifest(): SpecManifest {
  try {
    return JSON.parse(fs.readFileSync(SPEC_MANIFEST, "utf-8")) as SpecManifest;
  } catch {
    return {};
  }
}

function saveSpecManifest(manifest: SpecManifest): void {
  fs.mkdirSync(path.dirname(SPEC_MANIFEST), { recursive: true });
  fs.writeFileSync(SPEC_MANIFEST, JSON.stringify(manifest, null, 2));
}

function hashTestCases(testCases: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(testCases)).digest("hex");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEP  = "═".repeat(58);
const SEP2 = "─".repeat(58);

function banner(msg: string)  { console.log(`\n${SEP}\n  ${msg}\n${SEP}`); }
function section(msg: string) { console.log(`\n${SEP2}\n  ${msg}\n${SEP2}`); }
function tick(msg: string)    { console.log(`  ✅  ${msg}`); }
function cross(msg: string)   { console.log(`  ❌  ${msg}`); }
function warn(msg: string)    { console.log(`  ⚠️   ${msg}`); }
function info(k: string, v: string) { console.log(`       ${k.padEnd(18)}: ${v}`); }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {

  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`\n  ERROR: Requirements file not found: ${EXCEL_FILE}`);
    console.error(`  Create one with: npm run requirements:template\n`);
    process.exit(1);
  }

  banner("AI Test Platform — Excel-Driven Generation");

  const runs = createRunContext();
  console.log(`\n  Run ID      : ${runs.runId}`);
  console.log(`  Input file  : ${EXCEL_FILE}`);
  console.log(`  Output dir  : ${OUTPUT_PATH}\n`);

  const llm        = ProviderFactory.create();
  const manifest   = new ArtifactManifest();
  const kbService  = new KnowledgeBaseService();
  const kbGen      = new KnowledgeBaseGenerator(llm);
  const reader     = new ExcelReader();
  const expander   = new RequirementExpander(llm);
  const pomGen     = new POMGenerator(llm);
  const dataGen    = new DataFileGenerator(llm);
  const pwGen      = new PlaywrightGenerator();

  // ── Step 1: Read Excel ──────────────────────────────────────────────────────
  section("Step 1 — Reading Requirements from Excel");
  const parseResult = await reader.read(EXCEL_FILE, SHEET_NAME || undefined);

  info("Requirements",  String(parseResult.requirements.length));
  info("AI-generate",   String(parseResult.aiCount));
  info("Manual",        String(parseResult.manualCount));
  info("Skipped rows",  String(parseResult.skippedCount));
  info("Pages found",   String(parseResult.pageUrls.size));

  if (parseResult.requirements.length === 0) {
    console.error("\n  ERROR: No requirements found in file. Check the worksheet format.\n");
    process.exit(1);
  }

  let pageGroups       = reader.groupByPage(parseResult.requirements);
  const knowledgeBases = new Map<string, KnowledgeBase>();

  // ── Step 2: Auto-generate missing Knowledge Base files ─────────────────────
  section("Step 2 — Auto-generating Missing Knowledge Base Files");

  const httpUsername = process.env["HTTP_USERNAME"];
  const httpPassword = process.env["HTTP_PASSWORD"];
  const httpCredentials = httpUsername && httpPassword
    ? { username: httpUsername, password: httpPassword }
    : undefined;

  // Loop over pageUrls (not pageGroups) so that discovery-only rows — those with
  // only URL + Page + Feature and no Description — also trigger KB generation.
  for (const [pageKey, url] of parseResult.pageUrls) {
    const kbFile   = path.join("pipeline/kb/pages", `${pageKey}.json`);
    const urlChanged = manifest.isUrlChanged(pageKey, url);

    if (fs.existsSync(kbFile) && !urlChanged) {
      console.log(`  ⏭   KB unchanged: ${kbFile}`);
      manifest.setKbVerified(pageKey, url, kbFile);
      continue;
    }

    if (urlChanged && fs.existsSync(kbFile)) {
      warn(`URL changed for "${pageKey}" — regenerating KB`);
    }

    process.stdout.write(`  ▸ Generating KB for "${pageKey}" from ${url} ... `);
    try {
      fs.mkdirSync("pipeline/kb/pages", { recursive: true });
      await kbGen.generate(url, pageKey, httpCredentials);
      console.log("done");
      tick(kbFile);
      manifest.setKbVerified(pageKey, url, kbFile);
      manifest.save();
    } catch (err) {
      console.log("failed");
      cross(`KB generation for "${pageKey}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Step 2.5: AI-discover additional scenarios from live pages ─────────────
  section("Step 2.5 — AI Discovering Additional Scenarios from Live Pages");

  const pageAnalyzer    = new PageAnalyzer();
  const scenarioEngine  = new ScenarioInferenceEngine(llm);
  let   discoveredTotal = 0;
  let   pseudoRowBase   = 10_000; // high offset — avoids collision with real Excel row numbers

  for (const [pageKey, url] of parseResult.pageUrls) {
    const existingReqs      = pageGroups.get(pageKey) ?? [];
    const existingScenarios = existingReqs.map(r => r.scenario).filter(Boolean);
    const featureName       = existingReqs[0]?.feature ?? pageKey;
    const cacheFile         = path.join("pipeline/kb/pages", `${pageKey}-scenarios.json`);

    // Load from cache if already discovered — skip Playwright crawl + LLM call
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8")) as import("../pipeline/generators/discovery/ScenarioInferenceEngine.js").InferredScenario[];
      const newReqs: Requirement[] = cached.map((s, i) => ({
        page: pageKey, url, feature: featureName,
        scenario: s.scenario, description: s.description, priority: s.priority,
        testCases: undefined, aiGenerate: true,
        rowNumber: pseudoRowBase + i, source: "ai-discovered" as const,
      }));
      pseudoRowBase += cached.length;
      parseResult.requirements.push(...newReqs);
      discoveredTotal += cached.length;
      console.log(`  ⏭   Scenarios cached: ${cacheFile} (${cached.length} scenarios)`);
      continue;
    }

    process.stdout.write(`  ▸ Analyzing "${pageKey}" for undiscovered scenarios... `);
    try {
      const pageContext = await pageAnalyzer.analyze(url, httpCredentials);
      const inferred    = await scenarioEngine.infer(pageContext, featureName, existingScenarios);

      if (inferred.length === 0) {
        console.log("done (no new scenarios)");
        continue;
      }

      // Persist so reruns skip this step
      fs.mkdirSync("pipeline/kb/pages", { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(inferred, null, 2));

      const newReqs: Requirement[] = inferred.map((s, i) => ({
        page:        pageKey,
        url,
        feature:     featureName,
        scenario:    s.scenario,
        description: s.description,
        priority:    s.priority,
        testCases:   undefined,
        aiGenerate:  true,
        rowNumber:   pseudoRowBase + i,
        source:      "ai-discovered" as const,
      }));

      pseudoRowBase += inferred.length;
      parseResult.requirements.push(...newReqs);
      discoveredTotal += inferred.length;

      console.log("done");
      tick(`${inferred.length} new scenarios discovered for "${pageKey}"`);
    } catch (err) {
      console.log("failed");
      cross(`Scenario discovery for "${pageKey}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Rebuild page groups so Steps 3–5 see both Excel + AI-discovered requirements
  pageGroups = reader.groupByPage(parseResult.requirements);
  info("AI-discovered scenarios", String(discoveredTotal));

  // ── Step 3: Load KB files and auto-generate missing POMs ───────────────────
  section("Step 3 — Auto-generating Missing Page Objects");

  for (const [pageKey] of pageGroups) {
    const className = kbKeyToClassName(pageKey);
    const camelName = className.charAt(0).toLowerCase() + className.slice(1);
    const pomFile   = `support/pages/${camelName}.page.ts`;
    const dataFile  = `support/data/${camelName}Data.json`;

    let kb: KnowledgeBase;
    try {
      kb = kbService.load(pageKey);
      knowledgeBases.set(pageKey, kb);
    } catch {
      warn(`No KB file for "${pageKey}" — skipping POM generation`);
      continue;
    }

    const kbFile      = path.join("pipeline/kb/pages", `${pageKey}.json`);
    const pageUrl     = parseResult.pageUrls.get(pageKey) ?? "";
    const kbChanged   = manifest.isKbChangedSincePomGen(pageKey, kbFile);
    const needsPom    = !fs.existsSync(pomFile) || kbChanged;

    if (needsPom) {
      if (kbChanged && fs.existsSync(pomFile)) {
        warn(`KB changed for "${pageKey}" — regenerating POM`);
      }
      process.stdout.write(`  ▸ Generating POM for ${className}... `);
      try {
        const pomResult = await pomGen.generate(kb, pageKey);
        fs.mkdirSync("support/pages", { recursive: true });
        fs.writeFileSync(pomFile, pomResult.code, "utf-8");
        console.log("done");
        tick(pomFile);
        manifest.setPomGenerated(pageKey, pageUrl, kbFile);
        manifest.save();

        if (!fs.existsSync(dataFile)) {
          const dataResult = await dataGen.generate(kb, pageKey);
          fs.mkdirSync("support/data", { recursive: true });
          fs.writeFileSync(dataFile, dataResult.code, "utf-8");
          tick(dataFile);
        }
      } catch (err) {
        console.log("failed");
        cross(`POM generation: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      console.log(`  ⏭   POM unchanged: ${pomFile}`);
    }
  }

  // ── Step 4: Expand blank TestCases with AI ──────────────────────────────────
  section("Step 4 — AI Expanding Blank Test Cases");

  const expanded = await expander.expandAll(
    parseResult.requirements,
    knowledgeBases,
    CONCURRENCY,
    manifest,
  );

  const totalGenerated = expanded.reduce((n, r) => n + r.generatedTestCases.length, 0);
  info("Rows expanded",   String(parseResult.aiCount));
  info("Test cases gen.", String(totalGenerated));

  fs.writeFileSync(
    path.join(runs.generatedCases, "requirements-test-cases.json"),
    JSON.stringify({
      runId:        runs.runId,
      excelFile:    EXCEL_FILE,
      generatedAt:  new Date().toISOString(),
      requirements: expanded.map(r => ({
        page:          r.page,
        feature:       r.feature,
        scenario:      r.scenario,
        aiGenerate:    r.aiGenerate,
        testCaseCount: r.aiGenerate ? r.generatedTestCases.length : 0,
        testCases:     r.aiGenerate ? r.generatedTestCases : [],
      })),
    }, null, 2),
  );
  tick(`requirements-test-cases.json → ${runs.generatedCases}`);

  // Write generated test cases back to the Excel file as Sheet 2
  process.stdout.write(`  ▸ Writing "Generated Test Cases" sheet to ${EXCEL_FILE}... `);
  try {
    const writer   = new ExcelTestCaseWriter();
    const tcCount  = await writer.write(EXCEL_FILE, expanded);
    console.log("done");
    tick(`Sheet 2 — ${tcCount} test cases written → ${EXCEL_FILE}`);
  } catch (err) {
    console.log("failed");
    cross(`Excel write-back: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Step 5: Generate Playwright scripts ─────────────────────────────────────
  section("Step 5 — Generating Playwright Scripts");

  fs.mkdirSync(OUTPUT_PATH, { recursive: true });
  const specResults: { page: string; file: string; status: "ok" | "failed" }[] = [];
  const specManifest = loadSpecManifest();

  for (const [pageKey, reqs] of pageGroups) {
    const kb = knowledgeBases.get(pageKey);
    if (!kb) {
      cross(`No KB for "${pageKey}" — skipping script generation`);
      continue;
    }

    const allTestCases = reqs.flatMap(r =>
      r.aiGenerate
        ? (expanded.find(e => e.rowNumber === r.rowNumber)?.generatedTestCases ?? [])
        : []
    );

    if (allTestCases.length === 0) {
      console.log(`  ⏭   ${pageKey} — no AI test cases to generate`);
      continue;
    }

    // Spec-level cache: skip generation when test cases are identical to the last run.
    const tcHash  = hashTestCases(allTestCases);
    const cached  = specManifest[pageKey];
    if (cached?.hash === tcHash && cached.files.every(f => fs.existsSync(f))) {
      console.log(`  ⏭   ${pageKey} — specs unchanged (cache hit, ${cached.files.length} file(s))`);
      cached.files.forEach(f => specResults.push({ page: pageKey, file: f, status: "ok" }));
      continue;
    }

    // Split into batches so each spec file stays within a manageable LLM call count.
    // Each test case makes ~(steps + 1) LLM calls; 20 cases ≈ ~120 calls per file.
    const batches: typeof allTestCases[] = [];
    for (let i = 0; i < allTestCases.length; i += SPEC_BATCH_SIZE) {
      batches.push(allTestCases.slice(i, i + SPEC_BATCH_SIZE));
    }

    const batchLabel = batches.length > 1
      ? `${allTestCases.length} cases → ${batches.length} spec files`
      : `${allTestCases.length} cases`;
    console.log(`  ▸ Generating script for ${pageKey} (${batchLabel})`);

    const pageSpecFiles: string[] = [];
    let   pageHadError = false;

    for (let b = 0; b < batches.length; b++) {
      const batch    = batches[b]!;
      const suffix   = batches.length > 1 ? `-${b + 1}` : "";
      const fileName = `${pageKey}-excel${suffix}.spec.ts`;
      const label    = batches.length > 1
        ? `  ▸ Batch ${b + 1}/${batches.length} (${batch.length} cases)... `
        : `  ▸ Writing spec... `;

      process.stdout.write(label);
      try {
        const script     = await pwGen.generate(batch, kb);
        const outputPath = path.join(OUTPUT_PATH, fileName);

        fs.writeFileSync(outputPath, script, "utf-8");
        fs.copyFileSync(outputPath, path.join(runs.generatedScripts, fileName));

        console.log("done");
        tick(`${outputPath}  (${script.split("\n").length} lines)`);
        specResults.push({ page: pageKey, file: outputPath, status: "ok" });
        pageSpecFiles.push(outputPath);

      } catch (err) {
        console.log("failed");
        cross(`${pageKey} batch ${b + 1}: ${err instanceof Error ? err.message : String(err)}`);
        specResults.push({ page: pageKey, file: fileName, status: "failed" });
        pageHadError = true;
      }
    }

    // Update both manifests only when every batch succeeded
    if (!pageHadError && pageSpecFiles.length > 0) {
      specManifest[pageKey] = {
        hash:        tcHash,
        files:       pageSpecFiles,
        generatedAt: new Date().toISOString(),
      };
      saveSpecManifest(specManifest);

      const pageUrl = parseResult.pageUrls.get(pageKey) ?? "";
      manifest.setPageSpecFiles(pageKey, pageUrl, pageSpecFiles);
      manifest.save();
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  banner("Generation Complete — Summary");

  const passed = specResults.filter(r => r.status === "ok");
  const failed = specResults.filter(r => r.status === "failed");
  console.log(`\n  ${passed.length} scripts generated   ${failed.length} failed\n`);

  fs.writeFileSync(
    path.join(runs.aiReports, "excel-generation-summary.json"),
    JSON.stringify({
      runId:        runs.runId,
      excelFile:    EXCEL_FILE,
      generatedAt:  new Date().toISOString(),
      requirements: parseResult.requirements.length,
      aiExpanded:   parseResult.aiCount,
      scripts:      specResults,
    }, null, 2),
  );

  if (passed.length > 0) {
    console.log(`  Run tests:      npm test`);
    console.log(`  Reports folder: open ${runs.root}\n`);
  }

  // Log LLM cache stats if available (CachingLLMProvider wraps every provider)
  if ("logStats" in llm && typeof (llm as { logStats(): void }).logStats === "function") {
    (llm as { logStats(): void }).logStats();
  }

  if (failed.length > 0) process.exit(1);
}

main().catch(err => {
  console.error("\n  Unexpected error:", (err as Error).message);
  process.exit(1);
});
