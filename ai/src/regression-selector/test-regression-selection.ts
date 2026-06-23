import type {
  RegressionSelection
} from "./RegressionSelection.js";

const result: RegressionSelection = {
  changedFiles: [
    "AuthService.ts",
    "LoginController.ts"
  ],

  impactedFeatures: [
    "Login",
    "Authentication"
  ],

  recommendedTests: [
    "Login Tests",
    "Authentication Tests"
  ],

  reasoning:
    "Authentication related files changed."
};

console.log(result);