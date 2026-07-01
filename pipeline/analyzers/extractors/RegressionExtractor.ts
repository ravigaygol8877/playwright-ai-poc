import * as fs from "fs";
import * as path from "path";

/**
 * Extracts regression analysis data by identifying tests that might be affected by recent failures
 * Analyzes failure patterns and source code changes
 */

export interface RegressionTest {
  name: string;
  file: string;
  affectedBy: string[]; // What this test depends on
  failureHistory: Array<{
    timestamp: string;
    reason: string;
  }>;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  recommendedAction: string;
}

export interface RegressionAnalysisInput {
  affectedTests: RegressionTest[];
  summary: string;
  riskAssessment: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
}

export class RegressionExtractor {
  /**
   * Analyze test failures from Allure to identify regression candidates
   */
  async analyzeFromAllure(allureResultsDir: string): Promise<RegressionAnalysisInput> {
    if (!fs.existsSync(allureResultsDir)) {
      console.log(`  ℹ️  allure-results/ not found — returning empty dataset`);
      return {
        affectedTests: [],
        summary: 'No allure-results available',
        riskAssessment: { criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0 },
      };
    }

    const files = fs.readdirSync(allureResultsDir)
      .filter(f => f.endsWith('-result.json'))
      .sort()
      .slice(-100); // Latest 100 results

    const failuresByTest: Map<string, Array<{
      timestamp: string;
      reason: string;
    }>> = new Map();

    // Collect recent failures
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(allureResultsDir, file), 'utf-8');
        const result = JSON.parse(content);

        if (result.status === 'failed' && result.statusDetails?.message) {
          const testName = result.name;
          if (!failuresByTest.has(testName)) {
            failuresByTest.set(testName, []);
          }

          failuresByTest.get(testName)!.push({
            timestamp: new Date(result.start).toISOString(),
            reason: result.statusDetails.message.split('\n')[0]
          });
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Identify affected tests and their risk levels
    const affectedTests: RegressionTest[] = Array.from(failuresByTest.entries())
      .map(([testName, failures]) => {
        const riskLevel = this.calculateRiskLevel(failures.length, testName);
        const dependencies = this.identifyDependencies(testName);

        return {
          name: testName,
          file: this.findTestFile(testName),
          affectedBy: dependencies,
          failureHistory: failures.slice(-5), // Last 5 failures
          riskLevel,
          recommendedAction: this.getRecommendation(riskLevel, failures)
        };
      })
      .sort((a, b) => {
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      });

    // Calculate statistics
    const riskAssessment = {
      criticalCount: affectedTests.filter(t => t.riskLevel === 'critical').length,
      highCount: affectedTests.filter(t => t.riskLevel === 'high').length,
      mediumCount: affectedTests.filter(t => t.riskLevel === 'medium').length,
      lowCount: affectedTests.filter(t => t.riskLevel === 'low').length
    };

    return {
      affectedTests,
      summary: this.generateSummary(affectedTests, riskAssessment),
      riskAssessment
    };
  }

  /**
   * Calculate risk level based on failure frequency and test name patterns
   */
  private calculateRiskLevel(failureCount: number, testName: string): 'critical' | 'high' | 'medium' | 'low' {
    const isCritical = testName.toLowerCase().includes('login') 
      || testName.toLowerCase().includes('checkout')
      || testName.toLowerCase().includes('payment');

    if (isCritical && failureCount >= 3) return 'critical';
    if (failureCount >= 5) return 'high';
    if (failureCount >= 3) return 'medium';
    return 'low';
  }

  /**
   * Identify what this test depends on (page objects, services, etc.)
   */
  private identifyDependencies(testName: string): string[] {
    // Simple heuristic: extract key components from test name
    const parts = testName.split(/[\s-_]+/);
    return parts
      .filter(p => p.length > 3)
      .slice(0, 3);
  }

  /**
   * Find the test file containing this test
   */
  private findTestFile(testName: string): string {
    try {
      const testsDir = 'tests';
      const files = this.getAllFiles(testsDir)
        .filter(f => f.endsWith('.spec.ts'));

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes(testName)) {
          return file.replace(process.cwd(), '.');
        }
      }
    } catch {
      // Silently continue
    }

    return 'unknown';
  }

  /**
   * Recursively get all files in a directory
   */
  private getAllFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];

    let files: string[] = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        files = files.concat(this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Get recommendation based on risk level
   */
  private getRecommendation(riskLevel: string, failures: any[]): string {
    const recentFailure = failures[failures.length - 1]?.reason || 'Unknown';

    switch (riskLevel) {
      case 'critical':
        return `URGENT: Fix immediately. Recent failure: ${recentFailure.substring(0, 50)}...`;
      case 'high':
        return `High priority. Review and update selectors/logic. ${failures.length} recent failures`;
      case 'medium':
        return `Medium priority. Monitor and refactor if needed. Pattern: ${recentFailure.substring(0, 40)}...`;
      case 'low':
      default:
        return `Low priority. Add to backlog for review.`;
    }
  }

  /**
   * Generate summary of regression analysis
   */
  private generateSummary(tests: RegressionTest[], stats: any): string {
    return `Regression Analysis: ${tests.length} affected tests identified. ` +
           `Critical: ${stats.criticalCount}, High: ${stats.highCount}, ` +
           `Medium: ${stats.mediumCount}, Low: ${stats.lowCount}`;
  }
}
