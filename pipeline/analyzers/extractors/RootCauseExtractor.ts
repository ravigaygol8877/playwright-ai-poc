import * as fs from "fs";
import * as path from "path";

/**
 * Extracts root cause analysis data from Allure result files
 * Collects failure details, stack traces, logs, and screenshots
 */

export interface RootCauseFailure {
  testName: string;
  failureType: string; // "timeout", "assertion", "connection", etc.
  failureMessage: string;
  stackTrace: string;
  executionLog: string;
  screenshots: string[]; // File names
  duration: number;
  timestamp: string;
  errorDetails: {
    errorCode?: string;
    location?: string;
    context?: string;
  };
}

export interface RootCauseAnalysisInput {
  failures: RootCauseFailure[];
  totalFailuresAnalyzed: number;
  dataSource: string;
}

export class RootCauseExtractor {
  /**
   * Extract failure details from latest Allure results
   * Focuses on failed tests with detailed error information
   */
  async extractFromAllure(allureResultsDir: string): Promise<RootCauseAnalysisInput> {
    if (!fs.existsSync(allureResultsDir)) {
      console.log(`  ℹ️  allure-results/ not found — returning empty dataset`);
      return { failures: [], totalFailuresAnalyzed: 0, dataSource: allureResultsDir };
    }

    const files = fs.readdirSync(allureResultsDir)
      .filter(f => f.endsWith('-result.json'))
      .sort()
      .slice(-50); // Latest 50 results

    const failures: RootCauseFailure[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(allureResultsDir, file), 'utf-8');
        const result = JSON.parse(content);

        // Only process failed tests
        if (result.status === 'failed' && result.statusDetails) {
          const { message = '', trace = '' } = result.statusDetails;
          
          // Classify failure type
          const failureType = this.classifyFailure(message + '\n' + trace);
          
          // Extract error details
          const errorDetails = this.extractErrorDetails(message, trace);
          
          // Find associated attachments (screenshots, logs)
          const screenshots = this.findAttachments(allureResultsDir, result.uuid);

          failures.push({
            testName: result.name,
            failureType,
            failureMessage: message.substring(0, 500),
            stackTrace: trace.substring(0, 1000),
            executionLog: this.extractExecutionLog(trace),
            screenshots,
            duration: result.stop - result.start || 0,
            timestamp: new Date(result.start).toISOString(),
            errorDetails
          });
        }
      } catch {
        // Skip invalid JSON files
      }
    }

    return {
      failures: failures.slice(0, 20), // Top 20 failures
      totalFailuresAnalyzed: failures.length,
      dataSource: allureResultsDir
    };
  }

  /**
   * Classify failure type based on error message patterns
   */
  private classifyFailure(errorText: string): string {
    const text = errorText.toLowerCase();

    if (text.includes('timeout') || text.includes('exceeded')) return 'timeout';
    if (text.includes('connection refused') || text.includes('net::err_connection')) return 'connection_error';
    if (text.includes('assertion') || text.includes('expected')) return 'assertion_failure';
    if (text.includes('element not found') || text.includes('no element')) return 'locator_not_found';
    if (text.includes('not visible') || text.includes('not visible')) return 'visibility_issue';
    if (text.includes('cannot read property') || text.includes('undefined')) return 'null_reference';
    if (text.includes('cross-origin') || text.includes('security')) return 'security_issue';
    
    return 'unknown_error';
  }

  /**
   * Extract specific error details from message/trace
   */
  private extractErrorDetails(message: string, trace: string): {
    errorCode?: string;
    location?: string;
    context?: string;
  } {
    const details: any = {};

    // Extract error code if present
    const codeMatch = message.match(/error[:\s]+(\w+)/i);
    if (codeMatch) details.errorCode = codeMatch[1];

    // Extract location from stack trace
    const locationMatch = trace.match(/at\s+(\S+)\s+\(([^)]+)\)/);
    if (locationMatch) details.location = `${locationMatch[1]} (${locationMatch[2]})`;

    // Extract context
    const contextMatch = trace.match(/navigating to "([^"]+)"/i);
    if (contextMatch) details.context = contextMatch[1];

    return details;
  }

  /**
   * Extract relevant execution logs from stack trace
   */
  private extractExecutionLog(trace: string): string {
    const lines = trace.split('\n');
    const logLines = lines
      .filter(line => line.includes('Call log') || line.includes('-'))
      .slice(0, 10)
      .join('\n');
    
    return logLines || 'No execution log available';
  }

  /**
   * Find screenshot/video attachments for a test
   */
  private findAttachments(allureResultsDir: string, testUuid: string): string[] {
    try {
      const files = fs.readdirSync(allureResultsDir);
      return files
        .filter(f => f.startsWith(testUuid) && (f.endsWith('-attachment.png') || f.endsWith('-attachment.webm')))
        .slice(0, 3); // Limit to 3 attachments
    } catch {
      return [];
    }
  }
}
