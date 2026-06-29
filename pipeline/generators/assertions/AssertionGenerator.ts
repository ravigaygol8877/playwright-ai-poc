import type { LLMProvider }    from "../../providers/interfaces/LLMProvider.js";
import type { KnowledgeBase }  from "../../models/KnowledgeBase.js";
import { SelectorRetriever }   from "../../kb/SelectorRetriever.js";

/**
 * Converts a plain-English expected-result string into one or two `await expect(…)` lines.
 *
 * Uses the Knowledge Base to ground assertions in real selectors and messages rather
 * than letting the LLM invent locators. The output is a ready-to-paste Playwright
 * assertion block with no surrounding boilerplate.
 */
export class AssertionGenerator {
  private readonly retriever = new SelectorRetriever();

  constructor(
    private llmProvider: LLMProvider
  ) {}

  /**
   * Generate 1–2 `await expect(…)` assertions for the given expected result.
   *
   * @param expectedResult - Human-readable description of what should be true after the action.
   * @param knowledgeBase  - Page KB supplying real selectors, messages, and success conditions.
   * @returns Newline-separated `await expect(…)` lines, ready to insert into a test body.
   */
  async generateAssertion(
    expectedResult: string,
    knowledgeBase: KnowledgeBase,
  ): Promise<string> {

    // Retrieve only selectors relevant to what this assertion needs to verify
    const ctx = this.retriever.retrieve(expectedResult, knowledgeBase, 8);

    const messageLines = Object.keys(ctx.messages).length > 0
      ? Object.entries(ctx.messages)
          .map(([, v]) => `  "${v}"`)
          .join("\n")
      : "  (none)";

    const selectorLines = Object.entries(ctx.selectors)
      .map(([k, v]) => `  ${k} → ${v}`)
      .join("\n") || "  (none)";

    const redirectUrl  = knowledgeBase.success?.redirectUrl ?? "";
    const landmarkText = knowledgeBase.success?.landmarkText ?? knowledgeBase.success?.completionText ?? "";

    const redirectRule = redirectUrl
      ? `5. For successful redirect: await expect(page).toHaveURL(/${redirectUrl}/);`
      : `5. (no redirect URL configured — omit toHaveURL assertions)`;

    const prompt = `
You are a Senior Playwright Automation Engineer writing ONLY the assertion part of a test.

EXACT ERROR/STATUS MESSAGES (copy these verbatim — never paraphrase or invent your own):
${messageLines}

AVAILABLE SELECTORS (format: "name → css-selector"):
Use the css-selector string on the right in page.locator('...'). NEVER use the name on the left as a variable.
${selectorLines}

SUCCESS: redirectUrl=${redirectUrl || "(none)"}, landmarkText=${landmarkText || "(none)"}

RULES — follow exactly:
1. Return ONLY \`await expect(...)\` lines — NOTHING ELSE.
2. NEVER generate page.fill(), page.click(), page.goto(), page.waitForURL() or any non-expect line.
3. NEVER reference any variable name like SELECTORS, MESSAGES, KB, or knowledgeBase. Always inline the literal string.
4. For error messages: await expect(page.getByText('exact message from the list above')).toBeVisible();
${redirectRule}
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
    // Strip leading ( that LLMs sometimes wrap around the expression
    return cleaned
      .split(/,\s*(?=await\s)/)
      .map(s => s.trim().replace(/^\(+(await\s)/, '$1'))
      .join("\n");
  }
}