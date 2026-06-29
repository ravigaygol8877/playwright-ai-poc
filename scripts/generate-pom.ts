/**
 * generate-pom.ts
 *
 * Standalone script: generates POM + data file for all KB pages
 * that do not yet have a corresponding support/pages/*.page.ts file.
 *
 * Usage:
 *   npm run generate:pom
 *   npm run generate:pom -- --page parabank-login
 */

import "dotenv/config";
import fs from "fs";
import path from "path";

import { ProviderFactory }     from "../pipeline/providers/ProviderFactory.js";
import { KnowledgeBaseService } from "../pipeline/kb/KnowledgeBaseService.js";
import { POMGenerator, kbKeyToClassName } from "../pipeline/generators/pom/POMGenerator.js";
import { DataFileGenerator }   from "../pipeline/generators/pom/DataFileGenerator.js";

const PAGES_DIR = "support/pages";
const DATA_DIR  = "support/data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tick(msg: string)  { console.log(`  ✅  ${msg}`); }
function skip(msg: string)  { console.log(`  ⏭   ${msg}`); }
function cross(msg: string) { console.log(`  ❌  ${msg}`); }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {

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

    if (fs.existsSync(pomFile)) {
      skip(`POM already exists: ${pomFile}`);
      continue;
    }

    try {
      const kb = kbService.load(kbKey);

      process.stdout.write("  ▸ Generating POM... ");
      const pomResult = await pomGen.generate(kb, kbKey);
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
