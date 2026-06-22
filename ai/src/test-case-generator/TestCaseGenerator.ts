import type { LLMProvider } from "../../../llm/src/interfaces/LLMProvider.js";
import type { TestCase } from "../models/TestCase.js";
export class TestCaseGenerator {
  constructor(private llmProvider: LLMProvider) { }

  async generate(requirement: string): Promise<TestCase[]> {
    const prompt = `
You are a Senior QA Engineer.

Generate a comprehensive regression suite for the requirement.
Avoid duplicate scenarios.

Rules:
- Generate between 5 and 10 meaningful test cases.
- Include positive scenarios.
- Include negative scenarios.
- Include validation scenarios.
- Include edge cases where applicable.
- Return ONLY valid JSON.
- Do NOT return markdown.
- Do NOT return explanations.

Structure:

[
  {
    "id": "TC_001",
    "title": "",
    "preconditions": [],
    "steps": [],
    "expectedResult": ""
  }
]

Requirement:
${requirement}
`;

    const response =
      await this.llmProvider.generateResponse(prompt);

    console.log("Raw AI Response:");
    console.log(response);

    const cleanedResponse = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    if (!cleanedResponse.trim().endsWith("]")) {
      console.log(cleanedResponse);

      throw new Error(
        "AI response appears truncated"
      );
    }
    return JSON.parse(cleanedResponse);
  }
}