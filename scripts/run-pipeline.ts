/**
 * run-pipeline.ts  —  npm run ai:run
 *
 * The single command that drives the entire AI-powered test platform:
 *
 *   Step 1  Read requirements.xlsx  →  parse all requirements
 *   Step 2  Auto-generate missing POMs  (KB JSON → TypeScript page objects)
 *   Step 3  AI expands blank Test Cases  (RequirementExpander)
 *   Step 4  Generate Playwright .spec.ts files
 *   Step 5  Execute tests with Playwright
 *   Step 6  Generate Allure report
 *   Step 7  Open Allure report in browser
 *   Step 8  Print AI analysis summary (coverage, flaky, regression)
 *
 * Environment:
 *   ENVIRONMENT=qa|uat|production|development  (default: development)
 *   SKIP_TESTS=true                           (generate only, no execution)
 *   SKIP_REPORT=true                          (skip Allure report generation)
 *   EXCEL_FILE=path/to/requirements.xlsx      (default: requirements/requirements.xlsx)
 *
 * Usage:
 *   npm run ai:run
 *   npm run ai:run:qa
 *   SKIP_TESTS=true npm run ai:run            ← generate only
 */

import "dotenv/config";
import { execSync, spawnSync } from "child_process";
import fs   from "fs";
import path from "path";

// Load environment-specific overrides
const env     = process.env["ENVIRONMENT"] ?? "development";
const envFile = path.join("config", "environments", `${env}.env`);
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const EXCEL_FILE   = process.env["EXCEL_FILE"]   ?? "requirements/requirements.xlsx";
const SKIP_TESTS   = process.env["SKIP_TESTS"]   === "true";
const SKIP_REPORT  = process.env["SKIP_REPORT"]  === "true";
const ENVIRONMENT  = process.env["ENVIRONMENT"]  ?? "development";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEP  = "═".repeat(62);
const SEP2 = "─".repeat(62);

function banner(msg: string)  { console.log(`\n${SEP}\n  ${msg}\n${SEP}`); }
function section(msg: string) { console.log(`\n${SEP2}\n  ${msg}\n${SEP2}`); }
function tick(msg: string)    { console.log(`  ✅  ${msg}`); }
function warn(msg: string)    { console.log(`  ⚠️   ${msg}`); }
function info(k: string, v: string) { console.log(`       ${k.padEnd(22)}: ${v}`); }

function run(cmd: string, label: string): boolean {
  console.log(`\n  ▸ ${label}`);
  const result = spawnSync(cmd, { shell: true, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\n  ❌  ${label} failed (exit ${result.status})`);
    return false;
  }
  tick(label);
  return true;
}

function tryRun(cmd: string, label: string): boolean {
  console.log(`\n  ▸ ${label}`);
  const result = spawnSync(cmd, { shell: true, stdio: "inherit" });
  if (result.status !== 0) {
    warn(`${label} failed — continuing`);
    return false;
  }
  tick(label);
  return true;
}

// ─── Env var validation ───────────────────────────────────────────────────────

const VALID_PROVIDERS = ["gemini", "github-models", "openrouter", "lm-studio", "fallback"];

function validateEnv(): void {
  const provider = (process.env["LLM_PROVIDER"] ?? "gemini").toLowerCase().trim();

  if (!VALID_PROVIDERS.includes(provider)) {
    console.error(`\n  ERROR: Unknown LLM_PROVIDER="${provider}"`);
    console.error(`  Valid values: ${VALID_PROVIDERS.join(", ")}`);
    console.error(`  Set it in .env or export LLM_PROVIDER=<value>\n`);
    process.exit(1);
  }

  const required: Record<string, string> = {
    gemini:          "GOOGLE_API_KEY",
    "github-models": "GITHUB_TOKEN",
    openrouter:      "OPENROUTER_API_KEY",
  };

  const requiredKey = required[provider];
  if (requiredKey && !process.env[requiredKey]?.trim()) {
    console.error(`\n  ERROR: ${requiredKey} is required for LLM_PROVIDER="${provider}"`);
    console.error(`  Add it to your .env file — see .env.example for reference\n`);
    process.exit(1);
  }

  if (provider === "fallback") {
    const chain = (process.env["FALLBACK_CHAIN"] ?? "gemini,github-models,openrouter,lm-studio")
      .split(",").map(s => s.trim());
    const hasAnyKey =
      (chain.includes("gemini")          && !!process.env["GOOGLE_API_KEY"]?.trim()) ||
      (chain.includes("github-models")   && !!process.env["GITHUB_TOKEN"]?.trim())  ||
      (chain.includes("openrouter")      && !!process.env["OPENROUTER_API_KEY"]?.trim()) ||
      (chain.includes("lm-studio"));
    if (!hasAnyKey) {
      console.error("\n  ERROR: LLM_PROVIDER=fallback but no provider credentials are set.");
      console.error("  Set at least one of: GOOGLE_API_KEY, GITHUB_TOKEN, OPENROUTER_API_KEY\n");
      process.exit(1);
    }
  }
}

// ─── Pre-flight checks ────────────────────────────────────────────────────────

function preflight(): void {
  section("Pre-flight Checks");

  validateEnv();

  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`\n  ERROR: Requirements file not found: ${EXCEL_FILE}`);
    console.error(`  Create one with: npm run requirements:template\n`);
    process.exit(1);
  }
  tick(`Requirements file found: ${EXCEL_FILE}`);

  const kbFiles = fs.existsSync("knowledge-base")
    ? fs.readdirSync("knowledge-base").filter(f => f.endsWith(".json"))
    : [];

  if (kbFiles.length === 0) {
    warn("No knowledge-base JSON files found.");
    warn("Run: npm run kb:generate <url> <page-name>  to generate one first.");
    warn("The pipeline will attempt to proceed but POM generation may be skipped.");
  } else {
    tick(`Knowledge base: ${kbFiles.length} page(s) — ${kbFiles.map(f => f.replace(".json", "")).join(", ")}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  banner("AI Test Intelligence Platform — Full Pipeline");

  info("Environment",    ENVIRONMENT);
  info("Requirements",   EXCEL_FILE);
  info("Skip tests",     SKIP_TESTS  ? "yes" : "no");
  info("Skip report",    SKIP_REPORT ? "yes" : "no");

  // ── Pre-flight ───────────────────────────────────────────────────────────
  preflight();

  // ── Step 1–4: Generate from Excel ────────────────────────────────────────
  section("Steps 1–4 — AI Generation Pipeline");

  const genCmd = [
    `ENVIRONMENT=${ENVIRONMENT}`,
    `tsx ai/src/generate-from-excel.ts`,
    `--file "${EXCEL_FILE}"`,
  ].join(" ");

  const genOk = run(genCmd, "Generate from Excel (requirements → POMs → test cases → specs)");
  if (!genOk) {
    console.error("\n  Generation failed. Fix errors above and re-run.\n");
    process.exit(1);
  }

  if (SKIP_TESTS) {
    banner("Generation Complete — Tests Skipped");
    info("Duration", `${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log(`\n  Generated specs are in tests/e2e/`);
    console.log(`  Run tests manually with: npm test\n`);
    return;
  }

  // ── Step 5: Execute Playwright tests ─────────────────────────────────────
  section("Step 5 — Playwright Test Execution");

  const testCmd = ENVIRONMENT !== "development"
    ? `ENVIRONMENT=${ENVIRONMENT} dotenv -e ${envFile} -- playwright test --project=chromium`
    : `playwright test --project=chromium`;

  const testsOk = tryRun(testCmd, "Playwright test execution");

  // ── Step 6: Generate Allure report ───────────────────────────────────────
  if (!SKIP_REPORT) {
    section("Step 6 — Allure Report Generation");

    const allureResultsDir = "reports/latest/allure/results";
    if (fs.existsSync(allureResultsDir) && fs.readdirSync(allureResultsDir).length > 0) {
      tryRun(
        "allure generate reports/latest/allure/results --output reports/latest/allure/report --clean",
        "Generate Allure HTML report",
      );
    } else {
      warn("No Allure results found — skipping report generation");
    }
  }

  // ── Final summary ─────────────────────────────────────────────────────────
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  banner(testsOk ? "Pipeline Complete ✅" : "Pipeline Complete — Some Tests Failed ⚠️");

  console.log(`\n  Duration         : ${duration}s`);
  console.log(`  Environment      : ${ENVIRONMENT}`);
  console.log(`  Requirements     : ${EXCEL_FILE}\n`);

  console.log(`  Reports:`);
  console.log(`    Playwright   → npm run report:latest`);
  console.log(`    Allure       → npm run allure:serve`);
  console.log(`    All files    → open reports/latest/\n`);

  if (!testsOk) {
    console.log(`  Some tests failed. Check:`);
    console.log(`    npm run report:latest   ← view Playwright report`);
    console.log(`    npm run allure:serve    ← view Allure report\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("\n  Unexpected error:", (err as Error).message);
  process.exit(1);
});
