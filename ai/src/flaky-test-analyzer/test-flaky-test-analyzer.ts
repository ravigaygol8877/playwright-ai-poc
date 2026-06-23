import "dotenv/config";

import { OpenRouterProvider }
from "../../../llm/src/providers/OpenRouterProvider.js";

import { FlakyTestAnalyzer }
from "./FlakyTestAnalyzer.js";

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
    new FlakyTestAnalyzer(provider);

  const result =
    await analyzer.analyze({
      testName: "login.spec.ts",
      retryCount: 3,
      duration: 45000,
      failureMessage:
        "Timeout 30000ms exceeded"
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