/**
 * Generic analysis report structure used across all ai:* commands
 * Provides consistent reporting format for different analysis types
 */

export interface AnalysisMetadata {
  analysisType: 'flaky' | 'rootcause' | 'coverage' | 'regression';
  executedAt: string; // ISO timestamp
  executionDuration: number; // milliseconds
  dataSource: string; // e.g., "allure-results/", "tests/UI", "requirements/"
  testsAnalyzed: number;
  artifactsProcessed: number;
  providerUsed?: string; // LLM provider used
  tokensUsed?: number;
}

export interface AnalysisStatistics {
  [key: string]: number | string; // Flexible stats per analysis type
}

export interface AnalysisInsight {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  affectedItems: string[]; // test names, files, requirements, etc.
  recommendation: string;
  confidence: number; // 0-100
  evidence?: string[]; // Data points supporting this insight
}

export interface AnalysisResult {
  insights: AnalysisInsight[];
  statistics: AnalysisStatistics;
  summary: string;
  nextSteps: string[];
}

export interface AnalysisReport {
  metadata: AnalysisMetadata;
  result: AnalysisResult;
  errors: Array<{
    source: string;
    message: string;
    severity: 'warning' | 'error';
  }>;
}
