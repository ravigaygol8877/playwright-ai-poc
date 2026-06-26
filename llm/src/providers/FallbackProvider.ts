import type { LLMProvider } from "../interfaces/LLMProvider.js";

interface ProviderEntry {
  name:     string;
  provider: LLMProvider;
}

/**
 * Returns true for errors that indicate the provider is permanently unavailable
 * for this run (quota exhausted, no credits, bad key, server offline).
 * These should NOT be retried — fail fast and switch to the next provider.
 *
 * Transient errors (temp rate-limit, 503, timeout) are NOT caught here;
 * the inner provider already handles those with its own retry + backoff.
 */
function isFatalForProvider(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes("resource_exhausted")           ||  // Gemini quota
    msg.includes("you exceeded your current quota") || // Gemini quota
    msg.includes("insufficient credits")          ||  // OpenRouter billing
    msg.includes("insufficient balance")          ||  // OpenRouter billing
    msg.includes("payment required")              ||  // 402
    msg.includes("econnrefused")                  ||  // LM Studio not running
    msg.includes("invalid api key")               ||  // bad key
    msg.includes("unauthorized")                  ||  // 401
    msg.includes("daily limit")                   ||  // various providers
    msg.includes("daily quota")                   ||  // various providers
    msg.includes("quota has been exceeded")       ||  // GitHub Models
    msg.includes("all llm providers")                 // nested FallbackProvider
  );
}

export class FallbackProvider implements LLMProvider {
  /**
   * Persists across calls — once we advance to a working provider we stay there,
   * so the pipeline doesn't re-try dead providers on every LLM call.
   */
  private activeIndex = 0;

  constructor(private readonly chain: ProviderEntry[]) {
    if (chain.length === 0) {
      throw new Error("FallbackProvider: chain must contain at least one provider.");
    }
    console.log(`  Fallback chain : ${chain.map(e => e.name).join(" → ")}`);
  }

  async generateResponse(prompt: string): Promise<string> {
    const errors: string[] = [];

    for (let i = this.activeIndex; i < this.chain.length; i++) {
      const { name, provider } = this.chain[i]!;

      try {
        const result = await provider.generateResponse(prompt);

        // Permanently advance the cursor if we moved forward this call.
        if (i > this.activeIndex) {
          console.log(`\n  ✅  Switched to provider: ${name} (all further calls will use this)\n`);
          this.activeIndex = i;
        }
        return result;

      } catch (error) {
        const msg   = error instanceof Error ? error.message : String(error);
        const fatal = isFatalForProvider(msg);
        const tag   = fatal ? "quota/auth exhausted" : "failed after retries";

        console.warn(`  ⚡  [${name}] ${tag} — trying next provider`);
        errors.push(`[${name}] ${msg.slice(0, 150)}`);

        // Move the permanent cursor so future calls skip this dead provider.
        this.activeIndex = i + 1;
      }
    }

    throw new Error(
      `All LLM providers in the fallback chain failed:\n` +
      errors.map(e => `  • ${e}`).join("\n")
    );
  }
}
