import type { LLMProvider } from "../../providers/interfaces/LLMProvider.js";
import type { TestData } from "../../models/TestData.js";
import type { KnowledgeBase } from "../../models/KnowledgeBase.js";
import { AIJsonParser }
    from "../../utils/AIJsonParser.js";
export class TestDataGenerator {
    constructor(private llmProvider: LLMProvider) { }

    async generate(
        requirement: string,
        kb?: KnowledgeBase,
    ): Promise<TestData> {

        const pageFields = kb
          ? Object.keys(kb.selectors ?? {})
              .filter(k => !/button|submit|link/i.test(k))
              .map(k => `  "${k}": "<realistic value for the ${k} field>"`)
              .join(',\n')
          : '';

        const kbSection = pageFields
          ? `\nAlso include these page-specific fields with realistic values (replace the placeholder text):\n{\n${pageFields}\n}\n`
          : '';

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
${kbSection}
Requirement:
${requirement}
`;

        const response = await this.llmProvider.generateResponse(prompt);
        return AIJsonParser.parse<TestData>(response);
    }
}