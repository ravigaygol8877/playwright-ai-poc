import "dotenv/config";

import { OpenRouterProvider }
from "../../../llm/src/providers/OpenRouterProvider.js";

import { RegressionSelector }
from "./RegressionSelector.js";

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

  const selector =
    new RegressionSelector(provider);

  const result =
    await selector.analyze([
      "AuthService.ts",
      "LoginController.ts",
      "UserRepository.ts"
    ]);

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
}

main();