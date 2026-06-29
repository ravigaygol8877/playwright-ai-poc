import "dotenv/config";
import fs from "fs";

import { ProviderFactory } from "./providers/ProviderFactory.js";

import { TestCaseGenerator }
    from "./generators/test-cases/TestCaseGenerator.js";

import { PlaywrightGenerator }
    from "./generators/playwright/PlaywrightGenerator.js";

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

    const kbService =
        new KnowledgeBaseService();

    const knowledgeBase =
        kbService.load("login-page");

    const playwrightGenerator =
        new PlaywrightGenerator();

    const script =
        await playwrightGenerator.generate(
            testCases,
            knowledgeBase
        );

    fs.writeFileSync(
        "tests/UI/login.spec.ts",
        script
    );

    console.log(
        "Generated: tests/generated/login.spec.ts"
    );

    console.log(script);
}

main();
