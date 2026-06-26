import "dotenv/config";

import { ProviderFactory }
from "../../../llm/src/ProviderFactory.js";

import { TestCaseGenerator }
from "../test-case-generator/TestCaseGenerator.js";

import { TestDataGenerator }
from "../test-data-generator/TestDataGenerator.js";

import { AIActionModelGenerator }
from "../action-model/AIActionModelGenerator.js";

import { AssertionGenerator }
from "../assertion-generator/AssertionGenerator.js";

import { PlaywrightRenderer }
from "../../../automation/src/renderers/PlaywrightRenderer.js";

import { PlaywrightGenerator }
from "../../../automation/src/generators/PlaywrightGenerator.js";

import { TestIntelligenceOrchestrator }
from "./TestIntelligenceOrchestrator.js";

async function main() {

  const provider = ProviderFactory.create();

  const testCaseGenerator =
    new TestCaseGenerator(provider);

  const testDataGenerator =
    new TestDataGenerator(provider);

  const actionModelGenerator =
    new AIActionModelGenerator(provider);

  const assertionGenerator =
    new AssertionGenerator(provider);

  const renderer =
    new PlaywrightRenderer();

  const playwrightGenerator =
    new PlaywrightGenerator(
      actionModelGenerator,
      renderer,
      assertionGenerator
    );

  const orchestrator =
    new TestIntelligenceOrchestrator(
      testCaseGenerator,
      testDataGenerator,
      playwrightGenerator
    );

  const result =
    await orchestrator.generateTests(
      "User should be able to login using valid username and password"
    );

  console.log(
    JSON.stringify(
      {
        testCases: result.testCases.length,
        generatedScriptLength:
          result.generatedScript.length
      },
      null,
      2
    )
  );
}

main();
