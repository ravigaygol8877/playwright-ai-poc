import "dotenv/config";

import { OpenRouterProvider } from "../../../llm/src/providers/OpenRouterProvider.js";
import { AIPlaywrightGenerator } from "./AIPlaywrightGenerator.js";

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not found");
  }

  const llmProvider = new OpenRouterProvider(apiKey);

  const generator = new AIPlaywrightGenerator(llmProvider);

  const action = await generator.generateAction(
    "Enter username in username field"
  );

  console.log(action);
}

main();