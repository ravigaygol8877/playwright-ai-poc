import "dotenv/config";

import { ProviderFactory }
from "../pipeline/providers/ProviderFactory.js";

import { RegressionSelector }
from "../pipeline/analyzers/regression/RegressionSelector.js";

async function main() {

  const provider = ProviderFactory.create();

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
