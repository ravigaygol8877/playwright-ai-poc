import "dotenv/config";

import { OpenRouterProvider } from "../../../llm/src/providers/OpenRouterProvider.js";
import { TestDataGenerator } from "./TestDataGenerator.js";

async function main() {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY not found");
    }

    const llmProvider = new OpenRouterProvider(apiKey);

    const generator = new TestDataGenerator(llmProvider);

    const data = await generator.generate(
        "User should be able to login using valid username and password"
    );

    console.log("Generated Test Data:", data);
    // console.log("Username:", data.validUsername);
    // console.log("Password:", data.validPassword);
}

main();