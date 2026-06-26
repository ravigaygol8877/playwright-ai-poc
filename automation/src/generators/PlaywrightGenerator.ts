import type { TestCase }
  from "../../../ai/src/models/TestCase.js";

import type { TestData }
  from "../../../ai/src/models/TestData.js";

import type { KnowledgeBase }
  from "../../../ai/src/models/KnowledgeBase.js";

import { AIActionModelGenerator }
  from "../../../ai/src/action-model/AIActionModelGenerator.js";

import { RuleBasedActionModelGenerator }
  from "../../../ai/src/action-model/RuleBasedActionModelGenerator.js";

import { PlaywrightRenderer }
  from "../renderers/PlaywrightRenderer.js";

import { AssertionGenerator }
  from "../../../ai/src/assertion-generator/AssertionGenerator.js";

import { pMap }
  from "../../../ai/src/utils/concurrency.js";

export class PlaywrightGenerator {
  private ruleBasedClassifier: RuleBasedActionModelGenerator;

  constructor(
    private actionModelGenerator: AIActionModelGenerator,
    private renderer: PlaywrightRenderer,
    private assertionGenerator: AssertionGenerator,
    private concurrency = 8,
  ) {
    // Rule-based classifier handles ~90% of steps with zero LLM calls.
    // The LLM generator is kept as fallback for unrecognised patterns.
    this.ruleBasedClassifier = new RuleBasedActionModelGenerator(actionModelGenerator);
  }

  async generate(
    testCases: TestCase[],
    testData: TestData,
    knowledgeBase: KnowledgeBase,
  ): Promise<string> {

    const pageUrl          = new URL(knowledgeBase.url);
    const pagePath         = pageUrl.pathname;
    const describeName     = knowledgeBase.describeName ?? knowledgeBase.pageName;
    const prefixLines      = knowledgeBase.beforeEachPrefix ?? [];
    const skipGoto         = knowledgeBase.skipGoto ?? false;
    const availableTargets = Object.keys(knowledgeBase.selectors);

    // Generate all test blocks concurrently
    const testBlocks = await pMap(
      testCases,
      tc => this.generateTestBlock(tc, availableTargets, knowledgeBase),
      this.concurrency,
    );

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

  private async generateTestBlock(
    testCase: TestCase,
    availableTargets: string[],
    knowledgeBase: KnowledgeBase,
  ): Promise<string> {
    // Process all steps concurrently within the test case too
    const renderResults = await pMap(
      testCase.steps,
      step => this.ruleBasedClassifier.generate(step, availableTargets).then(
        actionModel => ({
          action: actionModel.action,
          code:   this.renderer.renderAction(actionModel, knowledgeBase),
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

    return `  test("${testCase.title}", async ({ page }) => {
${indentedActions}
${indentedAssertion}
  });`;
  }
}
