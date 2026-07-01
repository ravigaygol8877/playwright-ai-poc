/**
 * Enhanced Failure Classification
 * Distinguishes between:
 * - Broken selectors (element not found at all)
 * - Wrong expectations (element found but wrong state)
 * - Timing issues (race conditions)
 * - Non-healable issues (permission, app logic)
 */

export interface FailureClassification {
  type: "selector-broken" | "visibility-timing" | "flaky" | "non-healable";
  confidence: number; // 0-100
  reason: string;
  suggestion?: string;
  autoHealable: boolean;
}

export class FailureClassifier {
  /**
   * Classify a failure to understand if it can be auto-healed
   */
  classify(error: string, locator: string | null): FailureClassification {
    // Check for various patterns

    // Pattern 0: toBeVisible assertion failure — element not found means visibility issue,
    // not a broken selector (the locator syntax is correct, element just isn't present)
    if (this.isVisibilityAssertion(error)) {
      return {
        type: "visibility-timing",
        confidence: 85,
        reason: "toBeVisible() assertion failed — element not present or hidden, likely test state/environment issue",
        suggestion: "Check page state, authentication, and navigation before assertion",
        autoHealable: false,
      };
    }

    // Pattern 1: Element not found at all (non-assertion context — locator() itself failed)
    if (this.isElementNotFound(error)) {
      return {
        type: "selector-broken",
        confidence: 95,
        reason: "Element not found - selector is broken or changed",
        suggestion: "Try alternative selectors or manual inspection",
        autoHealable: true,
      };
    }

    // Pattern 2: Strict mode - multiple elements match
    if (this.isStrictModeViolation(error)) {
      return {
        type: "selector-broken",
        confidence: 85,
        reason: "Selector is too generic - matches multiple elements",
        suggestion: "Use more specific selector (ID, data-attribute, role)",
        autoHealable: true,
      };
    }

    // Pattern 3: Element found but not visible
    if (this.isVisibilityIssue(error)) {
      // Check if it's a timing issue or real issue
      if (this.likelyTimingIssue(error)) {
        return {
          type: "visibility-timing",
          confidence: 70,
          reason: "Element found but hidden - likely timing issue",
          suggestion: "Add explicit wait or increase timeout",
          autoHealable: true,
        };
      }
      
      return {
        type: "visibility-timing",
        confidence: 50,
        reason: "Element hidden - could be timing, UI, or permission issue",
        suggestion: "Requires investigation",
        autoHealable: false,
      };
    }

    // Pattern 4: Connection/Infrastructure errors
    if (this.isConnectionError(error)) {
      return {
        type: "non-healable",
        confidence: 95,
        reason: "Connection error - infrastructure/environment issue",
        suggestion: "Check if test server is running",
        autoHealable: false,
      };
    }

    // Pattern 5: Intermittent failures
    if (this.isLikelyFlaky(error)) {
      return {
        type: "flaky",
        confidence: 60,
        reason: "Intermittent failure - element sometimes exists",
        suggestion: "Add retry logic or fix race condition",
        autoHealable: false,
      };
    }

    // Pattern 6: Permission/Access issues
    if (this.isPermissionIssue(error)) {
      return {
        type: "non-healable",
        confidence: 90,
        reason: "Permission or access issue",
        suggestion: "Check test user permissions or access level",
        autoHealable: false,
      };
    }

    return {
      type: "selector-broken",
      confidence: 30,
      reason: "Unknown failure type",
      suggestion: "Review manually",
      autoHealable: false,
    };
  }

  /**
   * Check if this is a toBeVisible / toBeEnabled assertion failure.
   * These are NOT broken selectors — the locator syntax is valid,
   * the element just isn't visible at the time of assertion.
   */
  private isVisibilityAssertion(error: string): boolean {
    return /expect\(locator\)\.(toBeVisible|toBeEnabled|toBeChecked|toBeHidden)\(\)\s+failed/i.test(error);
  }

  /**
   * Check if element truly not found
   */
  private isElementNotFound(error: string): boolean {
    return /element.*not.*found|unable.*locate|no.*element.*matches|no match/i.test(
      error
    );
  }

  /**
   * Check for strict mode violation (multiple elements)
   */
  private isStrictModeViolation(error: string): boolean {
    return /strict mode|resolved to \d+ elements|multiple.*match/i.test(error);
  }

  /**
   * Check if visibility issue
   */
  private isVisibilityIssue(error: string): boolean {
    return /expected.*visible|hidden.*timeout|toBeVisible|toBeEnabled/i.test(
      error
    );
  }

  /**
   * Check if likely a timing issue
   */
  private likelyTimingIssue(error: string): boolean {
    return /loading|pending|animation|transition|async|wait|timeout|delayed/i.test(
      error
    );
  }

  /**
   * Check for connection errors
   */
  private isConnectionError(error: string): boolean {
    return /connection.*refused|ERR_CONNECTION|net::ERR|ECONNREFUSED|NS_ERROR/i.test(
      error
    );
  }

  /**
   * Check if likely flaky
   */
  private isLikelyFlaky(error: string): boolean {
    return /sometimes|intermittent|random|flaky|race|inconsistent/i.test(error);
  }

  /**
   * Check for permission issues
   */
  private isPermissionIssue(error: string): boolean {
    return /permission|access|denied|unauthorized|forbidden|security|auth/i.test(
      error
    );
  }
}
