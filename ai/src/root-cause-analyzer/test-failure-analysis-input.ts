import type {
  FailureAnalysisInput
} from "./FailureAnalysisInput.js";

const input: FailureAnalysisInput = {
  testName: "login.spec.ts",
  failureMessage:
    "Timeout 30000ms exceeded",

  stackTrace:
    "locator.click timeout",

  executionLog:
    "Waiting for login button"
};

console.log(input);