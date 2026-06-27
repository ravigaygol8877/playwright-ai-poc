export interface LocatorHealingResult {
  originalLocator: string;

  healedLocator: string;

  confidence: number;

  reasoning: string;
}