import type { LLMProvider }
from "../../../llm/src/interfaces/LLMProvider.js";

import type { LocatorFailure }
from "./LocatorFailure.js";

import type { LocatorHealingResult }
from "./LocatorHealingResult.js";

import { AIJsonParser }
from "../utils/AIJsonParser.js";

export class SelfHealingLocatorEngine {

  constructor(
    private llmProvider: LLMProvider
  ) {}

  async heal(
    failure: LocatorFailure,
    knowledgeBase: any
  ): Promise<LocatorHealingResult> {

    const prompt = `
You are a Playwright locator healing expert.

Application Knowledge:

${JSON.stringify(knowledgeBase, null, 2)}

Failed Locator:

${JSON.stringify(failure, null, 2)}

Rules:

- Use ONLY selectors from the knowledge base
- Do NOT invent selectors
- Return ONLY JSON

Example:

{
  "originalLocator": "#loginBtn",
  "healedLocator": "#login",
  "confidence": 92,
  "reasoning":
    "Matching login button found in knowledge base."
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