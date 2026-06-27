import "dotenv/config";

import { ProviderFactory }
from "../pipeline/providers/ProviderFactory.js";

import { FlakyTestAnalyzer }
from "../pipeline/analyzers/flaky/FlakyTestAnalyzer.js";

async function main() {

  const provider = ProviderFactory.create();

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