import type {
  RootCauseAnalysisResult
} from "./RootCauseAnalysisResult.js";

const result: RootCauseAnalysisResult = {
  failureType: "Timeout",

  probableCause:
    "Element loaded after API response",

  impactedComponent:
    "Login Page",

  recommendation:
    "Replace fixed waits with locator assertions",

  confidence: 88
};

console.log(result);