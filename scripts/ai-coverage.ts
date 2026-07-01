import "dotenv/config";
import { ensureScaffoldFiles } from "./ensureScaffold.js";
import { ProviderFactory } from "../pipeline/providers/ProviderFactory.js";
import { CoverageExtractor } from "../pipeline/analyzers/extractors/CoverageExtractor.js";
import { CoverageAnalyzer } from "../pipeline/analyzers/coverage/CoverageAnalyzer.js";
import { AnalysisReporter } from "../pipeline/analyzers/shared/AnalysisReporter.js";
import type { AnalysisReport } from "../pipeline/analyzers/shared/models/AnalysisReport.js";

/**
 * Production-ready test coverage analysis command
 * Analyzes requirements vs actual tests to identify coverage gaps
 */

async function main(): Promise<void> {
  ensureScaffoldFiles();

  const startTime = Date.now();
  const requirementsDir = "requirements";
  const testsDir = "tests";
  const reportDir = "reports/analysis";

  try {
    console.log("📋 Analyzing test coverage against requirements...\n");

    // Extract coverage data
    const extractor = new CoverageExtractor();
    const coverageData = await extractor.analyzeCoverage(requirementsDir, testsDir);

    console.log(`  📊 Requirements: ${coverageData.requirements.length}`);
    console.log(`  🧪 Test Cases: ${coverageData.tests.length}`);
    console.log(`  ✅ Coverage: ${coverageData.totalCoverage.toFixed(1)}%\n`);

    // Analyze gaps with AI
    const provider = ProviderFactory.create();
    const analyzer = new CoverageAnalyzer(provider);

    const uncovered = coverageData.requirements.filter(r => !r.covered);
    console.log(`  🔴 Uncovered Requirements: ${uncovered.length}\n`);

    // Get AI recommendations
    const analysis = await analyzer.analyze({
      requirements: coverageData.requirements.map(r => r.title),
      existingTests: coverageData.tests.map(t => t.name)
    });

    const insights: any[] = [];

    // Create insights from coverage gaps
    if (uncovered.length > 0) {
      insights.push({
        severity: uncovered.length > 5 ? 'critical' : 'high',
        category: 'Coverage Gap',
        title: `${uncovered.length} requirements lack test coverage`,
        description: `These requirements have not been mapped to any tests and need coverage.`,
        affectedItems: uncovered.slice(0, 10).map(r => `${r.id}: ${r.title}`),
        recommendation: 'Create tests for uncovered requirements to improve quality assurance',
        confidence: 95,
        evidence: [
          `Coverage: ${coverageData.totalCoverage.toFixed(1)}%`,
          `Uncovered: ${uncovered.length}/${coverageData.requirements.length}`
        ]
      });
    }

    if (coverageData.totalCoverage < 80) {
      insights.push({
        severity: 'high',
        category: 'Quality Assurance',
        title: 'Test coverage below recommended threshold',
        description: `Current coverage is ${coverageData.totalCoverage.toFixed(1)}%. Industry standard is 80%+.`,
        affectedItems: uncovered.map(r => r.id),
        recommendation: 'Prioritize writing tests for high-risk/critical path requirements',
        confidence: 90
      });
    }

    // Add insights from AI analysis
    if (analysis && typeof analysis === 'object' && 'recommendation' in analysis) {
      const recs = Array.isArray((analysis as any).recommendation) 
        ? (analysis as any).recommendation 
        : [(analysis as any).recommendation];
      
      recs.forEach((rec: string, idx: number) => {
        insights.push({
          severity: idx === 0 ? 'high' : 'medium',
          category: 'Testing Strategy',
          title: `Recommendation ${idx + 1}`,
          description: rec,
          affectedItems: [],
          recommendation: rec,
          confidence: 85
        });
      });
    }

    const duration = Date.now() - startTime;

    // Create report
    const report: AnalysisReport = {
      metadata: {
        analysisType: 'coverage',
        executedAt: new Date().toISOString(),
        executionDuration: duration,
        dataSource: `${requirementsDir}, ${testsDir}`,
        testsAnalyzed: coverageData.tests.length,
        artifactsProcessed: coverageData.requirements.length,
        providerUsed: provider.constructor.name
      },
      result: {
        insights,
        statistics: {
          'Total Requirements': coverageData.requirements.length,
          'Covered': (coverageData.requirements.length - uncovered.length),
          'Uncovered': uncovered.length,
          'Coverage %': coverageData.totalCoverage.toFixed(1),
          'Test Cases': coverageData.tests.length
        },
        summary: `Test coverage is at ${coverageData.totalCoverage.toFixed(1)}% with ${uncovered.length} ` +
          `uncovered requirements. Recommended action: prioritize writing tests for critical path requirements.`,
        nextSteps: [
          `Write tests for ${Math.min(5, uncovered.length)} highest-priority uncovered requirements`,
          'Improve requirement-to-test mapping process',
          'Establish 80%+ coverage as quality gate in CI/CD',
          'Document testing strategy for requirements',
          'Review and consolidate duplicate tests'
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
