import "dotenv/config";
import { ensureScaffoldFiles } from "./ensureScaffold.js";

import { ProviderFactory }
from "../pipeline/providers/ProviderFactory.js";

import { BugRootCauseAnalyzer }
from "../pipeline/analyzers/root-cause/BugRootCauseAnalyzer.js";

async function main() {
  ensureScaffoldFiles();

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
