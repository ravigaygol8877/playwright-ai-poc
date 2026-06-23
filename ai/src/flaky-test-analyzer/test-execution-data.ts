import type {
  TestExecutionData
} from "./TestExecutionData.js";

const execution: TestExecutionData = {
  testName: "login.spec.ts",

  retryCount: 3,

  duration: 45000,

  failureMessage:
    "Timeout 30000ms exceeded"
};

console.log(execution);