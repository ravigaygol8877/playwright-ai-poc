import "dotenv/config";
import fs from "fs";

import { ProviderFactory } from "./providers/ProviderFactory.js";

import { TestCaseGenerator }
    from "./generators/test-cases/TestCaseGenerator.js";

import { TestDataGenerator }
    from "./generators/test-data/TestDataGenerator.js";

import { AssertionGenerator }
    from "./generators/assertions/AssertionGenerator.js";

import { AIActionModelGenerator }
    from "./generators/action-model/AIActionModelGenerator.js";

import { PlaywrightGenerator }
    from "./generators/playwright/PlaywrightGenerator.js";

import { PlaywrightRenderer }
    from "./generators/playwright/PlaywrightRenderer.js";

import { KnowledgeBaseService }
    from "./kb/KnowledgeBaseService.js";

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
