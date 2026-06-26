import fs from "fs";
import path from "path";
import type { FlakyTestAnalysis }
  from "../../../ai/src/flaky-test-analyzer/FlakyTestAnalysis.js";
import type { RootCauseAnalysisResult }
  from "../../../ai/src/root-cause-analyzer/RootCauseAnalysisResult.js";
import type { CoverageAnalysisResult }
  from "../../../ai/src/coverage-analyzer/CoverageAnalysisResult.js";
import type { RegressionSelection }
  from "../../../ai/src/regression-selector/RegressionSelection.js";

export type ReleaseRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AIAnalysisReport {
  generatedAt: string;
  flakyTests: FlakyTestAnalysis[];
  rootCauses: RootCauseAnalysisResult[];
  coverage: CoverageAnalysisResult | null;
  regressionSelection: RegressionSelection | null;
  releaseRisk: ReleaseRisk;
  releaseSummary: string;
}

export type ReportInput = Omit<
  AIAnalysisReport,
  "generatedAt" | "releaseRisk" | "releaseSummary"
>;

export class ReportingService {

  constructor(
    private outputPath: string = "reports"
  ) {}

  generate(data: ReportInput): AIAnalysisReport {
    const releaseRisk = this.calculateRisk(data);
    const releaseSummary = this.buildSummary(data, releaseRisk);

    const report: AIAnalysisReport = {
      generatedAt: new Date().toISOString(),
      ...data,
      releaseRisk,
      releaseSummary,
    };

    this.persist(report);
    return report;
  }

  private calculateRisk(data: ReportInput): ReleaseRisk {
    const criticalFailures = data.rootCauses.filter(
      r => r.confidence >= 85
    ).length;
    const highFlakiness = data.flakyTests.filter(
      f => f.flakyProbability >= 75
    ).length;
    const coverageGaps = data.coverage?.missingCoverage.length ?? 0;

    if (criticalFailures >= 3 || highFlakiness >= 5) return "CRITICAL";
    if (criticalFailures >= 1 || highFlakiness >= 2 || coverageGaps >= 5) return "HIGH";
    if (highFlakiness >= 1 || coverageGaps >= 2) return "MEDIUM";
    return "LOW";
  }

  private buildSummary(data: ReportInput, risk: ReleaseRisk): string {
    const lines = [
      `Release Risk: ${risk}`,
      `Flaky tests detected: ${data.flakyTests.length}`,
      `Root causes identified: ${data.rootCauses.length}`,
      `Coverage: ${data.coverage?.coveragePercentage ?? "N/A"}%`,
      `Coverage gaps: ${data.coverage?.missingCoverage.length ?? "N/A"}`,
    ];

    if (data.coverage?.recommendation) {
      lines.push(`Recommendation: ${data.coverage.recommendation}`);
    }

    return lines.join("\n");
  }

  private persist(report: AIAnalysisReport): void {
    const dateDir = report.generatedAt.split("T")[0]!;
    const dirPath = path.join(this.outputPath, dateDir);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const jsonPath = path.join(dirPath, "ai-analysis-report.json");
    const mdPath = path.join(dirPath, "release-risk-summary.md");

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(mdPath, this.toMarkdown(report));

    console.log(`Reports saved to: ${dirPath}`);
  }

  private toMarkdown(report: AIAnalysisReport): string {
    const flakySection = report.flakyTests.length > 0
      ? report.flakyTests.map(f =>
          `- **${f.testName}** — Flaky probability: ${f.flakyProbability}%\n  - ${f.recommendation}`
        ).join("\n")
      : "No flaky tests detected.";

    const rootCauseSection = report.rootCauses.length > 0
      ? report.rootCauses.map(r =>
          `- **${r.failureType}** — ${r.probableCause}\n  - Component: ${r.impactedComponent}\n  - Fix: ${r.recommendation}\n  - Confidence: ${r.confidence}%`
        ).join("\n")
      : "No failures to analyze.";

    const coverageSection = report.coverage
      ? report.coverage.missingCoverage.map(g => `- ${g}`).join("\n") ||
        "All requirements covered."
      : "No coverage data available.";

    return `# Release Risk Summary

Generated: ${report.generatedAt}

## Risk Level: ${report.releaseRisk}

${report.releaseSummary}

## Flaky Tests (${report.flakyTests.length})

${flakySection}

## Root Cause Analysis (${report.rootCauses.length})

${rootCauseSection}

## Coverage Gaps

${coverageSection}
`;
  }
}
