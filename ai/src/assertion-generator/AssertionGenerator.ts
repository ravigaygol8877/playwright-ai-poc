import type { LLMProvider } from "../../../llm/src/interfaces/LLMProvider.js";

export class AssertionGenerator {
  constructor(
    private llmProvider: LLMProvider
  ) {}

  async generateAssertion(
    expectedResult: string,
    knowledgeBase: any
  ): Promise<string> {

    const prompt = `
You are a Senior Playwright Automation Engineer.

Application Knowledge:

${JSON.stringify(knowledgeBase, null, 2)}

Convert the expected result into ONE Playwright assertion.

STRICT RULES:

1. Use ONLY values from the knowledge base.

2. Never generate:
   messages.invalidLogin
   page.success
   page.url
   knowledgeBase.success

3. Never invent variables.

4. If invalid login message is needed use:

'Invalid username or password'

5. If redirect validation is needed use:

await expect(page).toHaveURL(/dashboard/);

6. If username required validation is needed use:

await expect(
  page.locator('text=Username is required')
).toBeVisible();

7. If password required validation is needed use:

await expect(
  page.locator('text=Password is required')
).toBeVisible();

8. Return ONLY executable Playwright code.

9. Do NOT return markdown.

10. Do NOT return explanations.

11. Return a single assertion statement.

Expected Result:
${expectedResult}
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