import type { LLMProvider } from "../../../llm/src/interfaces/LLMProvider.js";
import type { TestData } from "../models/TestData.js";
import { AIJsonParser }
    from "../utils/AIJsonParser.js";
export class TestDataGenerator {
    constructor(private llmProvider: LLMProvider) { }

    async generate(
        requirement: string
    ): Promise<TestData> {

        const prompt = `
You are a QA Test Data Generator.

Generate ONLY test data.

DO NOT generate test cases.
DO NOT generate explanations.
DO NOT generate arrays.
DO NOT generate descriptions.

Return ONLY valid JSON in this exact format:

{
  "validUsername": "string",
  "validPassword": "string",
  "invalidUsername": "string",
  "invalidPassword": "string"
}

Requirement:
${requirement}
`;

        const response =
            await this.llmProvider.generateResponse(prompt);

        console.log("Raw AI Response:");
        console.log(response);

        return AIJsonParser.parse<TestData>(response);
    }
}