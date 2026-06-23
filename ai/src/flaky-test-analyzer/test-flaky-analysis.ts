import type {
  FlakyTestAnalysis
} from "./FlakyTestAnalysis.js";

const result: FlakyTestAnalysis = {
  testName: "login.spec.ts",

  flakyProbability: 85,

  possibleCauses: [
    "Timing issue",
    "Network dependency"
  ],

  recommendation:
    "Add proper waits and mock network calls."
};

console.log(result);