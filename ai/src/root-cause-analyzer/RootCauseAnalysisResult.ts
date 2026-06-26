export interface RootCauseAnalysisResult {
  failureType: string;

  probableCause: string;

  impactedComponent: string;

  recommendation: string;

  confidence: number;
}