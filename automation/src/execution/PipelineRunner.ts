import "dotenv/config";
import fs from "fs";

import { ExecutionEngine }
  from "./ExecutionEngine.js";

import { ResultCollectionEngine }
  from "./ResultCollectionEngine.js";

import { TestResultStore }
  from "./TestResultStore.js";

import { ReportingService }
  from "../reporting/ReportingService.js";

import { FlakyTestAnalyzer }
  from "../../../ai/src/flaky-test-analyzer/FlakyTestAnalyzer.js";

import { BugRootCauseAnalyzer }
  from "../../../ai/src/root-cause-analyzer/BugRootCauseAnalyzer.js";

import { CoverageAnalyzer }
  from "../../../ai/src/coverage-analyzer/CoverageAnalyzer.js";

import { ProviderFactory }
  from "../../../llm/src/ProviderFactory.js";

export interface PipelineOptions {
  testFile?: string;
  requirements?: string[];
}

export async function runPipeline(
  options: PipelineOptions = {}
): Promise<void> {

  const llm = ProviderFactory.create();

  // 1. Execute tests
  const engine = new ExecutionEngine();
  const runOptions: Parameters<typeof engine.run>[0] = {
    reporter: "json",
  };
  if (options.testFile) runOptions.testFile = options.testFile;

  const executionResult = engine.run(runOptions);

  console.log(`Execution: ${executionResult.passed ? "PASSED" : "FAILED"}`);

  // 2. Collect results
  const collector = new ResultCollectionEngine();
  const failures = collector.collect(executionResult.reportPath);

  if (failures.length === 0 && executionResult.passed) {
    console.log("All tests passed — no AI analysis needed.");
  }

  // 3. Store results
  const store = new TestResultStore();
  const runId = `run-${Date.now()}`;
  store.save({
    runId,
    timestamp: new Date().toISOString(),
    testFile: options.testFile ?? "all",
    results: failures,
  });

  // 4. Flaky analysis
  const flakyAnalyzer = new FlakyTestAnalyzer(llm);
  const flakyTests = await Promise.all(
    failures.map(f => flakyAnalyzer.analyze(f))
  );

  // 5. Root cause analysis
  const rootCauseAnalyzer = new BugRootCauseAnalyzer(llm);
  const rootCauses = await Promise.all(
    failures.map(f => rootCauseAnalyzer.analyze({
      testName: f.testName,
      failureMessage: f.failureMessage,
      stackTrace: f.failureMessage,
      executionLog: `Retry count: ${f.retryCount}, Duration: ${f.duration}ms`,
    }))
  );

  // 6. Coverage analysis (if requirements provided)
  const existingTests = failures.map(f => f.testName);
  const coverage = options.requirements && options.requirements.length > 0
    ? await new CoverageAnalyzer(llm).analyze({
        requirements: options.requirements,
        existingTests,
      })
    : null;

  // 7. Generate report
  const reporter = new ReportingService();
  const report = reporter.generate({
    flakyTests,
    rootCauses,
    coverage,
    regressionSelection: null,
  });

  console.log("\n" + report.releaseSummary);
  console.log(`\nFull report written to reports/${report.generatedAt.split("T")[0]}/`);
}
