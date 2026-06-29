/**
 * generate-all.ts
 *
 * Reads config/platform.json and generates Playwright test files
 * for every suite defined in it — one command for the entire project.
 *
 * Features:
 *   - requirement is OPTIONAL — auto-generated from KB when omitted
 *   - TestCaseGenerator is KB-aware: generates page-specific scenarios
 *   - Parallel suite generation (up to CONCURRENCY suites at once)
 *   - Multi-environment support (loads config/environments/{env}.env)
 *   - LLM model configured via config/platform.json
 *   - Exports TestCase[] to JSON + HTML report in reports/
 *
 * Run:
 *   npm run generate:all
 *   ENVIRONMENT=uat npm run generate:all
 */

import "dotenv/config";
import fs from "fs";
import path from "path";

import type { LLMProvider }          from "../pipeline/providers/interfaces/LLMProvider.js";
import { ProviderFactory }           from "../pipeline/providers/ProviderFactory.js";
import { RequirementGenerator }     from "../pipeline/generators/requirements/RequirementGenerator.js";
import { TestCaseGenerator }        from "../pipeline/generators/test-cases/TestCaseGenerator.js";
import { TestDataGenerator }        from "../pipeline/generators/test-data/TestDataGenerator.js";
import { AIActionModelGenerator }   from "../pipeline/generators/action-model/AIActionModelGenerator.js";
import { AssertionGenerator }       from "../pipeline/generators/assertions/AssertionGenerator.js";
import { PlaywrightRenderer }       from "../pipeline/generators/playwright/PlaywrightRenderer.js";
import { PlaywrightGenerator, type PomOptions } from "../pipeline/generators/playwright/PlaywrightGenerator.js";
import { KnowledgeBaseService }     from "../pipeline/kb/KnowledgeBaseService.js";
import type { TestCase }            from "../pipeline/models/TestCase.js";
import { createRunContext }         from "../pipeline/reporting/RunContext.js";
import type { RunPaths }            from "../pipeline/reporting/RunContext.js";
import { POMGenerator, kbKeyToClassName } from "../pipeline/generators/pom/POMGenerator.js";
import { DataFileGenerator }        from "../pipeline/generators/pom/DataFileGenerator.js";
import { FixtureUpdater, classNameToFixtureKey } from "../pipeline/generators/pom/FixtureUpdater.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuiteConfig {
  name:         string;
  page:         string;
  requirement?: string;   // optional — auto-generated from KB when absent
  outputFile:   string;
}

interface PlatformConfig {
  projectName:        string;
  defaultEnvironment: string;
  llmModel?:          string;
  testOutputPath:     string;
  reportOutputPath:   string;
  suites:             SuiteConfig[];
}

interface SuiteResult {
  suite:        string;
  file:         string;
  status:       "ok" | "failed";
  requirement?: string;
  testCases?:   TestCase[];
  error?:       string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONCURRENCY = 1; // Free-tier Gemini: 5 RPM — run suites sequentially to stay within quota

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEP  = "─".repeat(56);
const BOLD = "═".repeat(56);

function banner(msg: string)        { console.log(`\n${BOLD}\n  ${msg}\n${BOLD}`); }
function section(msg: string)       { console.log(`\n${SEP}\n  ${msg}\n${SEP}`); }
function tick(msg: string)          { console.log(`  ✅  ${msg}`); }
function cross(msg: string)         { console.log(`  ❌  ${msg}`); }
function info(k: string, v: string) { console.log(`       ${k.padEnd(16)}: ${v}`); }

// ─── Environment loader ───────────────────────────────────────────────────────

function loadEnvironment(config: PlatformConfig): void {
  const env     = process.env.ENVIRONMENT ?? config.defaultEnvironment ?? "development";
  const envFile = path.join("config", "environments", `${env}.env`);

  if (!fs.existsSync(envFile)) return;

  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) continue;
    const key   = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }

  console.log(`  Environment   : ${env}  (${envFile})`);
  if (process.env.BASE_URL) console.log(`  BASE_URL      : ${process.env.BASE_URL}`);
}

// ─── Report writers ───────────────────────────────────────────────────────────

function writeJsonReport(
  reportPath: string,
  suite: SuiteConfig,
  requirement: string,
  testCases: TestCase[]
): void {
  const report = {
    suite:       suite.name,
    page:        suite.page,
    requirement,
    generatedAt: new Date().toISOString(),
    totalCases:  testCases.length,
    testCases,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

function writeHtmlReport(
  htmlPath: string,
  projectName: string,
  results: SuiteResult[]
): void {
  const ok  = results.filter(r => r.status === "ok" && r.testCases);
  const now = new Date().toLocaleString();

  const suiteSections = ok.map(r => {
    const rows = (r.testCases ?? []).map(tc => `
      <tr>
        <td class="id">${tc.id}</td>
        <td class="title">${tc.title}</td>
        <td class="steps"><ol>${tc.steps.map(s => `<li>${s}</li>`).join("")}</ol></td>
        <td class="expected">${tc.expectedResult}</td>
      </tr>`).join("");

    return `
    <section>
      <h2>${r.suite}</h2>
      <p class="req"><strong>Requirement:</strong> ${r.requirement ?? ""}</p>
      <p class="meta">Output: <code>${r.file}</code></p>
      <table>
        <thead><tr><th>ID</th><th>Title</th><th>Steps</th><th>Expected Result</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
  }).join("\n");

  const failSection = results.filter(r => r.status === "failed")
    .map(r => `<li><strong>${r.suite}</strong> — ${r.error}</li>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${projectName} — Test Cases</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fa;color:#1a1a2e;line-height:1.5}
  header{background:#1a1a2e;color:#fff;padding:24px 40px}
  header h1{font-size:24px;font-weight:700}
  header p{font-size:13px;opacity:.7;margin-top:4px}
  .summary{display:flex;gap:16px;padding:20px 40px;background:#fff;border-bottom:1px solid #e0e0e0}
  .badge{padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600}
  .badge.ok{background:#d4edda;color:#155724}
  .badge.fail{background:#f8d7da;color:#721c24}
  main{padding:24px 40px}
  section{background:#fff;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:24px;overflow:hidden}
  section h2{padding:16px 20px;background:#1a1a2e;color:#fff;font-size:16px}
  .req{padding:10px 20px;background:#f0f4ff;font-size:13px;color:#333;border-bottom:1px solid #e0e0e0}
  .meta{padding:6px 20px;background:#f8f9fa;border-bottom:1px solid #e0e0e0;font-size:12px;color:#666}
  table{width:100%;border-collapse:collapse}
  th{padding:10px 16px;background:#f0f2f5;font-size:12px;text-transform:uppercase;letter-spacing:.5px;text-align:left;border-bottom:2px solid #d0d4da}
  td{padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;vertical-align:top}
  td.id{font-family:monospace;color:#555;width:70px}
  td.title{font-weight:600;width:22%}
  td.steps ol{padding-left:16px}
  td.steps li{margin-bottom:4px}
  td.expected{color:#2d6a4f}
  tr:last-child td{border-bottom:none}
  .failures{background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px 20px;margin-bottom:24px}
  .failures h3{color:#856404;margin-bottom:8px}
  .failures ul{padding-left:20px;color:#856404;font-size:13px}
  footer{padding:20px 40px;font-size:12px;color:#999;border-top:1px solid #e0e0e0}
</style>
</head>
<body>
<header>
  <h1>${projectName} — Generated Test Cases</h1>
  <p>Generated ${now} &nbsp;|&nbsp; ${ok.length} suite(s) &nbsp;|&nbsp; ${ok.reduce((n, r) => n + (r.testCases?.length ?? 0), 0)} test cases</p>
</header>
<div class="summary">
  <span class="badge ok">${results.filter(r => r.status === "ok").length} succeeded</span>
  ${results.filter(r => r.status === "failed").length > 0
    ? `<span class="badge fail">${results.filter(r => r.status === "failed").length} failed</span>`
    : ""}
</div>
<main>
${failSection ? `<div class="failures"><h3>Generation Failures</h3><ul>${failSection}</ul></div>` : ""}
${suiteSections}
</main>
<footer>AI Test Intelligence Platform — Test cases generated from requirements using AI</footer>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html);
}

// ─── Suite generator ──────────────────────────────────────────────────────────

async function generateSuite(
  suite: SuiteConfig,
  index: number,
  total: number,
  llm: LLMProvider,
  kbService: KnowledgeBaseService,
  playwrightGen: PlaywrightGenerator,
  reqGen: RequirementGenerator,
  testOutputPath: string,
  runs: RunPaths,
  pomGen: POMGenerator,
  dataGen: DataFileGenerator,
): Promise<SuiteResult> {

  section(`Suite ${index + 1} of ${total} — ${suite.name}`);
  info("Page",   suite.page);
  info("Output", suite.outputFile);

  try {
    // Load knowledge base first — needed for both requirement generation and test case generation
    process.stdout.write("  ▸ Loading knowledge base... ");
    const kb = kbService.load(suite.page);
    console.log(`done  (${suite.page})`);

    // Auto-generate POM + data file if not yet present for this page
    const className  = kbKeyToClassName(suite.page);
    const camelName  = className.charAt(0).toLowerCase() + className.slice(1);
    const pomFile    = `tests/pages/${className}.ts`;
    const dataFile   = `tests/data/${camelName}.data.ts`;
    const baseName   = suite.outputFile.replace(/\.spec\.ts$/, "");
    const fixtureKey = classNameToFixtureKey(className);
    const fixtureUpd = new FixtureUpdater();
    let dataResultInfo = { interfaceName: `${className}Data`, fileName: `${camelName}.data.ts` };

    if (!fs.existsSync(pomFile)) {
      fs.mkdirSync("tests/pages", { recursive: true });
      fs.mkdirSync("tests/data",  { recursive: true });
      process.stdout.write(`  ▸ Generating POM (${className})... `);
      try {
        const pomResult = await pomGen.generate(kb, suite.page);
        fs.writeFileSync(pomFile, pomResult.code, "utf-8");
        console.log("done");
        tick(`POM → ${pomFile}`);

        if (!fs.existsSync(dataFile)) {
          process.stdout.write("  ▸ Generating data file... ");
          const dataResult = await dataGen.generate(kb, suite.page);
          fs.writeFileSync(dataFile, dataResult.code, "utf-8");
          console.log("done");
          tick(`Data → ${dataFile}`);
          dataResultInfo = { interfaceName: dataResult.interfaceName, fileName: dataResult.fileName };
        }

        try {
          fixtureUpd.update("tests/fixtures/base.ts", {
            className,
            fileName:      `${className}.ts`,
            fixtureKey,
            dataInterface: dataResultInfo.interfaceName,
            dataVarName:   dataResultInfo.interfaceName.charAt(0).toLowerCase() + dataResultInfo.interfaceName.slice(1),
            dataFileName:  dataResultInfo.fileName,
          });
          tick(`tests/fixtures/base.ts  (${className} registered)`);
        } catch (fixErr) {
          console.warn(`  ⚠  fixtures update: ${fixErr instanceof Error ? fixErr.message : String(fixErr)}`);
        }
      } catch (pomErr) {
        const msg = pomErr instanceof Error ? pomErr.message : String(pomErr);
        console.log(`failed (${msg}) — continuing without POM`);
      }
    }

    const pomExists = fs.existsSync(pomFile);
    const pomOptions: PomOptions = pomExists ? {
      fixtureKey,
      fixtureImportPath:  "../fixtures/base.js",
      testDataImportPath: `../data/${camelName}.data.js`,
      pageClassName:      className,
      pageImportPath:     `../pages/${className}.js`,
    } : {
      fixtureKey,
      fixtureImportPath:  "../fixtures/base.js",
      testDataImportPath: `./${baseName}.data.js`,
      noPageClass:        true,
    };

    // Resolve requirement: use manual value or auto-generate from KB
    let requirement = suite.requirement?.trim() ?? "";
    if (!requirement) {
      process.stdout.write("  ▸ Generating requirement from KB... ");
      requirement = await reqGen.generate(kb);
      console.log("done");
      console.log(`\n  Requirement (AI-generated):\n  "${requirement.slice(0, 200)}${requirement.length > 200 ? "..." : ""}"\n`);
    } else {
      console.log(`\n  Requirement (manual):\n  "${requirement}"\n`);
    }

    // Test cases — KB-aware generation
    process.stdout.write("  ▸ Generating test cases (KB-aware)... ");
    const testCases = await new TestCaseGenerator(llm).generate(requirement, kb);
    console.log(`done  (${testCases.length} cases)`);
    testCases.forEach(tc => console.log(`       [${tc.id}] ${tc.title}`));

    // Test data
    process.stdout.write("\n  ▸ Generating test data... ");
    const testData = await new TestDataGenerator(llm).generate(requirement);
    console.log("done");
    // Playwright script
    if (!pomExists) {
      const sidecarDataPath = `${testOutputPath}${baseName}.data.ts`;
      fs.writeFileSync(sidecarDataPath, `export const testData = ${JSON.stringify(testData, null, 2)};\n`);
      tick(`Data → ${sidecarDataPath}`);
    }

    process.stdout.write("\n  ▸ Generating Playwright script... ");
    const script = await playwrightGen.generate(testCases, testData, kb, pomOptions);
    console.log("done");

    // Write spec file to tests/e2e/
    const specPath = `${testOutputPath}${suite.outputFile}`;
    fs.writeFileSync(specPath, script);
    tick(`Written → ${specPath}  (${script.split("\n").length} lines)`);

    // Archive a copy of the generated script under the run folder
    const scriptCopy = path.join(runs.generatedScripts, suite.outputFile);
    fs.copyFileSync(specPath, scriptCopy);

    // Export test cases to JSON under the run folder
    const jsonReport   = path.join(runs.generatedCases, `${baseName}-test-cases.json`);
    writeJsonReport(jsonReport, suite, requirement, testCases);
    tick(`Report  → ${jsonReport}`);

    return { suite: suite.name, file: specPath, status: "ok", requirement, testCases };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    cross(`Failed — ${message}`);
    return { suite: suite.name, file: suite.outputFile, status: "failed", error: message };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {

  const configPath = "config/platform.json";
  if (!fs.existsSync(configPath)) {
    console.error(`\n  ERROR: ${configPath} not found.`);
    process.exit(1);
  }

  const config: PlatformConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  if (!config.suites || config.suites.length === 0) {
    console.error("\n  ERROR: No suites defined in config/platform.json.");
    process.exit(1);
  }

  if (!path.resolve(config.testOutputPath).startsWith(path.resolve(process.cwd()))) {
    console.error(`\n  ERROR: testOutputPath "${config.testOutputPath}" is outside the project directory.`);
    process.exit(1);
  }

  loadEnvironment(config);

  // Create a new timestamped run context — all report artefacts go under reports/{runId}/
  const runs = createRunContext();

  banner(`${config.projectName} — Generating All Test Suites`);
  console.log(`\n  Run ID        : ${runs.runId}`);
  console.log(`  Reports dir   : ${runs.root}`);
  console.log(`\n  Found ${config.suites.length} suite(s) in ${configPath}:`);
  config.suites.forEach((s, i) => {
    const reqLabel = s.requirement ? "manual" : "AI-generated";
    console.log(`    ${i + 1}. ${s.name}  →  ${config.testOutputPath}${s.outputFile}  [requirement: ${reqLabel}]`);
  });
  console.log(`\n  Concurrency : ${CONCURRENCY}`);

  // MODEL env var takes precedence over config/platform.json llmModel
  const llm = ProviderFactory.create(process.env.MODEL?.trim() || config.llmModel);
  const kbService = new KnowledgeBaseService();
  const reqGen    = new RequirementGenerator(llm);
  const pomGen    = new POMGenerator(llm);
  const dataGen   = new DataFileGenerator(llm);
  const actionModelGen     = new AIActionModelGenerator(llm);
  const renderer           = new PlaywrightRenderer();
  const assertionGenerator = new AssertionGenerator(llm);
  const playwrightGen      = new PlaywrightGenerator(actionModelGen, renderer, assertionGenerator);

  fs.mkdirSync(config.testOutputPath, { recursive: true });

  // Sequential suite generation (CONCURRENCY=1 to stay within LLM rate limits)
  const results: SuiteResult[] = [];

  for (let i = 0; i < config.suites.length; i += CONCURRENCY) {
    const chunk = config.suites.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((suite, j) =>
        generateSuite(
          suite, i + j, config.suites.length,
          llm, kbService, playwrightGen, reqGen,
          config.testOutputPath, runs,
          pomGen, dataGen
        )
      )
    );
    results.push(...chunkResults);
  }

  // HTML summary report — written to ai-reports/ for this run
  const htmlReport = path.join(runs.aiReports, "test-cases.html");
  writeHtmlReport(htmlReport, config.projectName, results);
  console.log(`\n  HTML report → ${htmlReport}`);

  // Generation summary JSON
  const summary = {
    runId:       runs.runId,
    project:     config.projectName,
    generatedAt: new Date().toISOString(),
    suiteCount:  results.length,
    passed:      results.filter(r => r.status === "ok").length,
    failed:      results.filter(r => r.status === "failed").length,
    suites:      results.map(r => ({ suite: r.suite, file: r.file, status: r.status })),
  };
  fs.writeFileSync(path.join(runs.aiReports, "generation-summary.json"), JSON.stringify(summary, null, 2));

  // Summary
  banner("Generation Complete — Summary");

  const passed = results.filter(r => r.status === "ok");
  const failed = results.filter(r => r.status === "failed");

  console.log(`\n  ${passed.length} succeeded   ${failed.length} failed\n`);
  results.forEach(r => {
    if (r.status === "ok")   tick(`${r.suite.padEnd(28)}  →  ${r.file}`);
    else                     cross(`${r.suite.padEnd(28)}  →  ${r.error}`);
  });

  if (passed.length > 0) {
    console.log(`\n  Run tests:        npm test`);
    console.log(`  View test cases:  open ${htmlReport}`);
    console.log(`  Reports folder:   open ${runs.root}\n`);
  }

  if (failed.length > 0) process.exit(1);
}

main().catch(err => {
  console.error("\n  Unexpected error:", err.message);
  process.exit(1);
});
