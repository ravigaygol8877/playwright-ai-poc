import type { LLMProvider }
from "../../../llm/src/interfaces/LLMProvider.js";

import type { CoverageAnalysisInput }
from "./CoverageAnalysisInput.js";

import type { CoverageAnalysisResult }
from "./CoverageAnalysisResult.js";

import { AIJsonParser }
from "../utils/AIJsonParser.js";

export class CoverageAnalyzer {

  constructor(
    private llmProvider: LLMProvider
  ) {}

  async analyze(
    input: CoverageAnalysisInput
  ): Promise<CoverageAnalysisResult> {

    const prompt = `
You are a Senior QA Architect.

Analyze test coverage.

Requirements:
${JSON.stringify(input.requirements, null, 2)}

Existing Tests:
${JSON.stringify(input.existingTests, null, 2)}

Return ONLY JSON.

Example:

{
  "coveredRequirements": [
    "User can login"
  ],
  "missingCoverage": [
    "User can update profile"
  ],
  "coveragePercentage": 50,
  "recommendation": "Create User Profile Tests"
}
`;

    const response =
      await this.llmProvider.generateResponse(
        prompt
      );

    const result =
      AIJsonParser.parse<CoverageAnalysisResult>(
        response
      );

    if (
      result.coveragePercentage < 0 ||
      result.coveragePercentage > 100
    ) {
      throw new Error(
        `Invalid coverage percentage: ${result.coveragePercentage}`
      );
    }

    if (
      !result.coveredRequirements ||
      !result.missingCoverage ||
      !result.recommendation
    ) {
      throw new Error(
        "Incomplete coverage analysis result"
      );
    }

    return result;
  }
}