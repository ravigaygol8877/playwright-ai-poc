import "dotenv/config";

import { ProviderFactory }
from "../../../llm/src/ProviderFactory.js";

import { BugRootCauseAnalyzer }
from "./BugRootCauseAnalyzer.js";

async function main() {

  const provider = ProviderFactory.create();

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
