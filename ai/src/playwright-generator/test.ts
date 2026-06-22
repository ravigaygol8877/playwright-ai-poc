import "dotenv/config";

import { OpenRouterProvider } from "../../../llm/src/providers/OpenRouterProvider.js";
import { PlaywrightActionGenerator } from "./PlaywrightActionGenerator.js";

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not found");
  }

  const provider = new OpenRouterProvider(apiKey);

  const generator = new PlaywrightActionGenerator(provider);

  const result =
    await generator.generateAction(
      "Enter username",
      ["validUsername", "validPassword"]
    );

  console.log(result);
}

main();