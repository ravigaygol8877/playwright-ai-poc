import type {
  LocatorHealingResult
} from "./LocatorHealingResult.js";

const result: LocatorHealingResult = {
  originalLocator: "#loginBtn",

  healedLocator: "#login",

  confidence: 92,

  reasoning:
    "Matching login button found in knowledge base."
};

console.log(result);