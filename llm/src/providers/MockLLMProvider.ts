import type { LLMProvider } from "../interfaces/LLMProvider.js";

export class MockLLMProvider implements LLMProvider {
  async generateResponse(prompt: string): Promise<string> {
    return `Mock AI Response: ${prompt}`;
  }
}