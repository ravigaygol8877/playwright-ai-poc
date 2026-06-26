import fs from "fs";
import type { TestExecutionData }
  from "../../../ai/src/flaky-test-analyzer/TestExecutionData.js";

interface PlaywrightError {
  message: string;
  stack?: string;
}

interface PlaywrightTestResult {
  title: string;
  status: "passed" | "failed" | "skipped" | "timedOut";
  duration: number;
  retry: number;
  errors: PlaywrightError[];
}

interface PlaywrightSuite {
  title: string;
  tests?: PlaywrightTestResult[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightReport {
  suites: PlaywrightSuite[];
}

export class ResultCollectionEngine {

  collect(reportPath: string): TestExecutionData[] {
    if (!fs.existsSync(reportPath)) {
      throw new Error(
        `Playwright report not found at: ${reportPath}. ` +
        `Run ExecutionEngine first with reporter="json".`
      );
    }

    const raw = fs.readFileSync(reportPath, "utf-8");
    const report = JSON.parse(raw) as PlaywrightReport;
    const results: TestExecutionData[] = [];

    this.walkSuites(report.suites ?? [], results);
    return results;
  }

  private walkSuites(
    suites: PlaywrightSuite[],
    results: TestExecutionData[]
  ): void {
    for (const suite of suites) {
      for (const test of suite.tests ?? []) {
        if (test.status === "failed" || test.status === "timedOut") {
          results.push({
            testName: test.title,
            retryCount: test.retry,
            duration: test.duration,
            failureMessage: test.errors[0]?.message ?? "Unknown failure",
          });
        }
      }
      this.walkSuites(suite.suites ?? [], results);
    }
  }
}
