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

// ─── Scaffold bootstrapper ────────────────────────────────────────────────────
// Ensures support/ folder structure exists before any generation runs.
// Safe to call on every run — skips files that already exist.

function ensureScaffoldFiles(): void {
  const dirs = [
    "support/fixtures",
    "support/helper",
    "support/pages",
    "support/data",
    "support/utils",
    "tests/UI",
    "tests/API",
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  const scaffolds: Record<string, string> = {
    "support/utils/constants.ts": `export const DESKTOP_VIEW_PORT = { width: 1280, height: 800 };
export const MOBILE_VIEW_PORT  = { width: 375,  height: 667 };
`,
    "support/fixtures/visitFixture.ts": `import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import { DESKTOP_VIEW_PORT, MOBILE_VIEW_PORT } from '../utils/constants.js';

type TestFixture = { page: Page };

const baseURL = process.env['BASE_URL'] ?? '';
if (!baseURL) {
    console.warn('WARNING: BASE_URL is not set. Check your .env or config/environments/*.env');
}

async function setupPage(browser: any, viewportSize: { width: number; height: number }) {
    const context = await browser.newContext();
    const page    = await context.newPage();
    await page.setViewportSize(viewportSize);
    if (baseURL) { await page.goto(baseURL); await page.waitForLoadState('load'); }
    return { page, context };
}

export const testDesktop = base.extend<TestFixture>({
    page: async ({ browser }, use) => { const { page } = await setupPage(browser, DESKTOP_VIEW_PORT); await use(page); },
});

export const testMobile = base.extend<TestFixture>({
    page: async ({ browser }, use) => { const { page } = await setupPage(browser, MOBILE_VIEW_PORT); await use(page); },
});
`,
    "support/helper/interceptHelper.ts": `import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export function getUserCredentials(): { email: string; password: string } {
    const env      = process.env['ENVIRONMENT'] || 'qa';
    const email    = process.env[\`\${env.toUpperCase()}_USER_EMAIL\`] || '';
    const password = process.env[\`\${env.toUpperCase()}_USER_PASS\`]  || '';
    if (!email || !password) throw new Error(\`Missing credentials for environment: \${env}\`);
    return { email, password };
}

export async function verifyPageTitle(page: Page, expectedTitle: string): Promise<void> {
    const pageTitle = page.locator('#root h1');
    await pageTitle.waitFor({ state: 'visible' });
    await expect(pageTitle).toContainText(expectedTitle);
}

export async function waitForSelector(page: Page, selector: string, timeout = 30000): Promise<void> {
    try { await page.waitForSelector(selector, { timeout }); }
    catch (error) { console.error(\`Error waiting for selector: \${error}\`); }
}
`,
    "support/helper/apiHelper.ts": `const ENV = process.env['ENVIRONMENT'] || 'qa';

export function getApiConfig() {
    const baseURL = process.env['API_BASE_URL'] || '';
    return { baseURL, loginURL: \`\${baseURL}/log-in\` };
}

export function getUserCredentials(): { email: string; password: string } {
    const email    = process.env[\`\${ENV.toUpperCase()}_USER_EMAIL\`] || '';
    const password = process.env[\`\${ENV.toUpperCase()}_USER_PASS\`]  || '';
    if (!email || !password) throw new Error(\`Missing credentials for environment: \${ENV}\`);
    return { email, password };
}

export function getEnvironment(): string { return ENV; }
`,
    "support/helper/fileReader.ts": `import fs from 'fs';
import path from 'path';

export function readJson(fileName: string) {
    const filePath = path.join('support', 'data', \`\${fileName}.json\`);
    if (!fs.existsSync(filePath)) throw new Error(\`JSON file not found: \${filePath}\`);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function loadCSV(filePath: string): string[] {
    return fs.readFileSync(filePath, 'utf-8')
        .split(/\\r?\\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}
`,
    "support/helper/commonPattern.ts": `import type { Page } from '@playwright/test';

export default class CorePattern {
    constructor(private readonly page: Page) {}

    async clickUserMenu(menuName: string): Promise<void> {
        const userDropdown = this.page.locator("[class^='index-module_userDropdown']");
        await userDropdown.waitFor({ state: 'visible' });
        await userDropdown.click();
        await this.page.getByText(menuName, { exact: true }).click();
        console.info(\`Navigated to "\${menuName}" via user menu.\`);
    }

    async clickHamburgerMenu(menuName: string): Promise<void> {
        const menuButton = this.page.locator("[class^='index-module_mobileNavMenu'] button");
        await menuButton.click();
        await this.page.getByText(menuName, { exact: true }).click();
        console.info(\`Navigated to "\${menuName}" via hamburger menu.\`);
    }
}
`,
    "support/pages/example.page.ts": `import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export default class ExamplePage {
    private readonly page: Page;
    private readonly exampleElement: Locator;

    constructor(page: Page) {
        this.page = page;
        this.exampleElement = this.page.locator('#example').first();
    }

    async verifyPageLoaded(): Promise<void> {
        await expect(this.exampleElement).toBeVisible();
        console.info('Verified example page loaded.');
    }
}
`,
    "support/data/exampleData.json": `{
  "exampleValue": "example"
}
`,
  };

  let created = 0;
  for (const [filePath, content] of Object.entries(scaffolds)) {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf-8");
      created++;
    }
  }
  if (created > 0) {
    console.log(`  Scaffold      : created ${created} support file(s)`);
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

  const kbFiles = fs.existsSync("pipeline/kb/pages")
    ? fs.readdirSync("pipeline/kb/pages").filter(f => f.endsWith(".json"))
    : [];

  if (kbFiles.length === 0) {
    warn("No KB JSON files found in pipeline/kb/pages/.");
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

  ensureScaffoldFiles();

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
    `tsx scripts/generate-from-excel.ts`,
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
    console.log(`\n  Generated specs are in tests/UI/`);
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
