import "dotenv/config";

import { ProviderFactory }
from "../pipeline/providers/ProviderFactory.js";

import { KnowledgeBaseService }
from "../pipeline/kb/KnowledgeBaseService.js";

import { SelfHealingLocatorEngine }
from "../pipeline/analyzers/self-healing/SelfHealingLocatorEngine.js";

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
