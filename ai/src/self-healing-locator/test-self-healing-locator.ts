import "dotenv/config";

import { OpenRouterProvider }
from "../../../llm/src/providers/OpenRouterProvider.js";

import { KnowledgeBaseService }
from "../../../knowledge-base/KnowledgeBaseService.js";

import { SelfHealingLocatorEngine }
from "./SelfHealingLocatorEngine.js";

async function main() {

  const apiKey =
    process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY not found"
    );
  }

  const provider =
    new OpenRouterProvider(apiKey);

  const kbService =
    new KnowledgeBaseService();

  const knowledgeBase =
    kbService.load("login-page");

  const engine =
    new SelfHealingLocatorEngine(
      provider
    );

  const result =
    await engine.heal(
      {
        failedLocator: "#loginBtn",
        pageName: "login-page"
      },
      knowledgeBase
    );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
}

main();