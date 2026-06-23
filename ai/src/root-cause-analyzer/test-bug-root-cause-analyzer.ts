import "dotenv/config";

import { OpenRouterProvider }
from "../../../llm/src/providers/OpenRouterProvider.js";

import { BugRootCauseAnalyzer }
from "./BugRootCauseAnalyzer.js";

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
    new BugRootCauseAnalyzer(
      provider
    );

  const result =
    await analyzer.analyze({
      testName: "login.spec.ts",

      failureMessage:
        "Timeout 30000ms exceeded",

      stackTrace:
        "locator.click timeout",

      executionLog:
        "Waiting for login button"
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