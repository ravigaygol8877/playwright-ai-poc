import "dotenv/config";
import { PlaywrightGenerator } from "../../automation/src/generators/PlaywrightGenerator.js";
import { OpenRouterProvider } from "../../llm/src/providers/OpenRouterProvider.js";
import { TestCaseGenerator } from "./test-case-generator/TestCaseGenerator.js";
import { PlaywrightActionGenerator } from "./playwright-generator/PlaywrightActionGenerator.js";
import { TestDataGenerator } from "./test-data-generator/TestDataGenerator.js";
import { AssertionGenerator }
    from "./assertion-generator/AssertionGenerator.js";
import fs from "fs";
async function main() {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY not found");
    }

    const llmProvider = new OpenRouterProvider(apiKey);

    const generator = new TestCaseGenerator(llmProvider);

    const result = await generator.generate(
        "User should be able to login using valid username and password"
    );

    const testDataGenerator =
        new TestDataGenerator(llmProvider);

    const testData =
        await testDataGenerator.generate(
            "User should be able to login using valid username and password"
        );

    const assertionGenerator =
        new AssertionGenerator(llmProvider);

    const actionGenerator =
        new PlaywrightActionGenerator(llmProvider);

    const playwrightGenerator =
        new PlaywrightGenerator(
            actionGenerator,
            assertionGenerator
        );

    const script =
        await playwrightGenerator.generate(
            result,
            testData
        );

    fs.writeFileSync(
        "tests/generated/login.spec.ts",
        script
    );

    console.log(
        "Generated: tests/generated/login.spec.ts"
    );
    console.log(script);

    //console.log(JSON.stringify(result, null, 2));

}

main();