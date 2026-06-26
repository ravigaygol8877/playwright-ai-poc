/**
 * GitHub Models — Provider Smoke Test
 *
 * Verifies end-to-end connectivity through the GitHub Models inference endpoint.
 * Tests GPT-5 by default; override with MODEL env var.
 *
 * Prerequisites:
 *   GITHUB_TOKEN=<your-github-pat>
 *
 * Run:
 *   LLM_PROVIDER=github-models MODEL=gpt-5   tsx llm/src/test-github-models.ts
 *   LLM_PROVIDER=github-models MODEL=gpt-4.1 tsx llm/src/test-github-models.ts
 *
 * Or via npm:
 *   npm run test:github-models
 */

import "dotenv/config";
import { ProviderFactory } from "./ProviderFactory.js";

const SEP  = "═".repeat(52);
const LINE = "─".repeat(52);

async function main() {
    console.log(`\n${SEP}`);
    console.log("  GitHub Models — Provider Smoke Test");
    console.log(SEP);

    // Force github-models provider for this runner
    process.env["LLM_PROVIDER"] = "github-models";
    if (!process.env["MODEL"]) process.env["MODEL"] = "gpt-4.1";

    console.log("");
    const provider = ProviderFactory.create();

    const prompt =
        "You are a Playwright test automation expert. " +
        "Generate exactly 2 test cases for a login page. " +
        "Return ONLY a valid JSON array — no markdown, no explanation.\n\n" +
        '[{"id":"TC_001","title":"Login with valid credentials",' +
        '"steps":["Navigate to /login","Enter valid username","Enter valid password","Click Login button"],' +
        '"expectedResult":"User is redirected to /dashboard"},\n' +
        '{"id":"TC_002","title":"Login with invalid credentials",' +
        '"steps":["Navigate to /login","Enter invalid username","Enter invalid password","Click Login button"],' +
        '"expectedResult":"Error message is displayed"}]';

    console.log(`\n${LINE}`);
    console.log("  Sending prompt...");
    console.log(LINE);

    const response = await provider.generateResponse(prompt);

    console.log("\n  Response:\n");
    console.log(response.trim());
    console.log(`\n${LINE}`);
    console.log(`  ✅ GitHub Models smoke test passed`);
    console.log(`     Model used : ${process.env["MODEL"]}`);
    console.log(LINE + "\n");
}

main().catch(err => {
    console.error("\n  ❌ Smoke test failed:", err.message, "\n");
    process.exit(1);
});
