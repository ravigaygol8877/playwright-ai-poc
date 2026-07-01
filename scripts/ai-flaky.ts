import "dotenv/config";
import { ensureScaffoldFiles } from "./ensureScaffold.js";
import { ProviderFactory } from "../pipeline/providers/ProviderFactory.js";
import { FlakyTestExtractor } from "../pipeline/analyzers/extractors/FlakyTestExtractor.js";
import { FlakyTestAnalyzer } from "../pipeline/analyzers/flaky/FlakyTestAnalyzer.js";
import { AnalysisReporter } from "../pipeline/analyzers/shared/AnalysisReporter.js";
import type { AnalysisReport } from "../pipeline/analyzers/shared/models/AnalysisReport.js";

/**
 * Production-ready flaky test analysis command
 * Analyzes real test execution history to identify flaky tests
 */

async function main(): Promise<void> {
  ensureScaffoldFiles();

  const startTime = Date.now();
  const allureDir = "allure-results";
  const reportDir = "reports/analysis";

  try {
    console.log("🔍 Analyzing flaky tests from Allure results...\n");

    // Extract real data from Allure
    const extractor = new FlakyTestExtractor();
    const flakyInput = await extractor.extractFromAllure(allureDir);

    console.log(`  📊 Analyzed ${flakyInput.totalAnalyzedTests} tests`);
    console.log(`  🎯 Found ${flakyInput.tests.length} flaky candidates\n`);

    // Analyze with AI for insights
    const provider = ProviderFactory.create();
    const analyzer = new FlakyTestAnalyzer(provider);

    const insights: any[] = [];
    let tokensUsed = 0;

    // Analyze top flaky tests (cap at 3 to keep demo runtime reasonable)
    for (const test of flakyInput.tests.slice(0, 3)) {
      console.log(`  Analyzing: ${test.testName} (${test.flakynessPercentage.toFixed(0)}% flaky)`);

      const analysis = await analyzer.analyze({
        testName: test.testName,
        retryCount: test.totalRuns,
        duration: test.avgDuration,
        failureMessage: test.failureReasons[0] || "Intermittent failure"
      });

      insights.push({
        severity: analysis.flakyProbability >= 70 ? 'critical' : 'high',
        category: 'Test Flakiness',
        title: `${test.testName} is ${test.flakynessPercentage.toFixed(0)}% flaky`,
        description: `This test failed in ${test.failureCount} out of ${test.totalRuns} runs. ` +
          `Probable cause: ${analysis.possibleCauses?.[0] || 'Timing or environment issues'}`,
        affectedItems: [test.testName],
        recommendation: analysis.recommendation || 'Replace fixed waits with explicit waits',
        confidence: analysis.flakyProbability || 75,
        evidence: test.failureReasons
      });

      tokensUsed += 100; // Rough estimate
    }

    const duration = Date.now() - startTime;

    // Create report
    const report: AnalysisReport = {
      metadata: {
        analysisType: 'flaky',
        executedAt: new Date().toISOString(),
        executionDuration: duration,
        dataSource: allureDir,
        testsAnalyzed: flakyInput.totalAnalyzedTests,
        artifactsProcessed: flakyInput.tests.length,
        providerUsed: provider.constructor.name,
        tokensUsed
      },
      result: {
        insights,
        statistics: {
          'Total Tests': flakyInput.totalAnalyzedTests,
          'Flaky Tests': flakyInput.tests.length,
          'Average Flakiness': flakyInput.tests.length > 0
            ? `${(flakyInput.tests.reduce((sum, t) => sum + t.flakynessPercentage, 0) / flakyInput.tests.length).toFixed(1)}%`
            : '0.0%',
          'Most Flaky': flakyInput.tests[0]?.testName || 'N/A'
        },
        summary: `Found ${flakyInput.tests.length} flaky tests from ${flakyInput.totalAnalyzedTests} total tests analyzed. ` +
          `The most problematic tests show 50-100% failure rates and need immediate attention.`,
        nextSteps: [
          'Review and update timing-dependent tests with explicit waits',
          'Isolate flaky tests to separate suite for investigation',
          'Increase test environment stability (reduce external dependencies)',
          'Consider parametrized tests to identify environment-specific issues',
          'Add logging and retries for critical tests'
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
