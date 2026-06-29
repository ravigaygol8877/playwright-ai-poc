import "dotenv/config";
import { ensureScaffoldFiles } from "./ensureScaffold.js";

import { ProviderFactory }
from "../pipeline/providers/ProviderFactory.js";

import { RegressionSelector }
from "../pipeline/analyzers/regression/RegressionSelector.js";

async function main() {
  ensureScaffoldFiles();

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
