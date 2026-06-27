import fs from "fs";
import path from "path";
import type { TestExecutionData }
  from "../analyzers/flaky/TestExecutionData.js";

export interface TestRunRecord {
  runId: string;
  timestamp: string;
  testFile: string;
  results: TestExecutionData[];
}

export class TestResultStore {

  constructor(
    private storePath: string = "test-results/history"
  ) {}

  save(record: TestRunRecord): void {
    if (!fs.existsSync(this.storePath)) {
      fs.mkdirSync(this.storePath, { recursive: true });
    }

    const filePath = path.join(
      this.storePath,
      `${record.runId}.json`
    );

    fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
    console.log(`Test run saved: ${filePath}`);
  }

  loadHistory(testName: string): TestExecutionData[] {
    if (!fs.existsSync(this.storePath)) return [];

    const files = fs
      .readdirSync(this.storePath)
      .filter(f => f.endsWith(".json"));

    const history: TestExecutionData[] = [];

    for (const file of files) {
      const filePath = path.join(this.storePath, file);
      const record = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
      ) as TestRunRecord;

      const matches = record.results.filter(
        r => r.testName === testName
      );
      history.push(...matches);
    }

    return history;
  }

  loadLatestRun(): TestRunRecord | null {
    if (!fs.existsSync(this.storePath)) return null;

    const files = fs
      .readdirSync(this.storePath)
      .filter(f => f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const filePath = path.join(this.storePath, files[0]!);
    return JSON.parse(
      fs.readFileSync(filePath, "utf-8")
    ) as TestRunRecord;
  }
}
