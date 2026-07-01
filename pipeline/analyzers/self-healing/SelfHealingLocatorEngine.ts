import type { LLMProvider }
from "../../providers/interfaces/LLMProvider.js";

import type { LocatorFailure }
from "./LocatorFailure.js";

import type { LocatorHealingResult }
from "./LocatorHealingResult.js";

import type { KnowledgeBase }
from "../../models/KnowledgeBase.js";

import { AIJsonParser }
from "../../utils/AIJsonParser.js";

export class SelfHealingLocatorEngine {

  constructor(
    private llmProvider: LLMProvider
  ) {}

  async heal(
    failure: LocatorFailure,
    knowledgeBase: KnowledgeBase
  ): Promise<LocatorHealingResult> {

    // Detect if KB is minimal (from workaround - no real selectors)
    const hasRealSelectors = Object.keys(knowledgeBase.selectors || {}).length > 0;
    const hasMessages = Object.keys(knowledgeBase.messages || {}).length > 0;

    // For text= locators, look up the correct message in KB first (no AI call needed)
    if (failure.failedLocator.startsWith("text=") && hasMessages) {
      const textValue = failure.failedLocator.slice(5);
      const messages = knowledgeBase.messages!;
      for (const [, msgValue] of Object.entries(messages)) {
        if (msgValue === textValue) {
          // Message exists in KB — locator is correct, may be a flaky test
          return {
            originalLocator: failure.failedLocator,
            healedLocator: failure.failedLocator,
            confidence: 50,
            reasoning: "Text message found in KB — locator may be correct, test may be flaky.",
          };
        }
      }
      // Text not in KB — use AI to suggest the updated text/selector
    }

    const selectorRules = hasRealSelectors
      ? `- Use ONLY selectors from the knowledge base selectors or messages sections
- For text= locators, return the updated text value prefixed with "text="
- For element locators, return a CSS selector`
      : `- Generate realistic Playwright selectors based on common patterns
- Prefer: data-testid > role-based > CSS class > text content > xpath
- Use logical, stable selectors that won't break easily`;

    const alternativesSection = failure.alternatives && failure.alternatives.length > 0
      ? `\nCandidate Alternative Selectors (pre-generated, use if appropriate):\n${failure.alternatives.map(a => `  - ${a}`).join("\n")}`
      : "";

    const prompt = `
You are a Playwright locator healing expert.

Application Context:
- Page: ${knowledgeBase.pageName}
- URL: ${knowledgeBase.url}
${hasRealSelectors ? `\nKnown Selectors:\n${JSON.stringify(knowledgeBase.selectors, null, 2)}` : ""}
${hasMessages ? `\nKnown Messages:\n${JSON.stringify(knowledgeBase.messages, null, 2)}` : ""}
${!hasRealSelectors && !hasMessages ? "\nNote: No knowledge base available. Generate new selectors using best practices." : ""}
${alternativesSection}

Failed Locator:
${JSON.stringify(failure, null, 2)}

Rules:
${selectorRules}
- Return ONLY valid JSON, no markdown
- Ensure healedLocator is a non-empty string
- For "text=" locators: if the text changed, return "text=<new text>"; if an element selector is better, return that

Example Response:
{
  "originalLocator": "text=Please enter valid amount.",
  "healedLocator": "text=Please enter a valid amount.",
  "confidence": 90,
  "reasoning": "Updated text matches the known message in knowledge base"
}
`;

    const response =
      await this.llmProvider.generateResponse(
        prompt
      );

    return AIJsonParser.parse<
      LocatorHealingResult
    >(response);
  }
}