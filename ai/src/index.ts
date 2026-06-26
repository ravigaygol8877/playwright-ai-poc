import "dotenv/config";
import fs from "fs";

import { ProviderFactory } from "../../llm/src/ProviderFactory.js";

import { TestCaseGenerator }
    from "./test-case-generator/TestCaseGenerator.js";

import { TestDataGenerator }
    from "./test-data-generator/TestDataGenerator.js";

import { AssertionGenerator }
    from "./assertion-generator/AssertionGenerator.js";

import { AIActionModelGenerator }
    from "./action-model/AIActionModelGenerator.js";

import { PlaywrightGenerator }
    from "../../automation/src/generators/PlaywrightGenerator.js";

import { PlaywrightRenderer }
    from "../../automation/src/renderers/PlaywrightRenderer.js";

import { KnowledgeBaseService }
    from "../../knowledge-base/KnowledgeBaseService.js";

async function main() {
    const llmProvider = ProviderFactory.create();

    const requirement =
        "User should be able to login using valid username and password";

    const testCaseGenerator =
        new TestCaseGenerator(llmProvider);

    const testCases =
        await testCaseGenerator.generate(
            requirement
        );

    const testDataGenerator =
        new TestDataGenerator(llmProvider);

    const testData =
        await testDataGenerator.generate(
            requirement
        );

    const kbService =
        new KnowledgeBaseService();

    const knowledgeBase =
        kbService.load("login-page");

    const actionModelGenerator =
        new AIActionModelGenerator(
            llmProvider
        );

    const renderer =
        new PlaywrightRenderer();

    const assertionGenerator =
        new AssertionGenerator(
            llmProvider
        );

    const playwrightGenerator =
        new PlaywrightGenerator(
            actionModelGenerator,
            renderer,
            assertionGenerator
        );

    const script =
        await playwrightGenerator.generate(
            testCases,
            testData,
            knowledgeBase
        );

    fs.writeFileSync(
        "tests/e2e/login.spec.ts",
        script
    );

    console.log(
        "Generated: tests/generated/login.spec.ts"
    );

    console.log(script);
}

main();
