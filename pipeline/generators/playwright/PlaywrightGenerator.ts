import type { TestCase }
  from "../../models/TestCase.js";

import type { TestData }
  from "../../models/TestData.js";

import type { KnowledgeBase }
  from "../../models/KnowledgeBase.js";

import { AIActionModelGenerator }
  from "../action-model/AIActionModelGenerator.js";

import { RuleBasedActionModelGenerator }
  from "../action-model/RuleBasedActionModelGenerator.js";

import { PlaywrightRenderer }
  from "./PlaywrightRenderer.js";

import { AssertionGenerator }
  from "../assertions/AssertionGenerator.js";

import { pMap }
  from "../../utils/concurrency.js";

import { SelectorRetriever }
  from "../../kb/SelectorRetriever.js";

export interface PomOptions {
  fixtureKey:         string;  // e.g. "aeHomePage" (legacy fixture param name)
  fixtureImportPath:  string;  // e.g. "../../support/fixtures/base.js"
  testDataImportPath: string;  // e.g. "./ae-home.data.js"
  pageClassName?:     string;  // e.g. "AeHomePage" — triggers testDesktop + POM class template
  pageImportPath?:    string;  // e.g. "../../support/pages/AeHomePage.js"
  methodRegistry?:    Record<string, { click?: string; fill?: string }>;
  noPageClass?:       boolean; // use testDesktop from fixtures without a POM class import
}

/**
 * Compiles a complete `.spec.ts` file from an array of test cases.
 *
 * When `PomOptions.pageClassName` is provided the output uses the reference-repo
 * pattern: `testDesktop` fixture, module-level `let homePage`, POM created in
 * `beforeEach`, and `console.info` listener.
 *
 * Without `pageClassName` the legacy named-fixture pattern is used.
 */
export class PlaywrightGenerator {
  private ruleBasedClassifier: RuleBasedActionModelGenerator;
  private readonly retriever = new SelectorRetriever();

  constructor(
    private actionModelGenerator: AIActionModelGenerator,
    private renderer: PlaywrightRenderer,
    private assertionGenerator: AssertionGenerator,
    private concurrency = 8,
  ) {
    this.ruleBasedClassifier = new RuleBasedActionModelGenerator(actionModelGenerator);
  }

  /**
   * Generate a complete Playwright spec file as a string.
   *
   * @param testCases     - Array of structured test cases to render.
   * @param testData      - Test input data written to a sidecar file.
   * @param knowledgeBase - Page KB supplying URL, selectors, and describe name.
   * @param pomOptions    - When provided, uses POM-based spec template.
   */
  async generate(
    testCases: TestCase[],
    testData: TestData,
    knowledgeBase: KnowledgeBase,
    pomOptions?: PomOptions,
  ): Promise<string> {

    const pageUrl      = new URL(knowledgeBase.url);
    const pagePath     = pageUrl.pathname;
    const describeName = knowledgeBase.describeName ?? knowledgeBase.pageName;
    const prefixLines  = knowledgeBase.beforeEachPrefix ?? [];
    const skipGoto     = knowledgeBase.skipGoto ?? false;

    const testBlocks = await pMap(
      testCases,
      tc => this.generateTestBlock(tc, knowledgeBase, pomOptions),
      this.concurrency,
    );

    if (pomOptions?.pageClassName) {
      // ── New pattern: testDesktop, module-level let, POM in beforeEach ─────────
      if (!pomOptions.pageImportPath) {
        throw new Error(
          `PlaywrightGenerator: pageImportPath is required when pageClassName is set (className: ${pomOptions.pageClassName})`
        );
      }
      const varName = this.toVarName(pomOptions.pageClassName);
      return `import { testDesktop } from '${pomOptions.fixtureImportPath}';
import { ${pomOptions.pageClassName} } from '${pomOptions.pageImportPath}';
import { testData } from '${pomOptions.testDataImportPath}';

let ${varName}: ${pomOptions.pageClassName};

testDesktop.describe('${describeName}', () => {
  testDesktop.beforeEach(async ({ page }) => {
    ${varName} = new ${pomOptions.pageClassName}(page);
    page.on('console', (msg) => console.info(\`[\${msg.type()}] \${msg.text()}\`));
  });

${testBlocks.join("\n\n")}
});
`;
    }

    if (pomOptions?.noPageClass) {
      // ── testDesktop fixture, sidecar data import, no POM class ───────────────
      const beforeEachLines = prefixLines.map(l => `    ${l}`);
      if (!skipGoto) {
        beforeEachLines.push(`    await page.goto('${pagePath}');`);
      }
      const beforeEachBody = beforeEachLines.join("\n");

      return `import { testDesktop } from '${pomOptions.fixtureImportPath}';
import { testData } from '${pomOptions.testDataImportPath}';

testDesktop.describe('${describeName}', () => {
  testDesktop.beforeEach(async ({ page }) => {
${beforeEachBody}
  });

${testBlocks.join("\n\n")}
});
`;
    }

    if (pomOptions) {
      // ── Legacy named-fixture pattern ──────────────────────────────────────────
      const beforeEachLines = prefixLines.map(l => `    ${l}`);
      if (!skipGoto) {
        beforeEachLines.push(`    await page.goto('${pagePath}');`);
      }
      const beforeEachBody = beforeEachLines.join("\n");

      return `import { test, expect } from '${pomOptions.fixtureImportPath}';
import { testData } from '${pomOptions.testDataImportPath}';

test.describe('${describeName}', () => {
  test.beforeEach(async ({ page }) => {
${beforeEachBody}
  });

${testBlocks.join("\n\n")}
});
`;
    }

    // ── No POM — self-contained spec ──────────────────────────────────────────
    const beforeEachLines = prefixLines.map(l => `    ${l}`);
    if (!skipGoto) {
      beforeEachLines.push(`    await page.goto('${pagePath}');`);
    }
    const beforeEachBody = beforeEachLines.join("\n");

    return `import { test, expect } from '@playwright/test';

const testData = ${JSON.stringify(testData, null, 2)};

test.describe('${describeName}', () => {
  test.beforeEach(async ({ page }) => {
${beforeEachBody}
  });

${testBlocks.join("\n\n")}
});
`;
  }

  private toVarName(className: string): string {
    return className.charAt(0).toLowerCase() + className.slice(1);
  }

  private escSingle(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  private escDouble(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private async generateTestBlock(
    testCase: TestCase,
    knowledgeBase: KnowledgeBase,
    pomOptions?: PomOptions,
  ): Promise<string> {
    // Derive a focused target list from this test case's content
    const query          = [testCase.title, ...testCase.steps, testCase.expectedResult].join(' ');
    const retrieved      = this.retriever.retrieve(query, knowledgeBase, 10);
    const availableTargets = Object.keys(retrieved.selectors);

    const renderResults = await pMap(
      testCase.steps,
      step => this.ruleBasedClassifier.generate(step, availableTargets).then(
        actionModel => ({
          action: actionModel.action,
          code:   this.renderer.renderAction(actionModel, knowledgeBase, pomOptions?.fixtureKey, pomOptions),
        }),
      ),
      this.concurrency,
    );

    const actions = renderResults
      .filter(r => r.action !== "goto")
      .map(r => r.code)
      .filter(code => code.trim() !== "");

    const assertion = await this.assertionGenerator.generateAssertion(
      testCase.expectedResult,
      knowledgeBase,
    );

    const indentedActions = actions
      .map(a => a.trim().split("\n").map(l => `    ${l}`).join("\n"))
      .join("\n");

    const indentedAssertion = assertion
      .trim()
      .split("\n")
      .map(l => `    ${l}`)
      .join("\n");

    if (pomOptions?.pageClassName || pomOptions?.noPageClass) {
      // testDesktop pattern: POM is module-level variable (pageClassName) or raw page (noPageClass)
      return `  testDesktop(
    '${this.escSingle(testCase.title)} @regression',
    async ({ page }) => {
${indentedActions}
${indentedAssertion}
    },
  );`;
    }

    const testArgs = pomOptions ? `{ page, ${pomOptions.fixtureKey} }` : `{ page }`;

    return `  test("${this.escDouble(testCase.title)} @regression", async (${testArgs}) => {
${indentedActions}
${indentedAssertion}
  });`;
  }
}
