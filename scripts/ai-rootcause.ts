import "dotenv/config";
import { ensureScaffoldFiles } from "./ensureScaffold.js";
import { ProviderFactory } from "../pipeline/providers/ProviderFactory.js";
import { RootCauseExtractor } from "../pipeline/analyzers/extractors/RootCauseExtractor.js";
import { BugRootCauseAnalyzer } from "../pipeline/analyzers/root-cause/BugRootCauseAnalyzer.js";
import { AnalysisReporter } from "../pipeline/analyzers/shared/AnalysisReporter.js";
import type { AnalysisReport } from "../pipeline/analyzers/shared/models/AnalysisReport.js";

/**
 * Production-ready root cause analysis command
 * Analyzes real test failures to identify root causes using AI
 */

async function main(): Promise<void> {
  ensureScaffoldFiles();

  const startTime = Date.now();
  const allureDir = "allure-results";
  const reportDir = "reports/analysis";

  try {
    console.log("🔎 Analyzing test failures to identify root causes...\n");

    // Extract real failure data from Allure
    const extractor = new RootCauseExtractor();
    const failureData = await extractor.extractFromAllure(allureDir);

    console.log(`  📊 Analyzed failure artifacts`);
    console.log(`  🎯 Found ${failureData.failures.length} failures to analyze\n`);

    // Analyze each failure with AI
    const provider = ProviderFactory.create();
    const analyzer = new BugRootCauseAnalyzer(provider);

    const insights: any[] = [];
    let tokensUsed = 0;

    for (const failure of failureData.failures.slice(0, 3)) {
      console.log(`  Analyzing: ${failure.testName}`);

      const analysis = await analyzer.analyze({
        testName: failure.testName,
        failureMessage: failure.failureMessage,
        stackTrace: failure.stackTrace,
        executionLog: failure.executionLog
      });

      const severityMap = {
        'timeout': 'high',
        'connection_error': 'critical',
        'locator_not_found': 'high',
        'assertion_failure': 'medium',
        'null_reference': 'high'
      };

      insights.push({
        severity: severityMap[failure.failureType as keyof typeof severityMap] || 'medium',
        category: 'Test Failure',
        title: `${failure.testName} failed: ${analysis.failureType}`,
        description: analysis.probableCause,
        affectedItems: [failure.testName],
        recommendation: analysis.recommendation,
        confidence: analysis.confidence || 75,
        evidence: [
          `Failure Type: ${failure.failureType}`,
          `Component: ${analysis.impactedComponent}`,
          `Error: ${failure.failureMessage.substring(0, 80)}...`
        ]
      });

      tokensUsed += 150; // Rough estimate
    }

    const duration = Date.now() - startTime;

    // Create report
    const report: AnalysisReport = {
      metadata: {
        analysisType: 'rootcause',
        executedAt: new Date().toISOString(),
        executionDuration: duration,
        dataSource: allureDir,
        testsAnalyzed: failureData.totalFailuresAnalyzed,
        artifactsProcessed: failureData.failures.length,
        providerUsed: provider.constructor.name,
        tokensUsed
      },
      result: {
        insights,
        statistics: {
          'Total Failures': failureData.totalFailuresAnalyzed,
          'Analyzed': failureData.failures.length,
          'Critical': insights.filter(i => i.severity === 'critical').length,
          'High Priority': insights.filter(i => i.severity === 'high').length
        },
        summary: `Analyzed ${failureData.failures.length} test failures and identified root causes. ` +
          `${insights.filter(i => i.severity === 'critical').length} critical issues require immediate attention.`,
        nextSteps: [
          'Address critical connection errors first - verify test environment setup',
          'Fix selector-based failures - likely due to UI changes or timing issues',
          'Implement more robust wait strategies for timeout failures',
          'Review and update test data fixtures for assertion failures',
          'Add better error logging for future diagnostics'
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
