export interface LocatorFailureDetail {
  // Allure failure metadata
  allureId: string;
  testName: string;
  testFile: string;
  failureMessage: string;
  failureTrace: string;

  // Extracted information
  brokenLocator: string | null;
  locatorPattern: string | null; // e.g., CSS, XPath, text
  failureReason: string; // e.g., "not found", "not visible", "timeout"
  
  // Context for healing
  pageObjectFile: string | null;
  pageObjectClass: string | null;
  locatorPropertyName: string | null;
  
  // Confidence metrics
  confidenceInExtraction: number; // 0-100
  isLocatorFailure: boolean;
  requiresAIHealing: boolean;

  // Timestamp
  timestamp: string;
}
