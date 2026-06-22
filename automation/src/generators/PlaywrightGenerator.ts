import type { TestCase } from "../../../ai/src/models/TestCase.js";
import type { TestData } from "../../../ai/src/models/TestData.js";

import { PlaywrightActionGenerator }
  from "../../../ai/src/playwright-generator/PlaywrightActionGenerator.js";

import { AssertionGenerator }
  from "../../../ai/src/assertion-generator/AssertionGenerator.js";

import { KnowledgeBaseService }
  from "../../../knowledge-base/KnowledgeBaseService.js";

export class PlaywrightGenerator {
  constructor(
    private actionGenerator: PlaywrightActionGenerator,
    private assertionGenerator: AssertionGenerator
  ) {}

  async generate(
    testCases: TestCase[],
    testData: TestData
  ): Promise<string> {

    const kbService =
      new KnowledgeBaseService();

    const knowledgeBase =
      kbService.load("login-page");

    const testBlocks = await Promise.all(
      testCases.map(async (testCase) => {

        const actions = await Promise.all(
          testCase.steps.map(step =>
            this.actionGenerator.generateAction(
              step,
              knowledgeBase
            )
          )
        );

        const assertion =
          await this.assertionGenerator.generateAssertion(
            testCase.expectedResult,
            knowledgeBase
          );

        return `
test('${testCase.title}', async ({ page }) => {

  const testData = ${JSON.stringify(
    testData,
    null,
    2
  )};

${actions.join("\n  ")}

  ${assertion}

});
`;
      })
    );

    return `
import { test, expect } from '@playwright/test';

${testBlocks.join("\n")}
`;
  }
}