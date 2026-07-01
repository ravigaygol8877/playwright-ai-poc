import * as fs from "fs";
import * as path from "path";

/**
 * Extracts test coverage data by analyzing test code and requirements
 * Matches tests to requirements to identify coverage gaps
 */

export interface RequirementItem {
  id: string;
  title: string;
  description: string;
  covered: boolean;
  associatedTests: string[];
}

export interface TestItem {
  name: string;
  file: string;
  tags: string[];
  description: string;
  duration?: number;
  status?: 'passed' | 'failed' | 'skipped';
}

export interface CoverageAnalysisInput {
  requirements: RequirementItem[];
  tests: TestItem[];
  totalCoverage: number; // percentage
  uncoveredCount: number;
}

export class CoverageExtractor {
  /**
   * Extract requirements from markdown files in requirements directory
   */
  private async extractRequirements(requirementsDir: string): Promise<RequirementItem[]> {
    const requirements: RequirementItem[] = [];

    if (!fs.existsSync(requirementsDir)) {
      return requirements;
    }

    const files = fs.readdirSync(requirementsDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(requirementsDir, file), 'utf-8');
      const lines = content.split('\n');

      let currentReq: Partial<RequirementItem> | null = null;

      for (const line of lines) {
        // Match requirement headers (e.g., ## REQ_001: User Login)
        const reqMatch = line.match(/##\s+(REQ_\d+):\s*(.+)/);
        if (reqMatch) {
          if (currentReq && currentReq.id) requirements.push(currentReq as RequirementItem);
          
          currentReq = {
            id: reqMatch[1] || '',
            title: reqMatch[2] || '',
            description: '',
            covered: false,
            associatedTests: []
          };
        } else if (currentReq && line.trim() && !line.startsWith('#')) {
          currentReq.description += (currentReq.description ? ' ' : '') + line.trim();
        }
      }

      if (currentReq && currentReq.id) requirements.push(currentReq as RequirementItem);
    }

    return requirements;
  }

  /**
   * Extract test data from test files
   */
  private async extractTests(testsDir: string): Promise<TestItem[]> {
    const tests: TestItem[] = [];

    if (!fs.existsSync(testsDir)) {
      return tests;
    }

    const extractFromDir = (dir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          extractFromDir(filePath);
        } else if (file.endsWith('.ts') && !file.endsWith('.page.ts')) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Extract test names and descriptions
          const testMatches = content.matchAll(/test\(['"]([^'"]+)['"]/g);
          const descMatches = content.matchAll(/describe\(['"]([^'"]+)['"]/g);
          
          for (const match of testMatches) {
            const testName = match[1] || 'unknown';
            const tagsMatch = content.match(/@(\w+)/g) || [];
            const tags = tagsMatch.map(t => t.substring(1));

            tests.push({
              name: testName,
              file: filePath.replace(process.cwd(), '.'),
              tags,
              description: testName,
              status: 'passed'
            });
          }
        }
      }
    };

    try {
      extractFromDir(testsDir);
    } catch {
      // Silently continue if test directory doesn't exist
    }
    return tests;
  }

  /**
   * Match tests to requirements using keyword matching
   */
  private matchTestsToRequirements(
    requirements: RequirementItem[],
    tests: TestItem[]
  ): RequirementItem[] {
    return requirements.map(req => {
      const matched = tests.filter(test => {
        const reqText = (req.title + ' ' + req.description).toLowerCase();
        const testText = (test.name + ' ' + test.description).toLowerCase();
        
        // Simple keyword matching
        const keywords = req.title.split(/\s+/).filter(w => w.length > 3);
        return keywords.some(keyword => testText.includes(keyword.toLowerCase()));
      });

      return {
        ...req,
        covered: matched.length > 0,
        associatedTests: matched.map(t => t.name)
      };
    });
  }

  /**
   * Analyze coverage across requirements and tests
   */
  async analyzeCoverage(
    requirementsDir: string,
    testsDir: string
  ): Promise<CoverageAnalysisInput> {
    const requirements = await this.extractRequirements(requirementsDir);
    const tests = await this.extractTests(testsDir);

    const matched = this.matchTestsToRequirements(requirements, tests);
    
    const covered = matched.filter(r => r.covered).length;
    const totalCoverage = requirements.length > 0 ? (covered / requirements.length) * 100 : 0;
    const uncoveredCount = requirements.length - covered;

    return {
      requirements: matched,
      tests,
      totalCoverage,
      uncoveredCount
    };
  }
}
