import fs from "fs";
import path from "path";

/**
 * TestCatalogService
 *
 * Discovers available test suites from two sources, merged together:
 *
 *   1. Auto-discovery  — scans tests/generated/ for .spec.ts files and
 *                        converts filenames to human-readable suite names.
 *                        No manual maintenance required.
 *
 *   2. Manual catalog  — reads knowledge-base/test-catalog.json for any
 *                        suites that exist outside tests/generated/ or that
 *                        you want to name differently.
 *
 * Result is a deduplicated, sorted list of all available test suites.
 */
export class TestCatalogService {

  load(): string[] {
    const suites = new Set<string>();

    // Source 1 — auto-discover from tests/generated/ directory
    const generatedDir = "tests/generated";
    if (fs.existsSync(generatedDir)) {
      fs.readdirSync(generatedDir)
        .filter(f => f.endsWith(".spec.ts"))
        .forEach(filename => {
          // "parabank-login.spec.ts" → "Parabank Login Tests"
          const name = path.basename(filename, ".spec.ts")
            .split("-")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ") + " Tests";
          suites.add(name);
        });
    }

    // Source 2 — manual catalog (optional, for suites not yet generated)
    const catalogPath = "knowledge-base/test-catalog.json";
    if (fs.existsSync(catalogPath)) {
      const content = fs.readFileSync(catalogPath, "utf-8");
      const catalog = JSON.parse(content) as { testSuites: string[] };
      catalog.testSuites.forEach(s => suites.add(s));
    }

    return [...suites].sort();
  }
}
