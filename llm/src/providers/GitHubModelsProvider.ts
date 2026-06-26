import OpenAI from "openai";
import type { LLMProvider } from "../interfaces/LLMProvider.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const DEFAULT_MODEL = "gpt-4.1";

export class GitHubModelsProvider implements LLMProvider {
    private client: OpenAI;
    private model: string;

    constructor(token: string, model?: string) {
        this.client = new OpenAI({
            apiKey: token,
            baseURL: "https://models.inference.ai.azure.com",
            timeout: 120_000,
        });
        this.model = model ?? DEFAULT_MODEL;
    }

    async generateResponse(prompt: string): Promise<string> {
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await this.client.chat.completions.create({
                    model: this.model,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
                });

                return response.choices[0]?.message?.content ?? "";

            } catch (error) {
                lastError = error as Error;

                if (!this.isRetryable(error) || attempt === MAX_RETRIES) break;

                const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(
                    `LLM attempt ${attempt} failed (${lastError.message}). Retrying in ${delay}ms...`
                );
                await this.sleep(delay);
            }
        }

        throw new Error(
            `LLM request failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
        );
    }

    private isRetryable(error: unknown): boolean {
        if (!(error instanceof Error)) return false;
        const msg = error.message.toLowerCase();
        return (
            msg.includes("429") ||
            msg.includes("rate limit") ||
            msg.includes("503") ||
            msg.includes("timeout") ||
            msg.includes("econnreset") ||
            msg.includes("network")
        );
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
