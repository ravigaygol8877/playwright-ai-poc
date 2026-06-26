export interface TestExecutionData {
  testName: string;

  retryCount: number;

  duration: number;

  failureMessage: string;
}