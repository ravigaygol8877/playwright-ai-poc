export interface CoverageAnalysisResult {
  coveredRequirements: string[];

  missingCoverage: string[];

  coveragePercentage: number;

  recommendation: string;
}