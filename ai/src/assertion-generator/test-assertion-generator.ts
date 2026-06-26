import "dotenv/config";

import { ProviderFactory }
  from "../../../llm/src/ProviderFactory.js";

import { AssertionGenerator }
  from "./AssertionGenerator.js";

async function main() {

  const provider = ProviderFactory.create();

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
