/**
 * project-reset.ts
 *
 * Resets the framework for a brand-new project.
 *
 * REMOVES (project-generated artifacts):
 *   tests/UI/*.spec.ts               — generated Playwright UI specs
 *   tests/API/*.spec.ts              — generated Playwright API specs
 *   support/pages/*.page.ts          — generated Page Object Model classes
 *   support/helper/loginHelper.ts    — project-specific login helper
 *   support/helper/interceptHelper.ts — project-specific intercept helper
 *   support/helper/commonPattern.ts  — project-specific nav pattern class
 *   pipeline/kb/pages/*.json         — project Knowledge Base + scenario cache files
 *   ai-metadata/artifacts.json       — requirement/KB/POM content hash manifest
 *   reports/                         — all run reports and artefacts
 *   .llm-cache/                      — cached LLM responses (forces fresh AI calls)
 *   .healing-cache/                  — self-healing selector cache
 *   playwright-report/               — stale Playwright HTML reports (if present)
 *   test-results/                    — stale test run artefacts (if present)
 *
 * RESETS (to blank template):
 *   config/platform.json       — project config with empty suites array
 *
 * PRESERVES (framework — never touched):
 *   pipeline/                  — all AI modules, generators, providers
 *   scripts/                   — all pipeline and demo scripts
 *   tests/fixtures/base.ts           — core testDesktop / testMobile fixtures
 *   support/helper/apiHelper.ts      — generic API helper (framework)
 *   support/helper/fileReader.ts     — generic file reader (framework)
 *   support/pages/example.page.ts   — scaffold POM (not generated)
 *   requirements/*.xlsx        — Excel requirements files
 *   .env                       — API keys and environment config
 *   tsconfig.json, package.json, playwright.config.ts, etc.
 *
 * Usage:
 *   npm run project:reset
 */

import "dotenv/config";
import fs   from "fs";
import path from "path";

const SEP  = "═".repeat(58);
const SEP2 = "─".repeat(58);

function banner(msg: string)  { console.log(`\n${SEP}\n  ${msg}\n${SEP}`); }
function section(msg: string) { console.log(`\n${SEP2}\n  ${msg}\n${SEP2}`); }
function removed(f: string)   { console.log(`  🗑   ${f}`); }
function preserved(f: string) { console.log(`  ✅  ${f}`); }
function created(f: string)   { console.log(`  📁  ${f}`); }
function resetted(f: string)  { console.log(`  🔄  ${f}`); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function removeFile(filePath: string): boolean {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath);
    removed(filePath);
    return true;
  }
  return false;
}

function removeDir(dirPath: string): boolean {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    removed(dirPath + "/");
    return true;
  }
  return false;
}

/**
 * Delete files matching one or more extensions from a directory.
 * Files listed in `keepFiles` are skipped.
 */
function removeGlob(dir: string, exts: string[], keepFiles: string[] = []): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const file of fs.readdirSync(dir)) {
    if (!exts.some(ext => file.endsWith(ext))) continue;
    if (keepFiles.includes(file)) continue;
    fs.rmSync(path.join(dir, file));
    removed(path.join(dir, file));
    count++;
  }
  return count;
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
  const keepFile = path.join(dirPath, ".gitkeep");
  if (!fs.existsSync(keepFile)) fs.writeFileSync(keepFile, "");
  created(dirPath + "/");
}

// ─── Reset platform config ────────────────────────────────────────────────────

function resetPlatformConfig(): void {
  const config = {
    projectName:        "My Project",
    defaultEnvironment: "qa",
    llmModel:           "gpt-4.1-mini",
    testOutputPath:     "tests/UI/",
    reportOutputPath:   "reports/",
    suites:             [],
  };
  fs.writeFileSync("config/platform.json", JSON.stringify(config, null, 2) + "\n", "utf-8");
  resetted("config/platform.json");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  banner("Project Reset — AI Test Intelligence Platform");

  let deletedCount = 0;

  // ── 1. Remove generated Playwright specs ──────────────────────────────────
  section("Step 1 — Removing Generated Playwright Specs");
  deletedCount += removeGlob("tests/UI",  [".spec.ts"]);
  deletedCount += removeGlob("tests/API", [".spec.ts"]);

  // ── 2. Remove generated Page Object Models ────────────────────────────────
  section("Step 2 — Removing Generated Page Object Models");
  deletedCount += removeGlob("support/pages", [".page.ts"], ["example.page.ts"]);

  // ── 3. Remove project-specific helper files ───────────────────────────────
  section("Step 3 — Removing Project-Specific Helpers");
  if (removeFile("support/helper/loginHelper.ts"))     deletedCount++;
  if (removeFile("support/helper/interceptHelper.ts")) deletedCount++;
  if (removeFile("support/helper/commonPattern.ts"))   deletedCount++;

  // ── 4. Remove project Knowledge Base files ────────────────────────────────
  section("Step 4 — Removing Project Knowledge-Base Files");
  deletedCount += removeGlob("pipeline/kb/pages", [".json"]);

  // ── 5. Clear artifact manifest (requirement/KB/POM content hashes) ────────
  section("Step 5 — Clearing Artifact Manifest");
  if (removeFile("ai-metadata/artifacts.json")) deletedCount++;

  // ── 6. Remove LLM cache ───────────────────────────────────────────────────
  section("Step 6 — Clearing LLM Response Cache");
  if (removeDir(".llm-cache")) deletedCount++;

  // ── 7. Remove reports and stale artefacts ────────────────────────────────
  section("Step 7 — Removing Reports and Artefacts");
  if (removeDir("reports"))           deletedCount++;
  if (removeDir(".healing-cache"))    deletedCount++;
  if (removeDir("playwright-report")) deletedCount++;
  if (removeDir("test-results"))      deletedCount++;

  // ── 8. Reset config to blank template ────────────────────────────────────
  section("Step 8 — Resetting Config to Blank Template");
  resetPlatformConfig();

  // ── 9. Recreate empty directory structure ────────────────────────────────
  section("Step 9 — Recreating Empty Project Structure");
  ensureDir("tests/UI");
  ensureDir("tests/API");
  ensureDir("support/pages");
  ensureDir("pipeline/kb/pages");
  ensureDir("reports");

  // ── 10. Confirm preserved assets ─────────────────────────────────────────
  section("Step 10 — Preserved (Framework + Requirements)");
  preserved("pipeline/                      (all AI modules and providers)");
  preserved("scripts/                       (all pipeline and demo scripts)");
  preserved("tests/fixtures/base.ts         (testDesktop / testMobile)");
  preserved("support/helper/apiHelper.ts    (generic API helper)");
  preserved("support/helper/fileReader.ts   (generic file reader)");
  preserved("support/pages/example.page.ts (scaffold POM — not generated)");
  preserved("requirements/*.xlsx            (Excel requirements files)");
  preserved(".env                           (API keys)");

  // ── 11. Summary ──────────────────────────────────────────────────────────
  banner("Reset Complete");

  console.log(`\n  ${deletedCount} project artifact(s) removed`);
  console.log(`  Framework components and Excel files preserved\n`);

  console.log(`  Next steps:`);
  console.log(`    1. Update config/platform.json with your project name`);
  console.log(`    2. Generate Knowledge Base:  npm run kb:generate <url> <page-name>`);
  console.log(`    3. Fill requirements Excel:  requirements/<file>.xlsx`);
  console.log(`    4. Run the demo:             npm run demo`);
  console.log(`    5. Run the full pipeline:    npm run ai:run\n`);
}

main().catch(err => {
  console.error("\n  Reset failed:", (err as Error).message);
  process.exit(1);
});
