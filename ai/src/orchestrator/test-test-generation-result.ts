import type {
  TestGenerationResult
} from "./TestGenerationResult.js";

const result: TestGenerationResult = {
  testCases: [],
  testData: {
    validUsername: "user123",
    validPassword: "Passw0rd!",
    invalidUsername: "badUser",
    invalidPassword: "123"
  },
  generatedScript: "login.spec.ts"
};

console.log(result);