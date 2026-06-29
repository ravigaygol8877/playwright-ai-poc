/**
 * AI Test Intelligence Platform — Full Demo Runner
 *
 * Runs all ParaBank scenarios in sequence for a complete live demo.
 *
 *   npm run demo
 *
 * Scenarios covered:
 *   1.  ParaBank Login          → tests/UI/parabank-login.spec.ts
 *   2.  ParaBank Registration   → tests/UI/parabank-register.spec.ts
 *   3.  ParaBank Transfer       → tests/UI/parabank-transfer.spec.ts
 *   4.  ParaBank Bill Pay       → tests/UI/parabank-billpay.spec.ts
 *   5.  Self-Healing Locator    → heals a broken login button selector
 *   6.  Root Cause Analyzer     → diagnoses a CI timeout failure
 *   7.  Flaky Test Analyzer     → scores a suspected flaky test
 *   8.  Coverage Gap Analyzer   → finds uncovered ParaBank requirements
 *   9.  Regression Selector     → picks impacted suites from changed files
 */

import "dotenv/config";
import fs from "fs";
import path from "path";

import type { LLMProvider } from "../pipeline/providers/interfaces/LLMProvider.js";
import { createRunContext } from "../pipeline/reporting/RunContext.js";
import { ProviderFactory }  from "../pipeline/providers/ProviderFactory.js";
import { KnowledgeBaseGenerator } from "../pipeline/kb/KnowledgeBaseGenerator.js";
import { TestCaseGenerator }
  from "../pipeline/generators/test-cases/TestCaseGenerator.js";
import { TestDataGenerator }
  from "../pipeline/generators/test-data/TestDataGenerator.js";
import { PlaywrightGenerator }
  from "../pipeline/generators/playwright/PlaywrightGenerator.js";
import { KnowledgeBaseService }
  from "../pipeline/kb/KnowledgeBaseService.js";
import { SelfHealingLocatorEngine }
  from "../pipeline/analyzers/self-healing/SelfHealingLocatorEngine.js";
import { BugRootCauseAnalyzer }
  from "../pipeline/analyzers/root-cause/BugRootCauseAnalyzer.js";
import { FlakyTestAnalyzer }
  from "../pipeline/analyzers/flaky/FlakyTestAnalyzer.js";
import { CoverageAnalyzer }
  from "../pipeline/analyzers/coverage/CoverageAnalyzer.js";
import { RegressionSelector }
  from "../pipeline/analyzers/regression/RegressionSelector.js";

// ─── KB page registry — maps pageKey → canonical URL ──────────────────────────
// Add an entry here whenever you add a new demo scenario so KB files
// can be auto-generated on first run instead of failing.
const PAGE_URLS: Record<string, string> = {
  "parabank-login-page":    "https://parabank.parasoft.com/parabank/index.htm",
  "parabank-register-page": "https://parabank.parasoft.com/parabank/register.htm",
  "parabank-transfer-page": "https://parabank.parasoft.com/parabank/transfer.htm",
  "parabank-billpay-page":  "https://parabank.parasoft.com/parabank/billpay.htm",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEP = "═".repeat(60);

function header(n: number, title: string) {
  console.log(`\n${SEP}`);
  console.log(`  SCENARIO ${n} — ${title}`);
  console.log(SEP);
}

function step(label: string) {
  console.log(`\n  ▸ ${label}`);
}

function ok(label: string) {
  console.log(`  ✅ ${label}`);
}

function field(key: string, value: string) {
  console.log(`       ${key.padEnd(20)}: ${value}`);
}

async function ensureKb(pageName: string, llm: LLMProvider): Promise<void> {
  const filePath = `pipeline/kb/pages/${pageName}.json`;
  if (fs.existsSync(filePath)) return;

  const url = PAGE_URLS[pageName];
  if (!url) {
    throw new Error(
      `Knowledge base not found: "${pageName}" and no URL registered in PAGE_URLS.\n` +
      `Add an entry to PAGE_URLS in scripts/demo.ts to enable auto-generation.`
    );
  }

  console.log(`\n  ⚠  KB file missing for "${pageName}" — auto-generating from ${url}`);
  await new KnowledgeBaseGenerator(llm).generate(url, pageName);
}

async function generateSuite(
  llm: LLMProvider,
  pageName: string,
  requirement: string,
  outputFile: string
) {
  const kbService = new KnowledgeBaseService();
  const kb = kbService.load(pageName);

  step("Generating test cases...");
  const testCases = await new TestCaseGenerator(llm).generate(requirement);
  ok(`${testCases.length} test cases`);
  testCases.forEach(tc => console.log(`         [${tc.id}] ${tc.title}`));

  step("Generating test data...");
  const testData = await new TestDataGenerator(llm).generate(requirement, kb);
  ok("Test data ready");

  step(`Loading knowledge base (${kb.pageName})...`);
  ok(`URL: ${kb.url}`);
  field("selectors", Object.keys(kb.selectors as Record<string, unknown>).join(", "));

  step("Generating Playwright script...");
  (kb as any).pageKey = pageName;
  const script = await new PlaywrightGenerator().generate(testCases, kb);

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, script);
  ok(`Written → ${outputFile}  (${script.split("\n").length} lines)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {

  console.clear();
  console.log(`
╔══════════════════════════════════════════════════════════╗
║      AI Test Intelligence Platform — Full Demo          ║
║      Target App : ParaBank (parabank.parasoft.com)      ║
╚══════════════════════════════════════════════════════════╝
  `);

  const runs = createRunContext();
  console.log(`  Run ID      : ${runs.runId}`);
  console.log(`  Reports dir : ${runs.root}\n`);

  const llm = ProviderFactory.create();
  const kbService = new KnowledgeBaseService();

  // ── Scenario 1: Login ─────────────────────────────────────────────────────
  header(1, "Login — Test Suite Generation");
  await ensureKb("parabank-login-page", llm);
  await generateSuite(
    llm,
    "parabank-login-page",
    "User should be able to log in to ParaBank with valid credentials. " +
    "Invalid credentials should show an error message. " +
    "Empty fields should trigger validation messages.",
    "tests/UI/parabank-login.spec.ts"
  );

  // ── Scenario 2: Registration ──────────────────────────────────────────────
  header(2, "Registration — Test Suite Generation");
  await ensureKb("parabank-register-page", llm);
  await generateSuite(
    llm,
    "parabank-register-page",
    "User should be able to register a new ParaBank account by entering personal " +
    "details and choosing a username and password. Duplicate usernames must be rejected. " +
    "Password confirmation mismatch should show an error. All required fields must be validated.",
    "tests/UI/parabank-register.spec.ts"
  );

  // ── Scenario 3: Transfer Funds ────────────────────────────────────────────
  header(3, "Transfer Funds — Test Suite Generation");
  await ensureKb("parabank-transfer-page", llm);
  await generateSuite(
    llm,
    "parabank-transfer-page",
    "User should be able to transfer funds between two ParaBank accounts. " +
    "An empty or invalid amount should be rejected. " +
    "A successful transfer should show the Transfer Complete message.",
    "tests/UI/parabank-transfer.spec.ts"
  );

  // ── Scenario 4: Bill Pay ──────────────────────────────────────────────────
  header(4, "Bill Pay — Test Suite Generation");
  await ensureKb("parabank-billpay-page", llm);
  await generateSuite(
    llm,
    "parabank-billpay-page",
    "User should be able to pay a bill on ParaBank by entering payee name, address, " +
    "account number, and amount. Account number confirmation mismatch should show an error. " +
    "A successful payment should show Bill Payment Complete.",
    "tests/UI/parabank-billpay.spec.ts"
  );

  // ── Scenario 5: Self-Healing Locator ──────────────────────────────────────
  header(5, "Self-Healing Locator Engine");
  console.log("\n  Situation: ParaBank's login button was renamed after a UI redesign.");
  console.log(`  Broken selector : "#loginForm .btn-primary"\n`);

  await ensureKb("parabank-login-page", llm);
  const loginKb = kbService.load("parabank-login-page");
  const healed = await new SelfHealingLocatorEngine(llm).heal(
    { failedLocator: "#loginForm .btn-primary", pageName: "Login Page" },
    loginKb
  );
  ok("Locator healed automatically");
  field("originalLocator", healed.originalLocator);
  field("healedLocator", healed.healedLocator);
  field("confidence", `${healed.confidence}%`);
  field("reasoning", healed.reasoning);
  fs.writeFileSync(path.join(runs.aiReports, "self-healing.json"), JSON.stringify(healed, null, 2));

  // ── Scenario 6: Root Cause Analyzer ──────────────────────────────────────
  header(6, "Root Cause Analyzer — CI Failure");
  console.log("\n  Situation: parabank-transfer.spec.ts timed out in CI.\n");

  const rootCause = await new BugRootCauseAnalyzer(llm).analyze({
    testName: "parabank-transfer.spec.ts",
    failureMessage: "TimeoutError: waiting for selector '#showResult h1' exceeded 30000ms",
    stackTrace:
      "at PWTestRunner.waitForSelector (playwright/lib/server.js:38)\n" +
      "  at Object.<anonymous> (tests/UI/parabank-transfer.spec.ts:22)",
    executionLog:
      "Navigated to /transfer.htm, selected from account 12345, " +
      "selected to account 67890, entered amount 500, clicked Transfer, " +
      "waited 30s for #showResult h1 — element never appeared"
  });
  ok("Root cause identified");
  field("failureType", rootCause.failureType);
  field("probableCause", rootCause.probableCause);
  field("impactedComponent", rootCause.impactedComponent);
  field("recommendation", rootCause.recommendation);
  field("confidence", `${rootCause.confidence}%`);
  fs.writeFileSync(path.join(runs.aiReports, "root-cause.json"), JSON.stringify(rootCause, null, 2));

  // ── Scenario 7: Flaky Test Analyzer ──────────────────────────────────────
  header(7, "Flaky Test Analyzer");
  console.log("\n  Situation: parabank-billpay.spec.ts fails 3 out of 10 CI runs.\n");

  const flaky = await new FlakyTestAnalyzer(llm).analyze({
    testName: "parabank-billpay.spec.ts",
    retryCount: 3,
    duration: 18500,
    failureMessage: "TimeoutError: waiting for selector '#showResult h1'"
  });
  ok("Flaky analysis complete");
  field("flakyProbability", `${flaky.flakyProbability}%`);
  field("possibleCauses", flaky.possibleCauses.join(" | "));
  field("recommendation", flaky.recommendation);
  fs.writeFileSync(path.join(runs.aiReports, "flaky-analysis.json"), JSON.stringify(flaky, null, 2));

  // ── Scenario 8: Coverage Analyzer ────────────────────────────────────────
  header(8, "Coverage Gap Analyzer");
  console.log("\n  Checking which ParaBank requirements have test coverage.\n");

  const coverage = await new CoverageAnalyzer(llm).analyze({
    requirements: [
      "User can log in to ParaBank",
      "User can register a new account",
      "User can transfer funds between accounts",
      "User can pay bills",
      "User can request a loan",
      "User can open a new account",
      "User can view account activity"
    ],
    existingTests: [
      "parabank-login.spec.ts",
      "parabank-register.spec.ts",
      "parabank-transfer.spec.ts",
      "parabank-billpay.spec.ts"
    ]
  });
  ok("Coverage analysis complete");
  field("coveragePercentage", `${coverage.coveragePercentage}%`);
  field("covered", coverage.coveredRequirements.join(", "));
  field("missing", coverage.missingCoverage.join(", "));
  field("recommendation", coverage.recommendation);
  fs.writeFileSync(path.join(runs.aiReports, "coverage-gap.json"), JSON.stringify(coverage, null, 2));

  // ── Scenario 9: Regression Selector ──────────────────────────────────────
  header(9, "Regression Test Selector");
  console.log("\n  PR changed: src/auth/login.ts  src/transfer/transfer-service.ts");
  console.log("  Question  : Which test suites should CI run?\n");

  const regression = await new RegressionSelector(llm).analyze([
    "src/auth/login.ts",
    "src/transfer/transfer-service.ts"
  ]);
  ok("Impacted suites identified — skip the rest");
  field("impactedFeatures", regression.impactedFeatures.join(", "));
  field("recommendedTests", regression.recommendedTests.join(", "));
  field("reasoning", regression.reasoning);
  fs.writeFileSync(path.join(runs.aiReports, "regression-recommendations.json"), JSON.stringify(regression, null, 2));

  // ── Final Summary ─────────────────────────────────────────────────────────
  console.log(`\n${SEP}`);
  console.log("  DEMO COMPLETE — ALL SCENARIOS PASSED");
  console.log(SEP);
  console.log(`
  Generated test files:
    ✅  tests/UI/parabank-login.spec.ts
    ✅  tests/UI/parabank-register.spec.ts
    ✅  tests/UI/parabank-transfer.spec.ts
    ✅  tests/UI/parabank-billpay.spec.ts

  AI report files → ${runs.aiReports}/
    ✅  self-healing.json
    ✅  root-cause.json
    ✅  flaky-analysis.json
    ✅  coverage-gap.json
    ✅  regression-recommendations.json

  Next steps:
    npx playwright test tests/UI/     ← run all generated tests
    npm run report:latest              ← open HTML report for this run
  `);
}

main().catch(err => {
  console.error("\n  ❌ Demo failed:", (err as Error).message);
  process.exit(1);
});
