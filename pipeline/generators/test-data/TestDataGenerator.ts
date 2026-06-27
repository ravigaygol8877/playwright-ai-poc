import type { LLMProvider } from "../../providers/interfaces/LLMProvider.js";
import type { TestData } from "../../models/TestData.js";
import { AIJsonParser }
    from "../../utils/AIJsonParser.js";
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
  "validUsername": "a realistic valid username",
  "validPassword": "a realistic valid password with mixed characters",
  "invalidUsername": "a username containing special characters that fail validation",
  "invalidPassword": "a password too short to pass validation",
  "overMaxLengthUsername": "a username string longer than 50 characters",
  "uppercaseUsername": "the validUsername value converted to all uppercase",
  "firstName": "a realistic first name for a test user",
  "lastName": "a realistic last name for a test user",
  "postalCode": "a realistic valid 5-digit US postal code",
  "invalidPostalCode": "a non-numeric string that fails postal code validation",
  "lockedOutUsername": "locked_out_user"
}

Requirement:
${requirement}
`;

        const response = await this.llmProvider.generateResponse(prompt);
        return AIJsonParser.parse<TestData>(response);
    }
}