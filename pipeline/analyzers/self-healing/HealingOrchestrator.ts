import { createHash } from "crypto";
import { execSync } from "child_process";
import fs from "fs";
import type { LLMProvider } from "../../providers/interfaces/LLMProvider.js";
import type { KnowledgeBase } from "../../models/KnowledgeBase.js";
import { KnowledgeBaseService } from "../../kb/KnowledgeBaseService.js";
import { SelfHealingLocatorEngine } from "./SelfHealingLocatorEngine.js";
import { FailureAnalyzer } from "./FailureAnalyzer.js";
import { POMIdentifier } from "./POMIdentifier.js";
import { FailureClassifier } from "./FailureClassifier.js";
import { BackupManager } from "./BackupManager.js";
import { POMUpdater } from "./POMUpdater.js";
import { HealingCache } from "./HealingCache.js";
import { SelectorAlternatives } from "./SelectorAlternatives.js";
import type { LocatorFailureDetail } from "./models/LocatorFailureDetail.js";
import type { HealingResult } from "./models/HealingResult.js";
import type { HealingReport, SkippedFailure } from "./models/HealingReport.js";

export interface HealingOptions {
  skipAIHealing?: boolean; // Only heal from KB matches
  minConfidence?: number; // Minimum confidence (0-100) to apply heal
  enableRerun?: boolean; // Re-run failed tests after healing
  maxHeals?: number; // Limit number of heals to apply
}

export class HealingOrchestrator {
  private failureAnalyzer: FailureAnalyzer;
  private pomIdentifier: POMIdentifier;
  private failureClassifier: FailureClassifier;
  private backupManager: BackupManager;
  private pomUpdater: POMUpdater;
  private healingEngine: SelfHealingLocatorEngine;
  private kbService: KnowledgeBaseService;
  private healingCache: HealingCache;
  private selectorAlternatives: SelectorAlternatives;

  constructor(private llmProvider: LLMProvider) {
    this.failureAnalyzer = new FailureAnalyzer();
    this.pomIdentifier = new POMIdentifier();
    this.failureClassifier = new FailureClassifier();
    this.backupManager = new BackupManager();
    this.pomUpdater = new POMUpdater();
    this.healingEngine = new SelfHealingLocatorEngine(llmProvider);
    this.kbService = new KnowledgeBaseService();
    this.healingCache = new HealingCache();
    this.selectorAlternatives = new SelectorAlternatives();
  }

  /**
   * Main orchestration: analyze failures, heal them, update POMs, and report.
   */
  async orchestrateHealing(options: HealingOptions = {}): Promise<HealingReport> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    const report: HealingReport = {
      executionId,
      timestamp: new Date().toISOString(),
      executionDurationMs: 0,
      totalFailures: 0,
      locatorFailures: 0,
      healedCount: 0,
      healingSuccessRate: 0,
      failuresCausingAICalls: 0,
      aiCallsMade: 0,
      promptsCached: 0,
      promptsNewlyEvaluated: 0,
      estimatedTokensSaved: 0,
      healingResults: [],
      failedToHeal: [],
      skippedFailures: [],
      validationPerformed: false,
      validationResults: null,
      filesModified: [],
      backupCreated: false,
      backupLocation: null,
      successfulHeals: [],
      insufficientConfidenceHeals: [],
      errors: [],
    };

    try {
      // Step 1: Analyze latest failures
      console.log("\n📋 Step 1: Analyzing latest failures...");
      const failures = await this.failureAnalyzer.analyzeLatestFailures();
      report.totalFailures = failures.length;

      if (failures.length === 0) {
        console.log("✅ No failures found in latest test run.");
        report.executionDurationMs = Date.now() - startTime;
        return report;
      }

      console.log(`Found ${failures.length} failed tests.`);

      // Step 2: Identify locator-related failures and map to POMs
      console.log("\n🔍 Step 2: Identifying locator failures and mapping to POMs...");
      const locatorFailures = failures.filter((f) => f.isLocatorFailure);
      report.locatorFailures = locatorFailures.length;

      if (locatorFailures.length === 0) {
        console.log("✅ No locator-related failures detected.");
        report.executionDurationMs = Date.now() - startTime;
        return report;
      }

      console.log(`Found ${locatorFailures.length} locator failures.`);

      // Step 3: Populate POM information
      for (const failure of locatorFailures) {
        await this.pomIdentifier.populateFailureWithPOMInfo(failure);
      }

      // Step 3b: Classify failures (healable vs non-healable)
      console.log("\n📊 Step 3b: Classifying failures...");
      const healableFailures = locatorFailures.filter((failure) => {
        const classification = this.failureClassifier.classify(
          failure.failureMessage + "\n" + failure.failureTrace,
          failure.brokenLocator
        );

        if (!classification.autoHealable) {
          console.log(
            `⏭️  Skipping ${failure.testName}: ${classification.reason}`
          );
          const skipped: SkippedFailure = {
            allureId: failure.allureId,
            testName: failure.testName,
            brokenLocator: failure.brokenLocator,
            reason: classification.reason,
            type: classification.type,
          };
          report.skippedFailures.push(skipped);
        }

        return classification.autoHealable && classification.confidence > 50;
      });

      console.log(
        `💡 ${healableFailures.length} failures are auto-healable (${locatorFailures.length} total)`
      );

      if (healableFailures.length === 0) {
        console.log("✅ No auto-healable failures detected.");
        report.executionDurationMs = Date.now() - startTime;
        return report;
      }

      // Step 4: Heal locator failures
      console.log("\n🔧 Step 4: Healing locator failures...");
      const healingResults: HealingResult[] = [];
      const pomBackups = new Map<string, string>(); // file → backupVersion

      for (const failure of healableFailures) {
        if (
          options.maxHeals &&
          healingResults.length >= options.maxHeals
        ) {
          break;
        }

        try {
          const healResult = await this.healLocatorFailure(
            failure,
            options,
            pomBackups
          );

          if (healResult) {
            healingResults.push(healResult);

            if (
              healResult.confidence >=
              (options.minConfidence || 70)
            ) {
              report.successfulHeals.push(healResult);
            } else {
              report.insufficientConfidenceHeals.push(healResult);
            }
          } else {
            report.failedToHeal.push(failure.allureId);
          }
        } catch (error) {
          report.errors.push({
            stage: "healing",
            error: `Failed to heal ${failure.allureId}: ${error}`,
            context: { allureId: failure.allureId },
          });
        }
      }

      report.healingResults = healingResults;
      report.healedCount = healingResults.filter(
        (r) =>
          r.confidence >=
          (options.minConfidence || 70)
      ).length;

      if (report.healedCount > 0) {
        report.healingSuccessRate = (report.healedCount / report.locatorFailures) * 100;
      }

      // Step 5: Update POM files
      if (report.healedCount > 0) {
        console.log(
          `\n✏️  Step 5: Updating ${report.healedCount} POMs with healed locators...`
        );
        this.updatePOMFiles(healingResults, report, options);
      }

      // Step 6: Track statistics
      this.trackHealingStatistics(healingResults, report);

      // Step 7: Optional re-run of affected tests
      if (options.enableRerun && report.filesModified.length > 0) {
        console.log("\n🔄 Step 7: Re-running affected tests to validate heals...");
        this.rerunAffectedTests(healingResults, report);
      }

      report.executionDurationMs = Date.now() - startTime;
    } catch (error) {
      report.errors.push({
        stage: "orchestration",
        error: `Critical error during healing: ${error}`,
      });
    }

    return report;
  }

  /**
   * Heals a single locator failure using KB + AI.
   */
  private async healLocatorFailure(
    failure: LocatorFailureDetail,
    options: HealingOptions,
    pomBackups: Map<string, string>
  ): Promise<HealingResult | null> {
    if (!failure.brokenLocator || !failure.pageObjectFile) {
      return null;
    }

    // Create backup if not already created for this POM
    if (!pomBackups.has(failure.pageObjectFile)) {
      const backup = this.backupManager.createBackup(
        failure.pageObjectFile,
        `Backup before healing failure ${failure.allureId}`
      );
      pomBackups.set(failure.pageObjectFile, backup.backupVersion);
    }

    try {
      // ── Step A: Check selector-level solution cache first ──────────────────
      const cached = this.healingCache.get(
        failure.brokenLocator!,
        failure.pageObjectFile
      );
      if (cached) {
        console.log(`💾 Cache hit for ${failure.allureId} — reusing stored solution (0 tokens)`);
        const backupVersion = pomBackups.get(failure.pageObjectFile) ??
          this.backupManager.createBackup(
            failure.pageObjectFile,
            `Backup before healing failure ${failure.allureId}`
          ).backupVersion;
        pomBackups.set(failure.pageObjectFile, backupVersion);
        return {
          allureId: failure.allureId,
          testName: failure.testName,
          originalLocator: failure.brokenLocator!,
          healedLocator: cached.healedLocator,
          locatorPropertyName: cached.locatorPropertyName ?? failure.locatorPropertyName!,
          confidence: cached.confidence,
          reasoning: `[CACHED] ${cached.reasoning}`,
          method: "kb-match" as const,
          pomFile: failure.pageObjectFile,
          pomClass: failure.pageObjectClass!,
          backupVersion,
          changeHash: this.generateChangeHash(failure.brokenLocator!, cached.healedLocator),
          validated: cached.rerunPassed !== null,
          rerunPassed: cached.rerunPassed,
          validationError: null,
        };
      }

      // ── Step B: Load knowledge base ─────────────────────────────────────────
      const kbName = this.extractKBName(failure.pageObjectFile);
      let knowledgeBase: KnowledgeBase;

      try {
        knowledgeBase = this.kbService.load(kbName);
      } catch (error) {
        // KB not found, create minimal KB for AI healing to proceed
        console.log(`⏭️ KB not found for ${kbName}, using AI healing with minimal context`);
        knowledgeBase = {
          pageName: failure.pageObjectClass || "Unknown",
          url: "http://unknown.local",
          selectors: {}, // Empty selectors - AI will generate new ones
        };
      }

      // ── Step C: Generate selector alternatives as additional AI context ─────
      const alternatives = this.selectorAlternatives.generateAlternatives(
        failure.brokenLocator!
      );

      // Attempt healing using the engine (with or without real KB)
      let healResult;
      try {
        healResult = await this.healingEngine.heal(
          {
            failedLocator: failure.brokenLocator,
            pageName: failure.pageObjectFile,
            alternatives: alternatives.slice(0, 5), // top 5 candidate alternatives
          },
          knowledgeBase
        );
      } catch (healError) {
        console.warn(`AI healing failed for ${failure.allureId}: ${healError}`);
        return null;
      }

      // Validate healed selector
      if (!healResult?.healedLocator) {
        console.warn(`AI returned empty healed locator for ${failure.allureId}`);
        return null;
      }

      const validation = this.pomUpdater.validateHealedSelector(
        healResult.healedLocator
      );
      if (!validation.isValid) {
        console.warn(
          `Healed selector validation failed for ${failure.allureId}: ${healResult.healedLocator} - ${validation.errors.join(", ")}`
        );
        return null;
      }

      const backupVersion = pomBackups.get(failure.pageObjectFile);
      if (!backupVersion) return null;

      const result: HealingResult = {
        allureId: failure.allureId,
        testName: failure.testName,
        originalLocator: failure.brokenLocator!,
        healedLocator: healResult.healedLocator,
        locatorPropertyName: failure.locatorPropertyName!,
        confidence: healResult.confidence,
        reasoning: healResult.reasoning,
        method: healResult.confidence >= 85 ? "ai-suggested" : "ai-generated",
        pomFile: failure.pageObjectFile,
        pomClass: failure.pageObjectClass!,
        backupVersion: backupVersion,
        changeHash: this.generateChangeHash(
          failure.brokenLocator!,
          healResult.healedLocator
        ),
        validated: false,
        rerunPassed: null,
        validationError: null,
      };

      // ── Step D: Persist solution to selector-level cache ─────────────────────
      // Only cache real changes with sufficient confidence
      if (
        healResult.healedLocator !== failure.brokenLocator &&
        healResult.confidence >= (options.minConfidence ?? 70)
      ) {
        this.healingCache.set({
          originalLocator: failure.brokenLocator!,
          healedLocator: healResult.healedLocator,
          pomFile: failure.pageObjectFile,
          locatorPropertyName: failure.locatorPropertyName ?? null,
          confidence: healResult.confidence,
          reasoning: healResult.reasoning,
          method: result.method,
          cachedAt: new Date().toISOString(),
          rerunPassed: null, // Updated after re-run
        });
      }

      return result;
    } catch (error) {
      console.error(
        `Error healing ${failure.allureId}: ${error}`
      );
      return null;
    }
  }

  /**
   * Updates POM files with healed locators.
   */
  private updatePOMFiles(
    healingResults: HealingResult[],
    report: HealingReport,
    options: HealingOptions = {}
  ): void {
    const minConfidence = options.minConfidence ?? 70;
    // Group by POM file — only include high-confidence, changed locators
    const resultsByPom = new Map<string, HealingResult[]>();
    for (const result of healingResults) {
      if (
        result.confidence >= minConfidence &&
        result.originalLocator !== result.healedLocator
      ) {
        if (!resultsByPom.has(result.pomFile)) {
          resultsByPom.set(result.pomFile, []);
        }
        resultsByPom.get(result.pomFile)!.push(result);
      }
    }

    // Update each POM file
    for (const [pomFile, results] of resultsByPom) {
      try {
        const diffs = this.pomUpdater.updatePOMWithHealedLocators(
          pomFile,
          results
        );

        if (diffs.length > 0) {
          report.filesModified.push(pomFile);
          console.log(
            `✅ Updated ${pomFile} with ${diffs.length} healed locators`
          );
          console.log(this.pomUpdater.generateDiffReport(diffs));
        }
      } catch (error) {
        report.errors.push({
          stage: "pom-update",
          error: `Failed to update ${pomFile}: ${error}`,
          context: { pomFile },
        });
      }
    }

    if (report.filesModified.length > 0) {
      report.backupCreated = true;
      // Prune old backups
      const pruned = this.backupManager.pruneOldBackups(5);
      console.log(`🗑️  Pruned ${pruned} old backups`);
    }
  }

  /**
   * Tracks healing efficiency statistics.
   */
  private trackHealingStatistics(
    healingResults: HealingResult[],
    report: HealingReport
  ): void {
    // Track AI call patterns
    const methodCounts = new Map<string, number>();
    for (const result of healingResults) {
      methodCounts.set(
        result.method,
        (methodCounts.get(result.method) || 0) + 1
      );
    }

    // Cache hits are method="kb-match", AI calls are anything else
    const cacheHits = healingResults.filter((r) => r.method === "kb-match").length;
    const kbMatches = healingResults.filter((r) => r.confidence >= 85 && r.method !== "kb-match").length;
    const aiCalls = healingResults.filter((r) => r.method !== "kb-match").length;

    report.aiCallsMade = aiCalls;
    report.failuresCausingAICalls = aiCalls;
    report.promptsCached = cacheHits;
    // Estimate: cache hit saves ~2000 tokens, KB match saves ~500 tokens
    report.estimatedTokensSaved = cacheHits * 2000 + kbMatches * 500;

    console.log("\n📊 Healing Statistics:");
    console.log(`   Total Locator Failures: ${report.locatorFailures}`);
    console.log(`   Successfully Healed: ${report.healedCount} (${report.healingSuccessRate.toFixed(1)}%)`);
    console.log(`   Healing Cache Hits: ${cacheHits} (zero tokens used)`);
    console.log(`   AI Calls Made: ${report.aiCallsMade}`);
    console.log(`   KB Matches: ${kbMatches}`);
    console.log(`   Estimated Tokens Saved: ${report.estimatedTokensSaved.toLocaleString()}`);

    this.healingCache.logStats();
  }

  /**
   * Re-runs the Playwright test specs affected by the healed locators.
   * Updates the healing cache with re-run results for future reuse confidence.
   */
  private rerunAffectedTests(
    healingResults: HealingResult[],
    report: HealingReport
  ): void {
    // Collect unique spec files from test names
    const specFiles = new Set<string>();
    for (const result of healingResults) {
      if (result.originalLocator !== result.healedLocator) {
        // Derive spec file: "support/pages/billpayPage.page.ts" → "tests/UI/parabank-billpay.spec.ts"
        const specFile = this.deriveSpecFile(result.pomFile);
        if (specFile) specFiles.add(specFile);
      }
    }

    if (specFiles.size === 0) {
      console.log("⚠️  No spec files could be derived for re-run.");
      return;
    }

    report.validationPerformed = true;
    const specResults: Record<string, boolean> = {};

    for (const specFile of specFiles) {
      console.log(`   🧪 Re-running: ${specFile}`);
      try {
        execSync(
          `npx playwright test "${specFile}" --project=chromium --reporter=line`,
          { stdio: "pipe", timeout: 120_000 }
        );
        specResults[specFile] = true;
        console.log(`   ✅ PASSED: ${specFile}`);
      } catch {
        specResults[specFile] = false;
        console.log(`   ❌ FAILED: ${specFile}`);
      }
    }

    const passedCount = Object.values(specResults).filter(Boolean).length;
    const failedCount = Object.values(specResults).filter(v => !v).length;
    report.validationResults = {
      rerunTests: Object.keys(specResults),
      rerunPassed: passedCount,
      rerunFailed: failedCount,
      specResults,
    };

    // Update healing results and cache with re-run outcome
    for (const result of healingResults) {
      if (result.originalLocator === result.healedLocator) continue;
      const specFile = this.deriveSpecFile(result.pomFile);
      if (!specFile) continue;
      const passed = specResults[specFile] ?? null;
      result.validated = passed !== null;
      result.rerunPassed = passed;

      // Persist re-run result back into the selector cache
      this.healingCache.updateRerunResult(
        result.originalLocator,
        result.pomFile,
        passed ?? false
      );
    }
  }

  /**
   * Derives the spec file path from a POM file path.
   * E.g., "support/pages/billpayPage.page.ts" → "tests/UI/parabank-billpay.spec.ts"
   */
  private deriveSpecFile(pomFilePath: string): string | null {
    const fileName = pomFilePath.split("/").pop()?.replace("Page.page.ts", "").replace(".page.ts", "") || "";
    // Convert camelCase to kebab-case
    const kebab = fileName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    const candidate = `tests/UI/parabank-${kebab}.spec.ts`;

    // Verify the file exists before returning
    if (fs.existsSync(candidate)) return candidate;
    return null;
  }

  /**
   * Extracts KB name from POM file path.
   * E.g., "support/pages/loginPage.page.ts" → "parabank-login-page"
   */
  private extractKBName(pomFilePath: string): string {
    const fileName = pomFilePath.split("/").pop()?.replace(".page.ts", "") || "";
    // Convert camelCase to kebab-case and prepend "parabank-"
    const kebab = fileName
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .toLowerCase();

    // Check if it already has "parabank-" prefix
    if (kebab.startsWith("parabank-")) {
      return kebab;
    }

    return `parabank-${kebab}`;
  }

  /**
   * Generates a unique execution ID.
   */
  private generateExecutionId(): string {
    return `heal-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generates a hash for a change (for deduplication/tracking).
   */
  private generateChangeHash(oldSelector: string, newSelector: string): string {
    return createHash("sha256")
      .update(`${oldSelector}→${newSelector}`)
      .digest("hex")
      .substring(0, 8);
  }
}
