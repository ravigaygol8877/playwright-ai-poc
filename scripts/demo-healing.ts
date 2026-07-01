import "dotenv/config";
import { ensureScaffoldFiles } from "./ensureScaffold.js";

import { ProviderFactory }
from "../pipeline/providers/ProviderFactory.js";

import { KnowledgeBaseService }
from "../pipeline/kb/KnowledgeBaseService.js";

import { SelfHealingLocatorEngine }
from "../pipeline/analyzers/self-healing/SelfHealingLocatorEngine.js";

async function main() {
  ensureScaffoldFiles();

  const provider = ProviderFactory.create();

  const kbService =
    new KnowledgeBaseService();

  const knowledgeBase =
    kbService.load("parabank-login-page");

  const engine =
    new SelfHealingLocatorEngine(
      provider
    );

  const result =
    await engine.heal(
      {
        failedLocator: "input[type='submit'][value='Log In']",
        pageName: "parabank-login-page"
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
