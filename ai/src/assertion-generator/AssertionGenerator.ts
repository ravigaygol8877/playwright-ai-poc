import type { LLMProvider } from "../../../llm/src/interfaces/LLMProvider.js";

export class AssertionGenerator {
  constructor(
    private llmProvider: LLMProvider
  ) {}

  async generateAssertion(
    expectedResult: string,
    knowledgeBase: any
  ): Promise<string> {

    const messageLines = knowledgeBase.messages
      ? Object.entries(knowledgeBase.messages as Record<string, string>)
          .map(([, v]) => `  "${v}"`)
          .join("\n")
      : "  (none)";

    const selectorLines = knowledgeBase.selectors
      ? Object.entries(knowledgeBase.selectors as Record<string, string>)
          .map(([k, v]) => `  ${k} → ${v}`)
          .join("\n")
      : "  (none)";

    const successInfo = knowledgeBase.success as Record<string, string> | undefined;
    const redirectUrl = successInfo?.redirectUrl ?? "";
    const landmarkText = successInfo?.landmarkText ?? successInfo?.completionText ?? "";

    const prompt = `
You are a Senior Playwright Automation Engineer writing ONLY the assertion part of a test.

EXACT ERROR/STATUS MESSAGES (copy these verbatim — never paraphrase or invent your own):
${messageLines}

AVAILABLE SELECTORS (format: "name → css-selector"):
Use the css-selector string on the right in page.locator("..."). NEVER use the name on the left as a variable.
${selectorLines}

SUCCESS: redirectUrl=${redirectUrl}, landmarkText=${landmarkText}

RULES — follow exactly:
1. Return ONLY \`await expect(...)\` lines — NOTHING ELSE.
2. NEVER generate page.fill(), page.click(), page.goto(), page.waitForURL() or any non-expect line.
3. NEVER reference any variable name like SELECTORS, MESSAGES, KB, or knowledgeBase. Always inline the literal string.
4. For error messages: await expect(page.getByText('exact message from the list above')).toBeVisible();
5. For successful redirect: await expect(page).toHaveURL(/${redirectUrl}/);
6. For a landmark text after success: await expect(page.getByText('${landmarkText}')).toBeVisible();
7. For element text: await expect(page.locator("css-selector-from-list")).toHaveText('exact text');
8. Return at most 2 assertions — pick the single most meaningful one unless two are essential.
9. Do NOT assert multiple errors if the app shows only one error at a time.
10. Do NOT join assertions with a comma. Each \`await expect\` on its own line.
11. Do NOT add comments or explanations.

Convert this expected result into 1–2 Playwright expect() assertions:
${expectedResult}
`;

    const response =
      await this.llmProvider.generateResponse(prompt);

    const cleaned = response
      .replace(/```typescript/g, "")
      .replace(/```ts/g, "")
      .replace(/```javascript/g, "")
      .replace(/```/g, "")
      .trim();

    // Guard: split any comma-chained await expressions onto separate lines
    return cleaned
      .split(/,\s*(?=await\s)/)
      .map(s => s.trim())
      .join("\n");
  }
}