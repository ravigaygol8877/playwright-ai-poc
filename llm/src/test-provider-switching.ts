/**
 * Provider Switching — Live Demonstration
 *
 * Runs the same prompt through three configurations in sequence:
 *   1. OpenRouter  → openai/gpt-4.1-mini
 *   2. GitHub Models → gpt-5
 *   3. GitHub Models → gpt-4.1
 *
 * Zero code changes between providers — only env vars differ.
 * Providers with missing credentials are skipped with a warning.
 *
 * Prerequisites (at least one required):
 *   OPENROUTER_API_KEY=sk-or-v1-...     (for OpenRouter scenario)
 *   GITHUB_TOKEN=ghp_...                 (for GitHub Models scenarios)
 *
 * Run:
 *   npm run test:provider-switching
 *   tsx llm/src/test-provider-switching.ts
 */

import "dotenv/config";
import { GitHubModelsProvider } from "./providers/GitHubModelsProvider.js";
import { OpenRouterProvider }   from "./providers/OpenRouterProvider.js";
import type { LLMProvider }     from "./interfaces/LLMProvider.js";

const SEP  = "═".repeat(56);
const LINE = "─".repeat(56);

const PROMPT =
    "In exactly one sentence, what is the #1 advantage of " +
    "Playwright over Selenium for modern web test automation?";

interface Scenario {
    label:    string;
    provider: string;
    model:    string;
    llm:      LLMProvider;
}

async function runScenario(scenario: Scenario): Promise<void> {
    console.log(`\n${LINE}`);
    console.log(`  Provider : ${scenario.provider}`);
    console.log(`  Model    : ${scenario.model}`);
    console.log(LINE);

    try {
        process.stdout.write("  Response : ");
        const response = await scenario.llm.generateResponse(PROMPT);
        console.log(response.trim());
    } catch (err) {
        console.log(`\n  ⚠  Skipped — ${(err as Error).message.split("\n")[0]}`);
    }
}

async function main() {
    console.log(`\n${SEP}`);
    console.log("  Provider Switching — Live Demonstration");
    console.log(SEP);
    console.log(`\n  Prompt: "${PROMPT}"\n`);

    const openRouterKey = process.env["OPENROUTER_API_KEY"]?.trim();
    const githubToken   = process.env["GITHUB_TOKEN"]?.trim();

    const scenarios: Scenario[] = [];

    if (openRouterKey) {
        scenarios.push({
            label:    "OpenRouter → GPT-4.1 Mini",
            provider: "openrouter",
            model:    "openai/gpt-4.1-mini",
            llm:      new OpenRouterProvider(openRouterKey, "openai/gpt-4.1-mini"),
        });
    } else {
        console.warn("  ⚠  OPENROUTER_API_KEY not set — skipping OpenRouter scenario");
    }

    if (githubToken) {
        scenarios.push(
            {
                label:    "GitHub Models → GPT-4.1-mini",
                provider: "github-models",
                model:    "gpt-4.1-mini",
                llm:      new GitHubModelsProvider(githubToken, "gpt-4.1-mini"),
            },
            {
                label:    "GitHub Models → GPT-4.1",
                provider: "github-models",
                model:    "gpt-4.1",
                llm:      new GitHubModelsProvider(githubToken, "gpt-4.1"),
            }
        );
    } else {
        console.warn("  ⚠  GITHUB_TOKEN not set — skipping GitHub Models scenarios");
    }

    if (scenarios.length === 0) {
        console.error("\n  ❌  No providers configured. Set at least one of:");
        console.error("       OPENROUTER_API_KEY  → for OpenRouter");
        console.error("       GITHUB_TOKEN        → for GitHub Models\n");
        process.exit(1);
    }

    for (const scenario of scenarios) {
        await runScenario(scenario);
    }

    console.log(`\n${LINE}`);
    console.log(`  ✅ ${scenarios.length} scenario(s) completed`);
    console.log(LINE + "\n");
}

main().catch(err => {
    console.error("\n  ❌ Error:", err.message, "\n");
    process.exit(1);
});
