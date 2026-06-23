import type {
  CoverageAnalysisInput
} from "./CoverageAnalysisInput.js";

const input: CoverageAnalysisInput = {
  requirements: [
    "User can login",
    "User can reset password",
    "User can update profile"
  ],

  existingTests: [
    "Login Tests",
    "Password Reset Tests"
  ]
};

console.log(input);