import "dotenv/config";

import { ProviderFactory }
from "../../../llm/src/ProviderFactory.js";

import { AIActionModelGenerator }
from "./AIActionModelGenerator.js";

async function main() {

  const provider = ProviderFactory.create();

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
