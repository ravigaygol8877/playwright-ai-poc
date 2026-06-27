export interface FlakyTestAnalysis {
  testName: string;

  flakyProbability: number;

  possibleCauses: string[];

  recommendation: string;
}