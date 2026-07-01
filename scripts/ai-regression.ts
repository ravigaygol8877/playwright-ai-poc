import "dotenv/config";
import { ensureScaffoldFiles } from "./ensureScaffold.js";
import { ProviderFactory } from "../pipeline/providers/ProviderFactory.js";
import { RegressionExtractor } from "../pipeline/analyzers/extractors/RegressionExtractor.js";
import { RegressionSelector } from "../pipeline/analyzers/regression/RegressionSelector.js";
import { AnalysisReporter } from "../pipeline/analyzers/shared/AnalysisReporter.js";
import type { AnalysisReport } from "../pipeline/analyzers/shared/models/AnalysisReport.js";

/**
 * Production-ready regression analysis command
 * Identifies tests that need updates based on recent failures and changes
 */

async function main(): Promise<void> {
  ensureScaffoldFiles();

  const startTime = Date.now();
  const allureDir = "allure-results";
  const reportDir = "reports/analysis";

  try {
    console.log("🔄 Analyzing test regressions from recent executions...\n");

    // Extract regression data from Allure
    const extractor = new RegressionExtractor();
    const regressionData = await extractor.analyzeFromAllure(allureDir);

    console.log(`  📊 Tests Analyzed: ${regressionData.affectedTests.length}`);
    console.log(`  🔴 Critical: ${regressionData.riskAssessment.criticalCount}`);
    console.log(`  🟠 High: ${regressionData.riskAssessment.highCount}`);
    console.log(`  🟡 Medium: ${regressionData.riskAssessment.mediumCount}\n`);

    // Get AI insights on affected components
    const provider = ProviderFactory.create();
    const selector = new RegressionSelector(provider);

    // Extract source files affected by regressions
    const affectedFiles = Array.from(
      new Set(regressionData.affectedTests.map(t => t.file))
    ).filter(f => f && f !== 'unknown').slice(0, 5);

    console.log(`  Analyzing affected components...\n`);

    let analysis: any = { recommendations: [] };
    if (affectedFiles.length > 0) {
      try {
        analysis = await selector.analyze(affectedFiles);
      } catch {
        // Continue without AI analysis if it fails
      }
    }

    const insights: any[] = [];

    // Create insights for critical/high priority tests
    const critical = regressionData.affectedTests.filter(t => t.riskLevel === 'critical');
    if (critical.length > 0) {
      insights.push({
        severity: 'critical',
        category: 'Regression Risk',
        title: `${critical.length} CRITICAL tests failing`,
        description: 'Core functionality is broken and needs immediate attention',
        affectedItems: critical.map(t => t.name),
        recommendation: 'Rollback or hot-fix required immediately',
        confidence: 95
      });
    }

    const high = regressionData.affectedTests.filter(t => t.riskLevel === 'high');
    if (high.length > 0) {
      insights.push({
        severity: 'high',
        category: 'Regression Risk',
        title: `${high.length} HIGH priority tests failing`,
        description: 'Important features are affected and should be fixed in current sprint',
        affectedItems: high.slice(0, 5).map(t => t.name),
        recommendation: 'Prioritize these fixes in current development cycle',
        confidence: 90
      });
    }

    // Add component-level insights
    if (affectedFiles.length > 0) {
      insights.push({
        severity: 'high',
        category: 'Component Impact',
        title: `${affectedFiles.length} components have failing tests`,
        description: 'Multiple components are affected by recent changes',
        affectedItems: affectedFiles,
        recommendation: 'Review changes in these components for breaking changes',
        confidence: 85
      });
    }

    const duration = Date.now() - startTime;

    // Create report
    const report: AnalysisReport = {
      metadata: {
        analysisType: 'regression',
        executedAt: new Date().toISOString(),
        executionDuration: duration,
        dataSource: allureDir,
        testsAnalyzed: regressionData.affectedTests.length,
        artifactsProcessed: regressionData.affectedTests.length,
        providerUsed: provider.constructor.name
      },
      result: {
        insights,
        statistics: {
          'Affected Tests': regressionData.affectedTests.length,
          'Critical': regressionData.riskAssessment.criticalCount,
          'High': regressionData.riskAssessment.highCount,
          'Medium': regressionData.riskAssessment.mediumCount,
          'Low': regressionData.riskAssessment.lowCount
        },
        summary: regressionData.summary,
        nextSteps: [
          critical.length > 0 ? '⚠️  URGENT: Fix critical failures before release' : 'Continue normal development',
          'Run full regression suite to identify hidden failures',
          'Review recent code changes for breaking modifications',
          high.length > 0 ? `Schedule fixes for ${high.length} high-priority failures` : 'Monitor medium-priority failures',
          'Implement automated regression tests for these scenarios'
        ]
      },
      errors: []
    };

    // Generate reports
    const reporter = new AnalysisReporter();
    const { jsonPath, htmlPath } = await reporter.generateReports(report, reportDir);

    console.log(`\n✅ Reports generated:`);
    console.log(`  📄 JSON: ${jsonPath}`);
    console.log(`  🌐 HTML: ${htmlPath}\n`);

  } catch (error) {
    console.error("❌ Analysis failed:", error);
    process.exit(1);
  }
}

main();
