/**
 * LMStudioProvider
 *
 * Connects to a locally-running LM Studio server.
 * LM Studio exposes an OpenAI-compatible API at http://localhost:1234/v1
 * so any model loaded in LM Studio works with this provider — no API key needed.
 *
 * Setup:
 *   1. Open LM Studio → Local Server tab → Start Server
 *   2. Load any model (e.g. Gemma 4 4B)
 *   3. Set in .env:
 *        LLM_PROVIDER=lm-studio
 *        LM_STUDIO_URL=http://localhost:1234   (optional — this is the default)
 *        MODEL=gemma-4-4b                      (optional — defaults to whatever is loaded)
 */

import OpenAI from "openai";
import type { LLMProvider } from "../interfaces/LLMProvider.js";

const MAX_RETRIES   = 3;
const BASE_DELAY_MS = 1_500;

export class LMStudioProvider implements LLMProvider {
  private client: OpenAI;
  private model:  string;

  constructor(model?: string, baseUrl?: string) {
    const url = (baseUrl ?? process.env["LM_STUDIO_URL"] ?? "http://localhost:1234").replace(/\/$/, "");
    this.client = new OpenAI({
      apiKey:  "lm-studio",          // LM Studio ignores the key — any non-empty string works
      baseURL: `${url}/v1`,
      timeout: 600_000,              // local inference can be slow on CPU — allow up to 10 min per call
    });
    // If no model specified, pass an empty string — LM Studio uses whichever model is loaded
    this.model = model ?? "";
    console.log(`  LM Studio   : ${url}`);
    console.log(`  Model       : ${this.model || "(currently loaded model)"}`);
  }

  async generateResponse(prompt: string): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
          model:       this.model || "local-model",
          messages:    [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens:  8192,   // LM Studio defaults to ~512 which truncates JSON mid-object
        };

        const response = await this.client.chat.completions.create(params);
        return response.choices[0]?.message?.content ?? "";

      } catch (error) {
        lastError = error as Error;

        if (!this.isRetryable(error) || attempt === MAX_RETRIES) break;

        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `  LM Studio attempt ${attempt} failed: ${lastError.message}. Retrying in ${Math.round(delay / 1000)}s...`,
        );
        await this.sleep(delay);
      }
    }

    throw new Error(
      `LLM request failed after ${MAX_RETRIES} attempts: ${lastError?.message}\n` +
      `  Make sure LM Studio is running with a model loaded (Local Server tab → Start Server).`,
    );
  }

  private isRetryable(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return (
      msg.includes("econnrefused") ||
      msg.includes("econnreset")   ||
      msg.includes("timeout")      ||
      msg.includes("network")      ||
      msg.includes("503")          ||
      msg.includes("429")
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
