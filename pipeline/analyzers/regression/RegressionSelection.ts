export interface RegressionSelection {
  changedFiles: string[];

  impactedFeatures: string[];

  recommendedTests: string[];

  reasoning: string;
}