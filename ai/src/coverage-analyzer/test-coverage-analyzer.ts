import "dotenv/config";

import { OpenRouterProvider }
from "../../../llm/src/providers/OpenRouterProvider.js";

import { CoverageAnalyzer }
from "./CoverageAnalyzer.js";

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