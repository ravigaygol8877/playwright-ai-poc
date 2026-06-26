import "dotenv/config";

import { ProviderFactory }
from "../../../llm/src/ProviderFactory.js";

import { KnowledgeBaseService }
from "../../../knowledge-base/KnowledgeBaseService.js";

import { SelfHealingLocatorEngine }
from "./SelfHealingLocatorEngine.js";

async function main() {

  const provider = ProviderFactory.create();

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
