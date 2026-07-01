import fs from "fs";
import path from "path";
import type { LocatorFailureDetail } from "./models/LocatorFailureDetail.js";

// ── Playwright JSON reporter shape ────────────────────────────────────────────
interface PWResult {
  status: string;
  error?: {
    message?: string;
    location?: { file: string; line: number; column: number };
  };
}
interface PWTest  { status: string; results: PWResult[]; }
interface PWSpec  { title: string; file?: string; tests: PWTest[]; }
interface PWSuite { title: string; specs?: PWSpec[]; suites?: PWSuite[]; }
interface PWReport { suites?: PWSuite[] }
// ─────────────────────────────────────────────────────────────────────────────

const ANSI_RE = /\x1b\[[0-9;]*m/g;

export class FailureAnalyzer {

  /**
   * Parses the latest Playwright JSON results and returns locator failures.
   * Reads from reports/<runId>/playwright/results.json (written by the json reporter).
   */
  async analyzeLatestFailures(): Promise<LocatorFailureDetail[]> {
    const resultsPath = this.resolveResultsPath();

    if (!resultsPath || !fs.existsSync(resultsPath)) {
      console.log(`  ℹ️  No test results found at: ${resultsPath ?? 'reports/<runId>/playwright/results.json'}`);
      console.log(`  Run tests first:  npm run test:ui`);
      return [];
    }

    console.log(`  📄 Reading results: ${resultsPath}`);
    const report: PWReport = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));

    const failures: LocatorFailureDetail[] = [];
    const seen = new Set<string>();  // deduplicate: same locator + same pom file
    this.walkSuites(report.suites ?? [], failures, seen);

    return failures;
  }

  // ── private helpers ──────────────────────────────────────────────────────

  private resolveResultsPath(): string | null {
    const runIdFile = path.join("reports", ".current-run-id");
    if (!fs.existsSync(runIdFile)) return null;
    const runId = fs.readFileSync(runIdFile, "utf-8").trim();
    return path.join("reports", runId, "playwright", "results.json");
  }

  private walkSuites(
    suites: PWSuite[],
    out: LocatorFailureDetail[],
    seen: Set<string>,
  ): void {
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests) {
          for (const result of test.results) {
            if (result.status === "failed" || result.status === "timedOut") {
              const detail = this.extractFailure(spec.title, result);
              if (detail) {
                const key = `${detail.pageObjectFile ?? "?"}::${detail.brokenLocator ?? "?"}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  out.push(detail);
                }
              }
            }
          }
        }
      }
      this.walkSuites(suite.suites ?? [], out, seen);
    }
  }

  private extractFailure(
    testTitle: string,
    result: PWResult,
  ): LocatorFailureDetail | null {
    const raw     = result.error?.message ?? "";
    const message = raw.replace(ANSI_RE, "");
    const loc     = result.error?.location;

    if (!this.isLocatorRelatedFailure(message)) return null;

    // Extract locator string — Playwright includes:
    //   "Locator: locator('text=...')"  or
    //   "waiting for locator('...')"
    const brokenLocator =
      message.match(/Locator:\s+locator\(['"](.+?)['"]\)/)?.[1]
      ?? message.match(/waiting for locator\(['"](.+?)['"]\)/)?.[1]
      ?? null;

    // POM file is in the error location (absolute → relative)
    const absFile   = loc?.file ?? "";
    const pomFile   = absFile
      ? path.relative(process.cwd(), absFile)
      : null;

    if (!pomFile) return null;

    return {
      allureId:              `pw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      testName:              testTitle,
      testFile:              pomFile,
      failureMessage:        message.slice(0, 500),
      failureTrace:          message,
      brokenLocator,
      locatorPattern:        brokenLocator?.startsWith("text=") ? "text" : "css",
      failureReason:         message.includes("element(s) not found") ? "not-found" : "timeout",
      pageObjectFile:        pomFile,
      pageObjectClass:       null,  // populated later by POMIdentifier
      locatorPropertyName:   null,  // populated later by POMIdentifier
      confidenceInExtraction: brokenLocator ? 90 : 60,
      isLocatorFailure:      true,
      requiresAIHealing:     true,
      timestamp:             new Date().toISOString(),
    };
  }

  private isLocatorRelatedFailure(message: string): boolean {
    return (
      message.includes("element(s) not found")             ||
      message.includes("waiting for locator")              ||
      message.includes("locator.click")                    ||
      message.includes("locator.fill")                     ||
      message.includes("locator.type")                     ||
      message.includes("strict mode violation")            ||
      (message.includes("toBeVisible") && message.includes("not found"))  ||
      (message.includes("toContainText") && message.includes("not found"))
    );
  }
}
