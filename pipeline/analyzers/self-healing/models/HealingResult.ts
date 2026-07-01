export interface HealingResult {
  allureId: string;
  testName: string;
  
  // Original vs Healed
  originalLocator: string;
  healedLocator: string;
  locatorPropertyName: string;
  
  // Healing metadata
  confidence: number; // 0-100
  reasoning: string;
  method: 'kb-match' | 'ai-generated' | 'ai-suggested';
  
  // Update info
  pomFile: string;
  pomClass: string;
  
  // Backup info
  backupVersion: string;
  changeHash: string;
  
  // Validation (after optional re-run)
  validated: boolean;
  rerunPassed: boolean | null;
  validationError: string | null;
}
