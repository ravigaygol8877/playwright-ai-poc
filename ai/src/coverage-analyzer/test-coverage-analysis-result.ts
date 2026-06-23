import type {
  CoverageAnalysisResult
} from "./CoverageAnalysisResult.js";

const result: CoverageAnalysisResult = {
  coveredRequirements: [
    "User can login",
    "User can reset password"
  ],

  missingCoverage: [
    "User can update profile"
  ],

  coveragePercentage: 66,

  recommendation:
    "Create User Profile Tests"
};

console.log(result);