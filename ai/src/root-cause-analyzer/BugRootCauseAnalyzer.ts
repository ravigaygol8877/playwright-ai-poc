import type { LLMProvider }
from "../../../llm/src/interfaces/LLMProvider.js";

import type { FailureAnalysisInput }
from "./FailureAnalysisInput.js";

import type { RootCauseAnalysisResult }
from "./RootCauseAnalysisResult.js";

import { AIJsonParser }
from "../utils/AIJsonParser.js";

export class BugRootCauseAnalyzer {

  constructor(
    private llmProvider: LLMProvider
  ) {}

  async analyze(
    input: FailureAnalysisInput
  ): Promise<RootCauseAnalysisResult> {

    const prompt = `
You are a Senior QA Automation Architect.

Analyze the test failure and determine:

1. Failure Type
2. Probable Root Cause
3. Impacted Component
4. Recommendation
5. Confidence Score

Rules:
- Return ONLY JSON
- Confidence must be between 0 and 100
- Be concise and practical
- Do NOT return markdown
- Do NOT use code fences

Example:

{
  "failureType": "Timeout",
  "probableCause": "Element loaded after API response",
  "impactedComponent": "Login Page",
  "recommendation": "Replace fixed waits with locator assertions",
  "confidence": 88
}

Failure Details:

${JSON.stringify(input, null, 2)}
`;

    const response =
      await this.llmProvider.generateResponse(
        prompt
      );

    const result =
      AIJsonParser.parse<RootCauseAnalysisResult>(
        response
      );

    if (
      result.confidence < 0 ||
      result.confidence > 100
    ) {
      throw new Error(
        `Invalid confidence score: ${result.confidence}`
      );
    }

    if (
      !result.failureType ||
      !result.probableCause ||
      !result.impactedComponent ||
      !result.recommendation
    ) {
      throw new Error(
        "Incomplete root cause analysis result"
      );
    }

    return result;
  }
}