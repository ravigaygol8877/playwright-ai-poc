import "dotenv/config";

import { ProviderFactory }
from "../../../llm/src/ProviderFactory.js";

import { CoverageAnalyzer }
from "./CoverageAnalyzer.js";

async function main() {

  const provider = ProviderFactory.create();

  const analyzer =
    new CoverageAnalyzer(provider);

  const result =
    await analyzer.analyze({
      requirements: [
        "User can login",
        "User can reset password",
        "User can update profile"
      ],

      existingTests: [
        "Login Tests",
        "Password Reset Tests"
      ]
    });

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
}

main();
