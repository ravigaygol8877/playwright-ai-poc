import type { LLMProvider } from "../../../llm/src/interfaces/LLMProvider.js";

export class AIPlaywrightGenerator {
  constructor(private llmProvider: LLMProvider) {}

  async generateAction(step: string): Promise<string> {
    const prompt = `
Convert the following test step into a Playwright TypeScript action.

Rules:
- Return ONLY Playwright code.
- No markdown.
- No explanation.
- One action only.

Test Step:
${step}
`;

    return await this.llmProvider.generateResponse(prompt);
  }
}