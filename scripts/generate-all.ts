/**
 * generate-all.ts
 *
 * Reads config/platform.json and generates Playwright test files
 * for every suite defined in it — one command for the entire project.
 *
 * Enterprise structure output:
 *   support/pages/    → POM files  (camelCase.page.ts, default export)
 *   support/data/     → JSON data  (camelCaseData.json)
 *   tests/UI/         → UI spec files  (TS-XX-Name.spec.ts)
 *   tests/API/        → API spec files (TS-XX-Name_API.spec.ts)
 *
 * Run:
 *   npm run generate:all
 *   ENVIRONMENT=uat npm run generate:all
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { ensureScaffoldFiles } from "./ensureScaffold.js";

import type { LLMProvider }         from "../pipeline/providers/interfaces/LLMProvider.js";
import { ProviderFactory }          from "../pipeline/providers/ProviderFactory.js";
import { RequirementGenerator }     from "../pipeline/generators/requirements/RequirementGenerator.js";
import { TestCaseGenerator }        from "../pipeline/generators/test-cases/TestCaseGenerator.js";
import { TestDataGenerator }        from "../pipeline/generators/test-data/TestDataGenerator.js";
import { PlaywrightGenerator }      from "../pipeline/generators/playwright/PlaywrightGenerator.js";
import { KnowledgeBaseService }     from "../pipeline/kb/KnowledgeBaseService.js";
import type { TestCase }            from "../pipeline/models/TestCase.js";
import { createRunContext }         from "../pipeline/reporting/RunContext.js";
import type { RunPaths }            from "../pipeline/reporting/RunContext.js";
import { POMGenerator, kbKeyToClassName } from "../pipeline/generators/pom/POMGenerator.js";
import { DataFileGenerator }        from "../pipeline/generators/pom/DataFileGenerator.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuiteConfig {
  name:         string;
  page:         string;
  requirement?: string;
  outputFile:   string;
}

interface PlatformConfig {
  projectName:        string;
  defaultEnvironment: string;
  llmModel?:          string;
  uiTestOutputPath:   string;
  apiTestOutputPath:  string;
  pageOutputPath:     string;
  dataOutputPath:     string;
  reportOutputPath:   string;
  suites:             SuiteConfig[];
}

interface SuiteResult {
  suite:        string;
  uiFile:       string;
  apiFile:      string;
  status:       "ok" | "failed";
  requirement?: string;
  testCases?:   TestCase[];
  error?:       string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONCURRENCY = 1;

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
  const env     = process.env['ENVIRONMENT'] ?? config.defaultEnvironment ?? "development";
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
  if (process.env['BASE_URL']) console.log(`  BASE_URL      : ${process.env['BASE_URL']}`);
}

// ─── Suite generator ──────────────────────────────────────────────────────────

async function generateSuite(
  suite:          SuiteConfig,
  index:          number,
  total:          number,
  llm:            LLMProvider,
  kbService:      KnowledgeBaseService,
  playwrightGen:  PlaywrightGenerator,
  reqGen:         RequirementGenerator,
  config:         PlatformConfig,
  runs:           RunPaths,
  pomGen:         POMGenerator,
  dataGen:        DataFileGenerator,
): Promise<SuiteResult> {

  section(`Suite ${index + 1} of ${total} — ${suite.name}`);
  info("Page",       suite.page);
  info("UI Output",  `${config.uiTestOutputPath}${suite.outputFile}`);
  info("API Output", `${config.apiTestOutputPath}${suite.outputFile.replace('.spec.ts', '_API.spec.ts')}`);

  try {
    // Load knowledge base
    process.stdout.write("  ▸ Loading knowledge base... ");
    const kb = kbService.load(suite.page);
    console.log(`done  (${suite.page})`);

    const className = kbKeyToClassName(suite.page);
    const camelName = className.charAt(0).toLowerCase() + className.slice(1);
    const pomFile   = path.join(config.pageOutputPath, `${camelName}.page.ts`);
    const dataFile  = path.join(config.dataOutputPath, `${camelName}Data.json`);

    // Auto-generate POM if not yet present
    if (!fs.existsSync(pomFile)) {
      fs.mkdirSync(config.pageOutputPath, { recursive: true });
      fs.mkdirSync(config.dataOutputPath,  { recursive: true });

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
        }
      } catch (pomErr) {
        const msg = pomErr instanceof Error ? pomErr.message : String(pomErr);
        console.log(`failed (${msg}) — continuing without POM`);
      }
    }

    // Resolve requirement
    let requirement = suite.requirement?.trim() ?? "";
    if (!requirement) {
      process.stdout.write("  ▸ Generating requirement from KB... ");
      requirement = await reqGen.generate(kb);
      console.log("done");
      console.log(`\n  Requirement (AI-generated):\n  "${requirement.slice(0, 200)}${requirement.length > 200 ? "..." : ""}"\n`);
    } else {
      console.log(`\n  Requirement (manual):\n  "${requirement}"\n`);
    }

    // Test cases
    process.stdout.write("  ▸ Generating test cases (KB-aware)... ");
    const testCases = await new TestCaseGenerator(llm).generate(requirement, kb);
    console.log(`done  (${testCases.length} cases)`);
    testCases.forEach(tc => console.log(`       [${tc.id}] ${tc.title}`));

    // Test data (for reference / KB enrichment — not imported in spec)
    process.stdout.write("\n  ▸ Generating test data... ");
    const testData = await new TestDataGenerator(llm).generate(requirement, kb);
    console.log("done");

    // Attach pageKey for PlaywrightGenerator
    (kb as any).pageKey = suite.page;

    // UI spec
    process.stdout.write("\n  ▸ Generating UI Playwright spec... ");
    const uiScript = await playwrightGen.generate(testCases, kb);
    console.log("done");

    fs.mkdirSync(config.uiTestOutputPath,  { recursive: true });
    const uiSpecPath = path.join(config.uiTestOutputPath, suite.outputFile);
    fs.writeFileSync(uiSpecPath, uiScript, "utf-8");
    tick(`UI spec → ${uiSpecPath}  (${uiScript.split("\n").length} lines)`);

    // API spec
    process.stdout.write("  ▸ Generating API Playwright spec... ");
    const apiScript = await playwrightGen.generateApiSpec(testCases, kb);
    console.log("done");

    fs.mkdirSync(config.apiTestOutputPath, { recursive: true });
    const apiOutputFile = suite.outputFile.replace(/\.spec\.ts$/, '_API.spec.ts');
    const apiSpecPath   = path.join(config.apiTestOutputPath, apiOutputFile);
    fs.writeFileSync(apiSpecPath, apiScript, "utf-8");
    tick(`API spec → ${apiSpecPath}  (${apiScript.split("\n").length} lines)`);

    // Archive copies
    const uiCopy = path.join(runs.generatedScripts, suite.outputFile);
    fs.copyFileSync(uiSpecPath, uiCopy);
    const apiCopy = path.join(runs.generatedScripts, apiOutputFile);
    fs.copyFileSync(apiSpecPath, apiCopy);

    // JSON report
    const baseName   = suite.outputFile.replace(/\.spec\.ts$/, "");
    const jsonReport = path.join(runs.generatedCases, `${baseName}-test-cases.json`);
    fs.writeFileSync(jsonReport, JSON.stringify({
      suite:       suite.name,
      page:        suite.page,
      requirement,
      generatedAt: new Date().toISOString(),
      totalCases:  testCases.length,
      testCases,
    }, null, 2));
    tick(`Report  → ${jsonReport}`);

    return { suite: suite.name, uiFile: uiSpecPath, apiFile: apiSpecPath, status: "ok", requirement, testCases };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    cross(`Failed — ${message}`);
    return {
      suite:   suite.name,
      uiFile:  suite.outputFile,
      apiFile: suite.outputFile.replace('.spec.ts', '_API.spec.ts'),
      status:  "failed",
      error:   message,
    };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {

  ensureScaffoldFiles();

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

  // Validate output paths stay inside project
  for (const p of [config.uiTestOutputPath, config.apiTestOutputPath]) {
    if (!path.resolve(p).startsWith(path.resolve(process.cwd()))) {
      console.error(`\n  ERROR: output path "${p}" is outside the project directory.`);
      process.exit(1);
    }
  }

  loadEnvironment(config);

  const runs = createRunContext();

  banner(`${config.projectName} — Generating All Test Suites`);
  console.log(`\n  Run ID        : ${runs.runId}`);
  console.log(`  Reports dir   : ${runs.root}`);
  console.log(`\n  Found ${config.suites.length} suite(s) in ${configPath}:`);
  config.suites.forEach((s, i) => {
    const reqLabel = s.requirement ? "manual" : "AI-generated";
    console.log(`    ${i + 1}. ${s.name}  [requirement: ${reqLabel}]`);
    console.log(`         UI  → ${config.uiTestOutputPath}${s.outputFile}`);
    console.log(`         API → ${config.apiTestOutputPath}${s.outputFile.replace('.spec.ts', '_API.spec.ts')}`);
  });
  console.log(`\n  Concurrency : ${CONCURRENCY}`);

  const llm          = ProviderFactory.create(process.env['MODEL']?.trim() || config.llmModel);
  const kbService    = new KnowledgeBaseService();
  const reqGen       = new RequirementGenerator(llm);
  const pomGen       = new POMGenerator(llm);
  const dataGen      = new DataFileGenerator(llm);
  const playwrightGen = new PlaywrightGenerator();

  const results: SuiteResult[] = [];

  for (let i = 0; i < config.suites.length; i += CONCURRENCY) {
    const chunk = config.suites.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((suite, j) =>
        generateSuite(
          suite, i + j, config.suites.length,
          llm, kbService, playwrightGen, reqGen,
          config, runs,
          pomGen, dataGen
        )
      )
    );
    results.push(...chunkResults);
  }

  // Summary
  banner("Generation Complete — Summary");

  const passed = results.filter(r => r.status === "ok");
  const failed = results.filter(r => r.status === "failed");

  console.log(`\n  ${passed.length} succeeded   ${failed.length} failed\n`);
  results.forEach(r => {
    if (r.status === "ok") {
      tick(`${r.suite.padEnd(28)}  →  UI: ${r.uiFile}`);
      tick(`${''.padEnd(28)}      API: ${r.apiFile}`);
    } else {
      cross(`${r.suite.padEnd(28)}  →  ${r.error}`);
    }
  });

  if (passed.length > 0) {
    console.log(`\n  Run UI tests:   npm run test:ui`);
    console.log(`  Run API tests:  npm run test:api`);
    console.log(`  Run all:        npm run test:run`);
    console.log(`  Reports folder: open ${runs.root}\n`);
  }

  if (failed.length > 0) process.exit(1);
}

main().catch(err => {
  console.error("\n  Unexpected error:", err.message);
  process.exit(1);
});
