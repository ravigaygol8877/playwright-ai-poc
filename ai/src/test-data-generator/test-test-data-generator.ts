import "dotenv/config";

import { ProviderFactory } from "../../../llm/src/ProviderFactory.js";
import { TestDataGenerator } from "./TestDataGenerator.js";

async function main() {
    const llmProvider = ProviderFactory.create();

    const generator = new TestDataGenerator(llmProvider);

    const data = await generator.generate(
        "User should be able to login using valid username and password"
    );

    console.log("Generated Test Data:", data);
}

main();
