export interface FailureAnalysisInput {
  testName: string;

  failureMessage: string;

  stackTrace: string;

  executionLog: string;
}