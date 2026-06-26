/**
 * project-reset.ts
 *
 * Resets the framework for a brand-new project.
 *
 * REMOVES (project-specific artifacts):
 *   - src/pages/*.ts          (generated page objects, keeps BasePage.ts)
 *   - src/data/*.ts           (generated test data files)
 *   - tests/e2e/*.spec.ts     (generated Playwright spec files)
 *   - knowledge-base/*.json   (project KB files, keeps *.ts service files)
 *   - reports/                (all run reports and artefacts)
 *   - playwright-report/      (stale HTML reports)
 *   - test-results/           (stale run artifacts)
 *   - .current-run-id         (run ID linking file)
 *
 * RESETS (framework files to blank templates):
 *   - src/fixtures/index.ts   (empty POM fixture registry)
 *   - platform.config.json    (blank project config)
 *
 * PRESERVES (reusable framework):
 *   - All AI modules (ai/src/)
 *   - Automation layer (automation/src/)
 *   - LLM providers (llm/src/)
 *   - Knowledge base service (knowledge-base/KnowledgeBaseService.ts, etc.)
 *   - Reporting infrastructure (src/reporting/)
 *   - Requirements reader (src/requirements/)
 *   - Base page class (src/pages/BasePage.ts)
 *   - All configuration files
 *   - All scripts
 *
 * RECREATES (empty folder structure):
 *   - src/pages/              (for generated POMs)
 *   - src/data/               (for generated test data)
 *   - tests/e2e/              (for generated specs)
 *   - knowledge-base/         (for new project KB JSONs)
 *   - requirements/           (for requirements.xlsx)
 *   - reports/                (for run reports)
 *
 * Usage:
 *   npm run project:reset
 */

import "dotenv/config";
import fs   from "fs";
import path from "path";

const SEP  = "═".repeat(58);
const SEP2 = "─".repeat(58);

function banner(msg: string)   { console.log(`\n${SEP}\n  ${msg}\n${SEP}`); }
function section(msg: string)  { console.log(`\n${SEP2}\n  ${msg}\n${SEP2}`); }
function removed(f: string)    { console.log(`  🗑   ${f}`); }
function preserved(f: string)  { console.log(`  ✅  ${f}`); }
function created(f: string)    { console.log(`  📁  ${f}`); }
function reset(f: string)      { console.log(`  🔄  ${f}`); }

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
    removed(dirPath + '/');
    return true;
  }
  return false;
}

function removeGlob(dir: string, ext: string, keepFiles: string[] = []): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(ext)) continue;
    if (keepFiles.some(k => file === k || file.endsWith(k))) continue;
    fs.rmSync(path.join(dir, file));
    removed(path.join(dir, file));
    count++;
  }
  return count;
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
  const keepFile = path.join(dirPath, '.gitkeep');
  if (!fs.existsSync(keepFile)) fs.writeFileSync(keepFile, '');
  created(dirPath + '/');
}

// ─── Reset fixtures to empty shell ────────────────────────────────────────────

function resetFixtures(): void {
  const content = `/**
 * fixtures/index.ts
 *
 * Central Playwright fixture registry. Managed automatically by the POM generator.
 * Run \`npm run generate:pom\` or \`npm run generate:from-excel\` to populate.
 */

import { test as base, expect } from '@playwright/test';

interface PageFixtures {
  // generated page fixtures will be added here
}

interface DataFixtures {
  // generated data fixtures will be added here
}

export const test = base.extend<PageFixtures & DataFixtures>({
  // generated fixture implementations will be added here
});

export { expect };
`;
  fs.writeFileSync('src/fixtures/index.ts', content, 'utf-8');
  reset('src/fixtures/index.ts');
}

// ─── Reset platform config ─────────────────────────────────────────────────────

function resetPlatformConfig(): void {
  const config = {
    projectName:        "My Project",
    defaultEnvironment: "qa",
    llmModel:           "gpt-4.1-mini",
    testOutputPath:     "tests/e2e/",
    reportOutputPath:   "reports/",
    suites:             [],
  };
  fs.writeFileSync('platform.config.json', JSON.stringify(config, null, 2) + '\n', 'utf-8');
  reset('platform.config.json');
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  banner("Project Reset — AI Test Intelligence Platform");

  let deletedCount  = 0;
  let preservedCount = 0;

  // ── 1. Remove generated Page Objects (keep BasePage.ts) ──────────────────
  section("Step 1 — Removing Generated Page Objects");
  deletedCount += removeGlob('src/pages', '.ts', ['BasePage.ts']);
  preserved('src/pages/BasePage.ts');
  preservedCount++;

  // ── 2. Remove generated test data files ──────────────────────────────────
  section("Step 2 — Removing Generated Test Data");
  deletedCount += removeGlob('src/data', '.ts');

  // ── 3. Remove generated Playwright spec files ─────────────────────────────
  section("Step 3 — Removing Generated Playwright Specs");
  deletedCount += removeGlob('tests/e2e', '.ts');
  deletedCount += removeGlob('tests/e2e', '.spec.ts');

  // ── 4. Remove project knowledge-base JSON files ───────────────────────────
  section("Step 4 — Removing Project Knowledge-Base Files");
  deletedCount += removeGlob('knowledge-base', '.json');

  // ── 5. Remove all reports ─────────────────────────────────────────────────
  section("Step 5 — Removing Reports and Artefacts");
  if (removeDir('reports'))          deletedCount++;
  if (removeDir('playwright-report')) deletedCount++;
  if (removeDir('test-results'))      deletedCount++;
  if (removeFile('.current-run-id'))  deletedCount++;

  // ── 6. Reset framework files to template state ────────────────────────────
  section("Step 6 — Resetting Framework Files to Template State");
  resetFixtures();
  resetPlatformConfig();

  // ── 7. Recreate empty folder structure ───────────────────────────────────
  section("Step 7 — Recreating Empty Project Structure");
  ensureDir('src/pages');
  ensureDir('src/data');
  ensureDir('tests/e2e');
  ensureDir('knowledge-base');
  ensureDir('requirements');
  ensureDir('reports');

  // ── 8. Summary ────────────────────────────────────────────────────────────
  banner("Reset Complete");

  console.log(`\n  ${deletedCount} project files removed`);
  console.log(`  Framework components preserved\n`);

  console.log(`  Next steps:`);
  console.log(`    1. Update platform.config.json with your project name`);
  console.log(`    2. Update config/environments/*.env with your app URLs`);
  console.log(`    3. Generate knowledge base:  npm run kb:generate <url> <page-name>`);
  console.log(`    4. Fill requirements Excel:  npm run requirements:template`);
  console.log(`    5. Run everything:           npm run ai:run\n`);
}

main().catch(err => {
  console.error("\n  Reset failed:", (err as Error).message);
  process.exit(1);
});
