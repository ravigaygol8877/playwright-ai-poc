import type { TestCase }
  from "../../../ai/src/models/TestCase.js";

import type { TestData }
  from "../../../ai/src/models/TestData.js";

import { AIActionModelGenerator }
  from "../../../ai/src/action-model/AIActionModelGenerator.js";

import { PlaywrightRenderer }
  from "../renderers/PlaywrightRenderer.js";

import { AssertionGenerator }
  from "../../../ai/src/assertion-generator/AssertionGenerator.js";

export class PlaywrightGenerator {
  constructor(
    private actionModelGenerator:
      AIActionModelGenerator,

    private renderer:
      PlaywrightRenderer,

    private assertionGenerator:
      AssertionGenerator
  ) { }

  async generate(
    testCases: TestCase[],
    testData: TestData,
    knowledgeBase: any
  ): Promise<string> {

    const testBlocks = await Promise.all(
      testCases.map(async (testCase) => {

        const actions = await Promise.all(
          testCase.steps.map(
            async (step) => {

              const actionModel =
                await this.actionModelGenerator.generate(
                  step
                );

              return this.renderer.renderAction(
                actionModel,
                knowledgeBase
              );
            }
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

${actions.join("\n")}

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