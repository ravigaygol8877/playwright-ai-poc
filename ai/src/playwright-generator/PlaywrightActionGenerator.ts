import type { LLMProvider } from "../../../llm/src/interfaces/LLMProvider.js";

export class PlaywrightActionGenerator {
  constructor(
    private llmProvider: LLMProvider
  ) {}

  async generateAction(
    step: string,
    knowledgeBase: any
  ): Promise<string> {

    const prompt = `
You are a Senior Playwright Automation Engineer.

Application Knowledge:

${JSON.stringify(knowledgeBase, null, 2)}

Available Test Data Variables:

- testData.validUsername
- testData.validPassword
- testData.invalidUsername
- testData.invalidPassword

Convert the following test step into ONE executable Playwright statement.

STRICT RULES:

1. Use ONLY selectors from:
   knowledgeBase.selectors

2. Use ONLY URLs from:
   knowledgeBase.url

3. Never invent selectors.

4. Never invent variables.

5. Never generate:
   'validUsername'
   'validPassword'
   'invalidUsername'
   'invalidPassword'

6. Instead use:
   testData.validUsername
   testData.validPassword
   testData.invalidUsername
   testData.invalidPassword

7. Return ONLY ONE Playwright statement.

8. Do NOT return markdown.

9. Do NOT return explanations.

10. Do NOT use code fences.

Examples:

Step:
Navigate to login page

Output:
await page.goto('https://example.com/login');

Step:
Enter a valid username

Output:
await page.fill('#username', testData.validUsername);

Step:
Enter an invalid username

Output:
await page.fill('#username', testData.invalidUsername);

Step:
Enter a valid password

Output:
await page.fill('#password', testData.validPassword);

Step:
Enter an invalid password

Output:
await page.fill('#password', testData.invalidPassword);

Step:
Click the login button

Output:
await page.click('#login');

Test Step:
${step}
`;

    const response =
      await this.llmProvider.generateResponse(prompt);

    return response
      .replace(/```typescript/g, "")
      .replace(/```ts/g, "")
      .replace(/```javascript/g, "")
      .replace(/```/g, "")
      .trim();
  }
}