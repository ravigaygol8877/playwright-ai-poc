import OpenAI from "openai";
import type { LLMProvider } from "../interfaces/LLMProvider.js";

export class OpenRouterProvider implements LLMProvider {
    private client: OpenAI;

    constructor(apiKey: string) {
        this.client = new OpenAI({
            apiKey,
            baseURL: "https://openrouter.ai/api/v1",
        });
    }

    async generateResponse(prompt: string): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: "openai/gpt-4.1-mini",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            max_tokens: 5000,
            temperature: 0.3,
        });

        return response.choices[0]?.message?.content || "No response";
    }
}