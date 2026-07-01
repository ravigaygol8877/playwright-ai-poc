import type { LLMProvider } from "./interfaces/LLMProvider.js";

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

/**
 * Auto-switching fallback chain over multiple LLMProviders.
 *
 * Tries each provider in order; when one fails fatally (quota, bad key, offline) it
 * permanently advances the cursor so all subsequent calls skip dead providers without
 * retrying them. Transient failures (rate-limit, 503) are handled by the inner provider
 * before the cursor moves. Wraps any set of LLMProvider implementations transparently.
 *
 * @example
 *   const provider = new FallbackProvider([
 *     { name: "gemini", provider: geminiInstance },
 *     { name: "github-models", provider: githubModelsInstance },
 *   ]);
 */
/** Open the circuit after this many consecutive failures on one provider. */
const CIRCUIT_BREAKER_THRESHOLD = 5;

/** Maximum ms to wait for a single provider before treating it as a fatal hang. */
const PROVIDER_TIMEOUT_MS = 30_000;

export class FallbackProvider implements LLMProvider {
  /**
   * Persists across calls — once we advance to a working provider we stay there,
   * so the pipeline doesn't re-try dead providers on every LLM call.
   */
  private activeIndex        = 0;
  /** Consecutive failures on the current active provider; resets on success or switch. */
  private consecutiveFailures = 0;

  constructor(private readonly chain: ProviderEntry[]) {
    if (chain.length === 0) {
      throw new Error("FallbackProvider: chain must contain at least one provider.");
    }
    console.log(`  Fallback chain : ${chain.map(e => e.name).join(" → ")}`);
  }

  async generateResponse(prompt: string): Promise<string> {
    const errors: string[] = [];

    // Circuit breaker: if the active provider has failed too many times in a row,
    // advance immediately rather than hammering a degraded endpoint.
    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD && this.activeIndex < this.chain.length - 1) {
      const currentName = this.chain[this.activeIndex]?.name ?? "unknown";
      console.warn(`  ⚡  [${currentName}] circuit open after ${this.consecutiveFailures} consecutive failures — switching`);
      this.activeIndex++;
      this.consecutiveFailures = 0;
    }

    for (let i = this.activeIndex; i < this.chain.length; i++) {
      const { name, provider } = this.chain[i]!;

      try {
        const result = await Promise.race([
          provider.generateResponse(prompt),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`timeout after ${PROVIDER_TIMEOUT_MS}ms`)),
              PROVIDER_TIMEOUT_MS,
            )
          ),
        ]);

        // Permanently advance the cursor if we moved forward this call.
        if (i > this.activeIndex) {
          console.log(`\n  ✅  Switched to provider: ${name} (all further calls will use this)\n`);
          this.activeIndex = i;
        }
        this.consecutiveFailures = 0;
        return result;

      } catch (error) {
        const msg   = error instanceof Error ? error.message : String(error);
        const fatal = isFatalForProvider(msg);
        const tag   = fatal ? "quota/auth exhausted" : "failed after retries";

        console.warn(`  ⚡  [${name}] ${tag} — trying next provider`);
        errors.push(`[${name}] ${msg.slice(0, 150)}`);

        // Move the permanent cursor so future calls skip this dead provider.
        this.activeIndex        = i + 1;
        this.consecutiveFailures = 0;  // new provider, reset counter
      }
    }

    throw new Error(
      `All LLM providers in the fallback chain failed:\n` +
      errors.map(e => `  • ${e}`).join("\n")
    );
  }
}
