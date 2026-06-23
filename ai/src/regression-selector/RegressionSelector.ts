import type { LLMProvider }
    from "../../../llm/src/interfaces/LLMProvider.js";

import { TestCatalogService }
    from "../../../knowledge-base/TestCatalogService.js";

import { AIJsonParser }
    from "../utils/AIJsonParser.js";

import type { RegressionSelection }
    from "./RegressionSelection.js";

export class RegressionSelector {

    constructor(
        private llmProvider: LLMProvider
    ) { }

    async analyze(
        changedFiles: string[],
    ): Promise<RegressionSelection> {

        const catalogService =
            new TestCatalogService();

        const availableSuites =
            catalogService.load();

        const prompt = `
You are a QA impact analysis expert.

Analyze the changed files.

Available Test Suites:

${availableSuites.join("\n")}

Rules:

- Recommend ONLY test suites from the available list
- Do NOT invent new suites
- Return ONLY JSON

Return format:

{
  "changedFiles": [],
  "impactedFeatures": [],
  "recommendedTests": [],
  "reasoning": ""
}

Changed Files:

${JSON.stringify(changedFiles, null, 2)}
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

        const result =
            AIJsonParser.parse<any>(response);

        result.recommendedTests =
            result.recommendedTests.filter(
                (suite: string) =>
                    availableSuites.includes(suite)
            );
        return result;

    }
}