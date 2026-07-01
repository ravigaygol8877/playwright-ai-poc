/**
 * generate-pom.ts
 *
 * Standalone script: generates POM + data file for all KB pages
 * that do not yet have a corresponding support/pages/*.page.ts file.
 *
 * Usage:
 *   npm run generate:pom                                   ← generate missing POMs
 *   npm run generate:pom -- --page parabank-billpay-page   ← one page only
 *   npm run generate:pom -- --force                        ← overwrite all existing POMs
 *   npm run generate:pom -- --force --page parabank-billpay-page  ← overwrite one page
 *
 * When --force is used and a spec file already exists for the page, the script
 * extracts test case titles from the spec so the regenerated POM method names
 * stay aligned with what the spec calls.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { ensureScaffoldFiles } from "./ensureScaffold.js";

import { ProviderFactory }     from "../pipeline/providers/ProviderFactory.js";
import { KnowledgeBaseService } from "../pipeline/kb/KnowledgeBaseService.js";
import { POMGenerator, kbKeyToClassName } from "../pipeline/generators/pom/POMGenerator.js";
import { DataFileGenerator }   from "../pipeline/generators/pom/DataFileGenerator.js";

const PAGES_DIR = "support/pages";
const DATA_DIR  = "support/data";
const SPECS_DIR = "tests/UI";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tick(msg: string)  { console.log(`  ✅  ${msg}`); }
function skip(msg: string)  { console.log(`  ⏭   ${msg}`); }
function cross(msg: string) { console.log(`  ❌  ${msg}`); }

/**
 * When a spec file already exists for the page, extract the test case titles
 * from the describe block so POMGenerator can produce matching method names.
 * Looks for:  'TC_nnn @regression : [Describe] Title here'
 */
function extractTitlesFromSpec(specFile: string): string[] {
  try {
    const content = fs.readFileSync(specFile, "utf-8");
    const regex   = /@regression\s*:\s*\[.*?\]\s*(.*?)'/g;
    const titles: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      const title = m[1]?.trim();
      if (title && !titles.includes(title)) titles.push(title);
    }
    return titles;
  } catch {
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  ensureScaffoldFiles();

  const llm       = ProviderFactory.create();
  const kbService = new KnowledgeBaseService();
  const pomGen    = new POMGenerator(llm);
  const dataGen   = new DataFileGenerator(llm);

  const allKbKeys = fs
    .readdirSync("pipeline/kb/pages")
    .filter(f => f.endsWith(".json") && !f.includes("catalog"))
    .map(f => f.replace(".json", ""));

  const pageArg = process.argv.find(a => a.startsWith("--page="))?.split("=")[1]
                ?? process.argv[process.argv.indexOf("--page") + 1];
  const force   = process.argv.includes("--force");

  const kbKeys = pageArg ? allKbKeys.filter(k => k === pageArg) : allKbKeys;

  if (kbKeys.length === 0) {
    console.error(`\n  ERROR: No KB pages found${pageArg ? ` matching "${pageArg}"` : ""}.`);
    process.exit(1);
  }

  console.log(`\n  POM Generator — processing ${kbKeys.length} KB page(s)\n`);
  fs.mkdirSync(PAGES_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR,   { recursive: true });

  for (const kbKey of kbKeys) {
    const className = kbKeyToClassName(kbKey);
    const camelName = className.charAt(0).toLowerCase() + className.slice(1);
    const pomFile   = path.join(PAGES_DIR, `${camelName}.page.ts`);
    const dataFile  = path.join(DATA_DIR,  `${camelName}Data.json`);

    console.log(`  ─── ${kbKey} → ${className} ───`);

    if (fs.existsSync(pomFile) && !force) {
      skip(`POM already exists: ${pomFile} (use --force to overwrite)`);
      continue;
    }

    try {
      const kb = kbService.load(kbKey);

      // If spec already exists, reuse its test titles so method names stay aligned.
      // Try both the camelCase name and the kebab kbKey (without -page suffix).
      const specNameFromKey = kbKey.replace(/-page$/, '');
      const specFile = [
        path.join(SPECS_DIR, `${camelName}.spec.ts`),
        path.join(SPECS_DIR, `${specNameFromKey}.spec.ts`),
        path.join(SPECS_DIR, `${kbKey}.spec.ts`),
      ].find(f => fs.existsSync(f)) ?? path.join(SPECS_DIR, `${camelName}.spec.ts`);
      const titles   = extractTitlesFromSpec(specFile);
      if (titles.length > 0) {
        console.log(`  ▸ Found ${titles.length} test titles in existing spec — method names locked`);
      }

      process.stdout.write("  ▸ Generating POM... ");
      const pomResult = await pomGen.generate(kb, kbKey, titles.length > 0 ? titles : undefined);
      fs.writeFileSync(pomFile, pomResult.code, "utf-8");
      console.log(`done`);
      tick(`${pomFile}`);

      if (!fs.existsSync(dataFile)) {
        process.stdout.write("  ▸ Generating data file... ");
        const dataResult = await dataGen.generate(kb, kbKey);
        fs.writeFileSync(dataFile, dataResult.code, "utf-8");
        console.log(`done`);
        tick(`${dataFile}`);
      } else {
        skip(`Data file already exists: ${dataFile}`);
      }

    } catch (err) {
      cross(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    console.log();
  }

  console.log("\n  Done. Run `npx tsc --noEmit` to verify generated files compile cleanly.\n");
}

main().catch(err => {
  console.error("\n  Unexpected error:", (err as Error).message);
  process.exit(1);
});
