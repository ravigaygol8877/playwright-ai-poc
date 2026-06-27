import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider } from "./interfaces/LLMProvider.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const DEFAULT_MODEL = "gemini-2.0-flash";

export class GeminiProvider implements LLMProvider {
    private genAI: GoogleGenerativeAI;
    private model: string;

    constructor(apiKey: string, model?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = model ?? DEFAULT_MODEL;
    }

    async generateResponse(prompt: string): Promise<string> {
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const geminiModel = this.genAI.getGenerativeModel({
                    model: this.model,
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 8192,
                    },
                });

                const result = await geminiModel.generateContent(prompt);
                return result.response.text();

            } catch (error) {
                lastError = error as Error;

                if (!this.isRetryable(error) || attempt === MAX_RETRIES) break;

                // Respect Gemini's retryDelay from 429 responses (e.g. "Please retry in 26s")
                const retryAfterMs = this.extractRetryDelay(lastError);
                const delay = retryAfterMs || BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(
                    `LLM attempt ${attempt} failed (rate limit). Retrying in ${Math.round(delay / 1000)}s...`
                );
                await this.sleep(delay);
            }
        }

        throw new Error(
            `LLM request failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
        );
    }

    private extractRetryDelay(error: Error): number {
        // Gemini 429 messages include: 'Please retry in 26.1s' or 'retryDelay":"26s"'
        const secMatch = error.message.match(/retry[^0-9]*(\d+(?:\.\d+)?)\s*s/i);
        if (secMatch?.[1]) return Math.ceil(parseFloat(secMatch[1])) * 1000 + 500;
        return 0;
    }

    private isRetryable(error: unknown): boolean {
        if (!(error instanceof Error)) return false;
        const msg = error.message.toLowerCase();
        // "quota" alone is NOT retryable — quota exhaustion is fatal (switch provider).
        // Only retry on transient 429 rate-limits (they include a retry-after delay).
        if (msg.includes("resource_exhausted") || msg.includes("exceeded your current quota")) {
            return false;
        }
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
