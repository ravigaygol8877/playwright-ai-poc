import type { HealingResult } from "./HealingResult.js";

export interface SkippedFailure {
  allureId: string;
  testName: string;
  brokenLocator: string | null;
  reason: string;
  type: "visibility-timing" | "flaky" | "non-healable" | "selector-broken";
}

export interface HealingReport {
  // Metadata
  executionId: string;
  timestamp: string;
  executionDurationMs: number;

  // Summary statistics
  totalFailures: number;
  locatorFailures: number;
  healedCount: number;
  healingSuccessRate: number; // 0-100
  
  // Costs and efficiency
  failuresCausingAICalls: number;
  aiCallsMade: number;
  promptsCached: number;
  promptsNewlyEvaluated: number;
  estimatedTokensSaved: number;

  // Results
  healingResults: HealingResult[];
  failedToHeal: string[]; // allure IDs of failures the AI attempted but could not fix
  skippedFailures: SkippedFailure[]; // failures classified as non-healable (correctly skipped)

  // Validation (if re-run was performed)
  validationPerformed: boolean;
  validationResults: {
    rerunTests: string[]; // spec files that were re-run
    rerunPassed: number;
    rerunFailed: number;
    specResults: Record<string, boolean>; // specFile → passed
  } | null;

  // Changes made to repository
  filesModified: string[];
  backupCreated: boolean;
  backupLocation: string | null;

  // Report metadata
  successfulHeals: HealingResult[];
  insufficientConfidenceHeals: HealingResult[];
  errors: Array<{
    stage: string;
    error: string;
    context?: Record<string, unknown>;
  }>;
}
