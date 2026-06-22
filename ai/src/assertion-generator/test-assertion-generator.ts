import "dotenv/config";

import { OpenRouterProvider }
  from "../../../llm/src/providers/OpenRouterProvider.js";

import { AssertionGenerator }
  from "./AssertionGenerator.js";

async function main() {

  const apiKey =
    process.env.OPENROUTER_API_KEY!;

  const provider =
    new OpenRouterProvider(apiKey);

  const generator =
    new AssertionGenerator(provider);

  const knowledgeBase = {
    success: {
      redirectUrl: "/dashboard"
    }
  };

  const result =
    await generator.generateAssertion(
      "User is redirected to dashboard",
      knowledgeBase
    );

  console.log(result);
}

main();