import * as fs from "fs";
import * as path from "path";

/**
 * Extracts flaky test data from Allure execution results
 * Analyzes test execution history to identify patterns of failures/passes
 */

export interface FlakyTestData {
  testName: string;
  totalRuns: number;
  failureCount: number;
  passCount: number;
  flakynessPercentage: number;
  avgDuration: number;
  failureReasons: string[];
  lastRuns: Array<{
    status: 'passed' | 'failed';
    duration: number;
    timestamp: string;
    errorMessage?: string;
  }>;
}

export interface FlakyAnalysisInput {
  tests: FlakyTestData[];
  totalAnalyzedTests: number;
  analysisWindow: string; // e.g., "latest 50 runs"
}

export class FlakyTestExtractor {
  /**
   * Extract flaky test data from Allure result files
   * Groups results by test name and calculates flakiness metrics
   */
  async extractFromAllure(allureResultsDir: string): Promise<FlakyAnalysisInput> {
    if (!fs.existsSync(allureResultsDir)) {
      console.log(`  ℹ️  allure-results/ not found — returning empty dataset`);
      return { tests: [], totalAnalyzedTests: 0, analysisWindow: 'no data' };
    }

    const files = fs.readdirSync(allureResultsDir)
      .filter(f => f.endsWith('-result.json'))
      .sort()
      .slice(-100); // Latest 100 results

    const testResults: Map<string, Array<{
      status: 'passed' | 'failed';
      duration: number;
      timestamp: string;
      errorMessage?: string;
    }>> = new Map();

    // Parse Allure result files
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(allureResultsDir, file), 'utf-8');
        const result = JSON.parse(content);

        if (result.name && result.status) {
          const testName = result.name;
          if (!testResults.has(testName)) {
            testResults.set(testName, []);
          }

          const resultData = testResults.get(testName);
          if (resultData) {
            resultData.push({
              status: result.status as 'passed' | 'failed',
              duration: (result.stop || 0) - (result.start || 0) || 0,
              timestamp: new Date(result.start || 0).toISOString(),
              errorMessage: result.statusDetails?.message
            });
          }
        }
      } catch {
        // Skip invalid JSON files
      }
    }

    // Calculate flakiness metrics
    const tests: FlakyTestData[] = Array.from(testResults.entries())
      .map(([testName, runs]) => {
        if (!runs || runs.length === 0) {
          return null;
        }
        const passCount = runs.filter(r => r.status === 'passed').length;
        const failureCount = runs.filter(r => r.status === 'failed').length;
        const avgDuration = runs.reduce((sum, r) => sum + r.duration, 0) / runs.length;
        
        return {
          testName,
          totalRuns: runs.length,
          failureCount,
          passCount,
          flakynessPercentage: (failureCount / runs.length) * 100,
          avgDuration,
          failureReasons: [...new Set(runs
            .filter(r => r.status === 'failed' && r.errorMessage)
            .map(r => {
              const msg = r.errorMessage || 'Unknown error';
              return msg.split('\n')[0]?.substring(0, 100) || 'Unknown error';
            }))],
          lastRuns: runs.slice(-10)
        };
      })
      .filter((t): t is FlakyTestData => t !== null)
      .filter(t => t.totalRuns >= 3) // Only tests with 3+ runs
      .sort((a, b) => b.flakynessPercentage - a.flakynessPercentage);

    return {
      tests,
      totalAnalyzedTests: testResults.size,
      analysisWindow: `latest ${files.length} executions`
    };
  }
}
