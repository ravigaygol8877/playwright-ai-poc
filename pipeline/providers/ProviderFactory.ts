/**
 * ProviderFactory
 *
 * Single entry point for LLM provider creation.
 * Reads LLM_PROVIDER and MODEL from the environment.
 *
 * Supported providers (set via LLM_PROVIDER env var):
 *   gemini        — Google Gemini              requires GOOGLE_API_KEY
 *   github-models — GitHub Models              requires GITHUB_TOKEN
 *   openrouter    — OpenRouter                 requires OPENROUTER_API_KEY
 *   lm-studio     — Local LM Studio server     no key needed; start server in app
 *   fallback      — Auto-switch on quota/error  reads FALLBACK_CHAIN (see below)
 *
 * Fallback mode:
 *   Set LLM_PROVIDER=fallback and optionally FALLBACK_CHAIN=<comma-separated list>.
 *   Default chain: lm-studio,gemini,openrouter,github-models
 *   Providers whose credentials are missing are silently skipped.
 *   Once a provider's quota is exhausted the pipeline automatically switches to the
 *   next one and stays there for the remainder of the run — no manual .env changes.
 *
 * Model selection priority (highest → lowest):
 *   1. modelOverride argument (from platform.config.json llmModel field)
 *   2. MODEL env var
 *   3. Provider default
 */

import type { LLMProvider }      from "./interfaces/LLMProvider.js";
import { GeminiProvider }        from "./GeminiProvider.js";
import { GitHubModelsProvider }  from "./GitHubModelsProvider.js";
import { OpenRouterProvider }    from "./OpenRouterProvider.js";
import { LMStudioProvider }      from "./LMStudioProvider.js";
import { FallbackProvider }      from "./FallbackProvider.js";
import { CachingLLMProvider }    from "./CachingLLMProvider.js";

const DEFAULT_FALLBACK_CHAIN = "lm-studio,gemini,openrouter,github-models";

export class ProviderFactory {

  static create(modelOverride?: string): LLMProvider {
    const providerName = (process.env["LLM_PROVIDER"] ?? "gemini").toLowerCase().trim();
    const model = modelOverride?.trim() || process.env["MODEL"]?.trim() || undefined;

    const lmUrl = process.env["LM_STUDIO_URL"] ?? "http://127.0.0.1:1234";
    console.log(`  Provider    : ${providerName}`);
    if (model) console.log(`  Model       : ${model}`);
    if (providerName === "lm-studio") console.log(`  LM Studio   : ${lmUrl}`);

    if (providerName === "fallback") {
      return ProviderFactory.wrapWithCache(ProviderFactory.createFallback(model));
    }

    return ProviderFactory.wrapWithCache(ProviderFactory.createSingle(providerName, model));
  }

  /**
   * Build a FallbackProvider from the FALLBACK_CHAIN env var.
   * Providers with missing credentials are warned about and skipped.
   */
  private static createFallback(model?: string): LLMProvider {
    const chainStr  = process.env["FALLBACK_CHAIN"] ?? DEFAULT_FALLBACK_CHAIN;
    const names     = chainStr.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    const chain: { name: string; provider: LLMProvider }[] = [];

    for (const name of names) {
      try {
        // In fallback mode the MODEL env var is typically set for lm-studio
        // (e.g. "google/gemma-4-e4b"). Passing it to cloud providers causes
        // immediate "model not found" failures. Only forward it to lm-studio.
        const providerModel = name === "lm-studio" ? model : undefined;
        const provider = ProviderFactory.createSingle(name, providerModel);
        chain.push({ name, provider });
      } catch (e) {
        // Missing credentials or unknown provider — skip with a warning
        const reason = (e instanceof Error ? e.message : String(e)).split("\n")[0];
        console.warn(`  ⚠  Skipping "${name}" from fallback chain: ${reason}`);
      }
    }

    if (chain.length === 0) {
      throw new Error(
        "FallbackProvider: no valid providers could be built from FALLBACK_CHAIN.\n" +
        "  Check that at least one provider has the required credentials in .env."
      );
    }

    return new FallbackProvider(chain);
  }

  /** Wrap a provider with the disk cache (skip if LLM_CACHE=false). */
  private static wrapWithCache(provider: LLMProvider): LLMProvider {
    if (process.env["LLM_CACHE"]?.trim().toLowerCase() === "false") return provider;
    return new CachingLLMProvider(provider);
  }

  /**
   * Create a single named provider. Throws if required credentials are absent.
   * Also used internally by createFallback to probe each chain entry.
   */
  static createSingle(providerName: string, model?: string): LLMProvider {
    if (providerName === "gemini") {
      const apiKey = process.env["GOOGLE_API_KEY"]?.trim();
      if (!apiKey) {
        throw new Error(
          "GOOGLE_API_KEY is required for provider 'gemini'.\n" +
          "  Get one at: https://aistudio.google.com/apikey"
        );
      }
      const p = new GeminiProvider(apiKey, model);
      return p;
    }

    if (providerName === "github-models") {
      const token = process.env["GITHUB_TOKEN"]?.trim();
      if (!token) {
        throw new Error(
          "GITHUB_TOKEN is required for provider 'github-models'.\n" +
          "  Generate one at: https://github.com/settings/tokens"
        );
      }
      return new GitHubModelsProvider(token, model);
    }

    if (providerName === "openrouter") {
      const apiKey = process.env["OPENROUTER_API_KEY"]?.trim();
      if (!apiKey) {
        throw new Error(
          "OPENROUTER_API_KEY is required for provider 'openrouter'.\n" +
          "  Get one at: https://openrouter.ai/settings/keys"
        );
      }
      return new OpenRouterProvider(apiKey, model);
    }

    if (providerName === "lm-studio") {
      const url = process.env["LM_STUDIO_URL"];
      return new LMStudioProvider(model, url);
    }

    throw new Error(
      `Unknown LLM provider: "${providerName}".\n` +
      "  Supported values: gemini, github-models, openrouter, lm-studio, fallback"
    );
  }
}
