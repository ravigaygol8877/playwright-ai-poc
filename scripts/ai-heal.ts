import "dotenv/config";
import path from "path";
import { execSync } from "child_process";
import { ensureScaffoldFiles } from "./ensureScaffold.js";
import { ProviderFactory } from "../pipeline/providers/ProviderFactory.js";
import {
  HealingOrchestrator,
  type HealingOptions,
} from "../pipeline/analyzers/self-healing/HealingOrchestrator.js";
import { HealingReporter } from "../pipeline/analyzers/self-healing/HealingReporter.js";

/**
 * Production-ready self-healing CLI command.
 * Usage:
 *   npm run ai:heal
 *   npm run ai:heal -- --min-confidence 75
 *   npm run ai:heal -- --skip-ai --enable-rerun
 */
async function main(): Promise<void> {
  ensureScaffoldFiles();

  // Parse command-line arguments
  const cliOpts = parseCliArguments();

  console.log("\n🔧 AI Self-Healing Engine - Production Mode\n");
  console.log("Options:");
  console.log(`  Skip AI Healing:     ${cliOpts.skipAIHealing || false}`);
  console.log(`  Min Confidence:      ${cliOpts.minConfidence || 70}%`);
  console.log(`  Enable Re-run:       ${cliOpts.enableRerun || false}`);
  console.log(`  Max Heals:           ${cliOpts.maxHeals || "unlimited"}`);

  try {
    // Initialize LLM provider
    const provider = ProviderFactory.create();
    console.log(`\n✅ LLM Provider: ${provider.constructor.name}`);

    // Create orchestrator and run healing pipeline
    const orchestrator = new HealingOrchestrator(provider);
    
    // Build healing options carefully to satisfy exactOptionalPropertyTypes
    const healingOpts: HealingOptions = {};
    if (cliOpts.skipAIHealing) healingOpts.skipAIHealing = true;
    if (cliOpts.minConfidence) healingOpts.minConfidence = cliOpts.minConfidence;
    if (cliOpts.enableRerun) healingOpts.enableRerun = true;
    if (cliOpts.maxHeals) healingOpts.maxHeals = cliOpts.maxHeals;
    
    const report = await orchestrator.orchestrateHealing(healingOpts);

    // Generate and display report
    const reporter = new HealingReporter();
    const { htmlPath } = reporter.generateReport(report);

    // Auto-open the HTML report in the default browser (suppressed when NO_OPEN=true)
    if (process.env['NO_OPEN'] !== 'true') {
      const absolutePath = path.resolve(htmlPath);
      try {
        execSync(`open "${absolutePath}"`, { stdio: "ignore" });
      } catch {
        // Non-macOS or no default browser — silently skip
      }
    }

    // Exit 0 when the pipeline ran cleanly (even if 0 heals were needed).
    // Exit 1 only when unhandled errors occurred during the healing process.
    const exitCode = report.errors.length === 0 ? 0 : 1;
    process.exit(exitCode);
  } catch (error) {
    console.error("\n❌ Fatal error during healing:", error);
    process.exit(1);
  }
}

/**
 * Parses command-line arguments into options object.
 */
function parseCliArguments(): HealingOptions {
  const options: HealingOptions = {};

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--skip-ai") {
      options.skipAIHealing = true;
    } else if (arg === "--min-confidence" && args[i + 1]) {
      const parsed = parseInt(args[i + 1] ?? "70", 10);
      options.minConfidence = isNaN(parsed) ? 70 : parsed;
      i++;
    } else if (arg === "--enable-rerun") {
      options.enableRerun = true;
    } else if (arg === "--max-heals" && args[i + 1]) {
      const parsed = parseInt(args[i + 1] ?? "0", 10);
      if (!isNaN(parsed)) {
        options.maxHeals = parsed;
      }
      i++;
    }
  }

  return options;
}

main();
