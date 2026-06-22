import "dotenv/config";

import { OpenRouterProvider }
from "../../../llm/src/providers/OpenRouterProvider.js";

import { AIActionModelGenerator }
from "./AIActionModelGenerator.js";

async function main() {

  const provider =
    new OpenRouterProvider(
      process.env.OPENROUTER_API_KEY!
    );

  const generator =
    new AIActionModelGenerator(
      provider
    );

  const result =
    await generator.generate(
      "Enter a valid username"
    );

  console.log(result);
}

main();