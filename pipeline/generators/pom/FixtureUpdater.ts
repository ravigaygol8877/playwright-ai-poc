/**
 * FixtureUpdater — registers a new POM class into tests/fixtures/base.ts.
 *
 * Reads the existing fixture file, checks if the class is already registered,
 * and if not, appends the import + interface property + fixture entry.
 * All changes are pure string manipulation — no AST parsing required.
 */

import fs from 'fs';

export interface FixtureEntry {
  className:     string;
  fileName:      string;
  fixtureKey:    string;
  dataInterface: string;
  dataVarName:   string;
  dataFileName:  string;
}

export class FixtureUpdater {

  update(fixturesPath: string, entry: FixtureEntry): boolean {
    if (!fs.existsSync(fixturesPath)) {
      console.warn(`  ⚠  fixtures file not found: ${fixturesPath}`);
      return false;
    }

    const content = fs.readFileSync(fixturesPath, 'utf-8');

    // Skip if class already imported (idempotent)
    if (content.includes(`import { ${entry.className} }`)) {
      return false;
    }

    const updated = this.inject(content, entry);
    fs.writeFileSync(fixturesPath, updated, 'utf-8');
    return true;
  }

  private inject(content: string, entry: FixtureEntry): string {
    let result = content;

    // 1. Add POM import after the last existing POM import line
    const pomImportLine =
      `import { ${entry.className} } from '../pages/${entry.fileName.replace('.ts', '.js')}';`;
    result = this.insertAfterLastMatch(
      result,
      /^import \{ \w+Page \} from '\.\.\/pages\//m,
      pomImportLine,
    );

    // 2. Add data value import after the last existing data import line
    const dataVarExport = entry.dataVarName;
    const dataImportLine =
      `import { ${dataVarExport} } from '../data/${entry.dataFileName.replace('.ts', '.js')}';`;
    const dataTypeImportLine =
      `import type { ${entry.dataInterface} } from '../data/${entry.dataFileName.replace('.ts', '.js')}';`;
    result = this.insertAfterLastMatch(
      result,
      /^import \{ \w+(?:TestData|Data) \} from '\.\.\/data\//m,
      dataImportLine,
    );
    result = this.insertAfterLastMatch(
      result,
      /^import type \{ \w+(?:TestData|Data) \} from '\.\.\/data\//m,
      dataTypeImportLine,
    );

    // 3. Add fixture key to PageFixtures interface
    const pageFixtureProp = `  ${entry.fixtureKey}: ${entry.className};`;
    result = this.insertAfterLastMatch(
      result,
      /^\s+\w+Page:\s+\w+Page;/m,
      pageFixtureProp,
    );

    // 4. Add data fixture key to DataFixtures interface
    const dataFixtureProp = `  ${entry.fixtureKey}Data: ${entry.dataInterface};`;
    result = this.insertAfterLastMatch(
      result,
      /^\s+\w+(?:Data|TestData):\s+\w+(?:TestData|Data);/m,
      dataFixtureProp,
    );

    // 5. Add page fixture impl before the last data fixture impl line
    const fixtureImpl = `
  ${entry.fixtureKey}: async ({ page }, use) => {
    await use(new ${entry.className}(page));
  },`;
    result = this.insertBeforeLastMatch(result, /^  \w+Data: async/, fixtureImpl);

    // 6. Add data fixture impl before the testFixtures-end sentinel
    // The sentinel `}); // testFixtures-end` is unique to the shared fixture block,
    // so this correctly targets only that block (not testDesktop or testMobile).
    const dataFixtureImpl = `
  ${entry.fixtureKey}Data: async ({}, use) => {
    await use(${dataVarExport});
  },`;
    result = this.insertBeforeLastMatch(result, /^\}\); \/\/ testFixtures-end$/, dataFixtureImpl);

    return result;
  }

  private insertAfterLastMatch(content: string, pattern: RegExp, line: string): string {
    const lines  = content.split('\n');
    let lastIdx  = -1;

    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i] ?? '')) lastIdx = i;
    }

    if (lastIdx === -1) {
      throw new Error(
        `FixtureUpdater: anchor pattern not found: ${pattern}\n` +
        `Ensure tests/fixtures/base.ts has been seeded with the expected scaffold.`
      );
    }

    lines.splice(lastIdx + 1, 0, line);
    return lines.join('\n');
  }

  private insertBeforeLastMatch(content: string, pattern: RegExp, block: string): string {
    const lines  = content.split('\n');
    let lastIdx  = -1;

    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i] ?? '')) lastIdx = i;
    }

    if (lastIdx === -1) return content;

    lines.splice(lastIdx, 0, block);
    return lines.join('\n');
  }
}

// ─── Derive fixture key from class name ────────────────────────────────────────

export function classNameToFixtureKey(className: string): string {
  // "DrugSearchPage" → "drugSearchPage"
  return className.charAt(0).toLowerCase() + className.slice(1);
}
