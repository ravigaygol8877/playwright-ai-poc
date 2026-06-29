import "dotenv/config";
import { ensureScaffoldFiles } from "./ensureScaffold.js";

import { ProviderFactory }
from "../pipeline/providers/ProviderFactory.js";

import { CoverageAnalyzer }
from "../pipeline/analyzers/coverage/CoverageAnalyzer.js";

async function main() {
  ensureScaffoldFiles();

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
