import type { LLMProvider }
from "../../providers/interfaces/LLMProvider.js";

import { AIJsonParser }
from "../../utils/AIJsonParser.js";

import type { TestExecutionData }
from "./TestExecutionData.js";

import type { FlakyTestAnalysis }
from "./FlakyTestAnalysis.js";

export class FlakyTestAnalyzer {

  constructor(
    private llmProvider: LLMProvider
  ) {}

  async analyze(
    executionData: TestExecutionData
  ): Promise<FlakyTestAnalysis> {

    const prompt = `
You are a Senior QA Automation Architect.

Analyze the test execution data.

Determine:

1. Flaky probability (0-100)
2. Possible causes
3. Recommendation

Return ONLY JSON.

Example:

{
  "testName": "login.spec.ts",
  "flakyProbability": 85,
  "possibleCauses": [
    "Timing issue",
    "Network dependency"
  ],
  "recommendation":
    "Replace fixed waits with locator assertions."
}

Execution Data:

${JSON.stringify(executionData, null, 2)}
`;

    const response =
      await this.llmProvider.generateResponse(
        prompt
      );

    const cleaned =
      response
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    return AIJsonParser.parse(response);
  }
}