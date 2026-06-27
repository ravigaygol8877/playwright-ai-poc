import { execSync } from "child_process";

export interface ExecutionOptions {
  testFile?: string;
  project?: string;
  reporter?: "json" | "html" | "list";
}

export interface ExecutionResult {
  exitCode: number;
  passed: boolean;
  reportPath: string;
}

export class ExecutionEngine {

  run(options: ExecutionOptions = {}): ExecutionResult {
    const {
      testFile = "",
      project = "",
      reporter = "json",
    } = options;

    const parts: string[] = ["npx playwright test"];
    if (testFile) parts.push(testFile);
    if (project) parts.push(`--project=${project}`);
    parts.push(`--reporter=${reporter}`);

    const command = parts.join(" ");
    const reportPath = "playwright-report/results.json";

    console.log(`Running: ${command}`);

    let exitCode = 0;
    try {
      execSync(command, { stdio: "inherit" });
    } catch (err: unknown) {
      exitCode = (err as { status?: number }).status ?? 1;
    }

    return {
      exitCode,
      passed: exitCode === 0,
      reportPath,
    };
  }
}
