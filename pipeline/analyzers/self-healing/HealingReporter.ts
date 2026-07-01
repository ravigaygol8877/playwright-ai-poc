import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import type { HealingReport } from "./models/HealingReport.js";

export class HealingReporter {
  /**
   * Generates comprehensive healing report and saves to disk.
   */
  generateReport(report: HealingReport, outputDir: string = "reports/healing"): { reportPath: string; htmlPath: string } {
    this.ensureReportDir(outputDir);
    this.clearPreviousReports(outputDir);

    const reportDate = new Date().toISOString().replace(/[:.]/g, "-");
    const reportPath = path.join(outputDir, `healing-report-${reportDate}.json`);
    const htmlPath = path.join(outputDir, `healing-report-${reportDate}.html`);

    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
    console.log(`✅ JSON Report: ${reportPath}`);

    // Generate and save HTML report
    const html = this.generateHTMLReport(report);
    fs.writeFileSync(htmlPath, html, "utf-8");
    console.log(`✅ HTML Report: ${htmlPath}`);

    // Print clickable file URL
    const absoluteHtmlPath = path.resolve(htmlPath);
    console.log(`\n🌐 Open report: file://${absoluteHtmlPath}`);

    // Generate summary to console
    this.printConsoleSummary(report);

    return { reportPath, htmlPath };
  }

  /**
   * Generates human-readable HTML report.
   */
  private generateHTMLReport(report: HealingReport): string {
    const successRate = report.healingSuccessRate.toFixed(1);
    const duration = (report.executionDurationMs / 1000).toFixed(2);

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Self-Healing Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .header p { font-size: 1.1em; opacity: 0.9; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 40px;
      background: #f8f9fa;
    }
    .metric {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .metric .label {
      font-size: 0.9em;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .metric .value {
      font-size: 2em;
      font-weight: bold;
      color: #667eea;
    }
    .metric.success .value { color: #28a745; }
    .metric.warning .value { color: #ffc107; }
    .metric.danger .value { color: #dc3545; }
    .section {
      padding: 40px;
      border-bottom: 1px solid #eee;
    }
    .section h2 {
      font-size: 1.8em;
      margin-bottom: 20px;
      color: #667eea;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #666;
      border-bottom: 2px solid #ddd;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    tr:hover { background: #f8f9fa; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .badge.success { background: #d4edda; color: #155724; }
    .badge.warning { background: #fff3cd; color: #856404; }
    .badge.danger { background: #f8d7da; color: #721c24; }
    .confidence-bar {
      width: 100%;
      height: 8px;
      background: #eee;
      border-radius: 4px;
      overflow: hidden;
    }
    .confidence-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
    }
    .locator-diff {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.85em;
      margin: 10px 0;
    }
    .locator-diff .old { color: #dc3545; text-decoration: line-through; }
    .locator-diff .new { color: #28a745; }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔧 AI Self-Healing Report</h1>
      <p>Automated Playwright Test Locator Repair</p>
    </div>

    <div class="metrics">
      <div class="metric ${report.healedCount > 0 ? 'success' : ''}">
        <div class="label">Tests Healed</div>
        <div class="value">${report.healedCount}</div>
      </div>
      <div class="metric">
        <div class="label">Success Rate</div>
        <div class="value">${successRate}%</div>
      </div>
      <div class="metric">
        <div class="label">Total Failures</div>
        <div class="value">${report.totalFailures}</div>
      </div>
      <div class="metric">
        <div class="label">Locator Failures</div>
        <div class="value">${report.locatorFailures}</div>
      </div>
      <div class="metric ${report.skippedFailures.length > 0 ? 'warning' : ''}">
        <div class="label">Skipped (Non-Healable)</div>
        <div class="value">${report.skippedFailures.length}</div>
      </div>
      <div class="metric ${report.failedToHeal.length > 0 ? 'danger' : 'success'}">
        <div class="label">AI Attempts Failed</div>
        <div class="value">${report.failedToHeal.length}</div>
      </div>
      <div class="metric">
        <div class="label">Files Modified</div>
        <div class="value">${report.filesModified.length}</div>
      </div>
      <div class="metric">
        <div class="label">Execution Time</div>
        <div class="value">${duration}s</div>
      </div>
      <div class="metric ${report.estimatedTokensSaved > 0 ? 'success' : ''}">
        <div class="label">Tokens Saved</div>
        <div class="value">${report.estimatedTokensSaved.toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="label">AI Calls</div>
        <div class="value">${report.aiCallsMade}</div>
      </div>
    </div>
`;

    if (report.successfulHeals.length > 0) {
      html += `
    <div class="section">
      <h2>✅ Successfully Healed (${report.successfulHeals.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Property</th>
            <th>Old Selector</th>
            <th>New Selector</th>
            <th>Confidence</th>
            <th>Method</th>
          </tr>
        </thead>
        <tbody>
`;

      for (const heal of report.successfulHeals) {
        const confBadge =
          heal.confidence >= 85
            ? 'success'
            : heal.confidence >= 70
              ? 'warning'
              : 'danger';
        html += `
          <tr>
            <td>${this.escapeHtml(heal.testName)}</td>
            <td><code>${heal.locatorPropertyName}</code></td>
            <td><code>${this.escapeHtml(heal.originalLocator)}</code></td>
            <td><code>${this.escapeHtml(heal.healedLocator)}</code></td>
            <td>
              <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${heal.confidence}%"></div>
              </div>
              ${heal.confidence}%
            </td>
            <td><span class="badge ${confBadge}">${heal.method}</span></td>
          </tr>
`;
      }

      html += `
        </tbody>
      </table>
    </div>
`;
    }

    if (report.insufficientConfidenceHeals.length > 0) {
      html += `
    <div class="section">
      <h2>⚠️ Insufficient Confidence (${report.insufficientConfidenceHeals.length})</h2>
      <p style="margin-bottom:16px;color:#666;">These heals were <strong>not applied</strong> — confidence was below the threshold. Manual review recommended.</p>
      <table>
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Property</th>
            <th>Suggested Selector</th>
            <th>Confidence</th>
            <th>Reasoning</th>
          </tr>
        </thead>
        <tbody>
`;

      for (const heal of report.insufficientConfidenceHeals) {
        html += `
          <tr>
            <td>${this.escapeHtml(heal.testName)}</td>
            <td><code>${heal.locatorPropertyName}</code></td>
            <td><code>${this.escapeHtml(heal.healedLocator)}</code></td>
            <td>${heal.confidence}%</td>
            <td>${this.escapeHtml(heal.reasoning)}</td>
          </tr>
`;
      }

      html += `
        </tbody>
      </table>
    </div>
`;
    }

    if (report.skippedFailures.length > 0) {
      const typeBadgeColor = (type: string) => {
        switch (type) {
          case 'visibility-timing': return 'warning';
          case 'flaky': return 'warning';
          case 'non-healable': return 'danger';
          default: return 'danger';
        }
      };
      html += `
    <div class="section">
      <h2>⏭️ Skipped — Not Auto-Healable (${report.skippedFailures.length})</h2>
      <p style="margin-bottom:16px;color:#666;">These failures were correctly identified as <strong>non-healable locator issues</strong>. The selector syntax is valid — the root cause is test state, environment, or application logic. No POM changes were made.</p>
      <table>
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Broken Locator</th>
            <th>Failure Type</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
`;

      for (const skipped of report.skippedFailures) {
        html += `
          <tr>
            <td>${this.escapeHtml(skipped.testName)}</td>
            <td><code>${this.escapeHtml(skipped.brokenLocator ?? '—')}</code></td>
            <td><span class="badge ${typeBadgeColor(skipped.type)}">${this.escapeHtml(skipped.type)}</span></td>
            <td>${this.escapeHtml(skipped.reason)}</td>
          </tr>
`;
      }

      html += `
        </tbody>
      </table>
    </div>
`;
    }

    if (report.failedToHeal.length > 0) {
      html += `
    <div class="section">
      <h2>❌ AI Attempted but Failed to Heal (${report.failedToHeal.length})</h2>
      <p style="margin-bottom:16px;color:#666;">The AI attempted to generate a fix for these failures but could not produce a valid selector. Manual intervention required.</p>
      <ul style="list-style:none;padding:0;">
`;

      for (const id of report.failedToHeal) {
        html += `<li style="padding:6px 0;font-family:monospace;color:#666;">${this.escapeHtml(id)}</li>`;
      }

      html += `
      </ul>
    </div>
`;
    }

    if (report.filesModified.length > 0) {
      html += `
    <div class="section">
      <h2>📝 Modified Files</h2>
      <ul>
`;

      for (const file of report.filesModified) {
        html += `<li><code>${this.escapeHtml(file)}</code></li>`;
      }

      html += `
      </ul>
    </div>
`;
    }

    if (report.validationPerformed && report.validationResults) {
      const { rerunTests, rerunPassed, rerunFailed, specResults } = report.validationResults;
      html += `
    <div class="section">
      <h2>🔄 Re-run Validation (${rerunTests.length} specs)</h2>
      <p style="margin-bottom:16px;color:#666;">Affected spec files were re-run after POM updates to confirm heals.</p>
      <div style="display:flex;gap:20px;margin-bottom:16px;">
        <span style="color:#28a745;font-weight:bold;">✅ Passed: ${rerunPassed}</span>
        <span style="color:#dc3545;font-weight:bold;">❌ Failed: ${rerunFailed}</span>
      </div>
      <table>
        <thead><tr><th>Spec File</th><th>Result</th></tr></thead>
        <tbody>
`;
      for (const [spec, passed] of Object.entries(specResults)) {
        html += `<tr><td><code>${this.escapeHtml(spec)}</code></td><td><span class="badge ${passed ? 'success' : 'danger'}">${passed ? 'PASSED' : 'FAILED'}</span></td></tr>`;
      }
      html += `</tbody></table></div>`;
    }

    if (report.errors.length > 0) {
      html += `
    <div class="section">
      <h2>⚠️  Errors</h2>
      <table>
        <thead>
          <tr>
            <th>Stage</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
`;

      for (const error of report.errors) {
        html += `
          <tr>
            <td>${this.escapeHtml(error.stage)}</td>
            <td>${this.escapeHtml(error.error)}</td>
          </tr>
`;
      }

      html += `
        </tbody>
      </table>
    </div>
`;
    }

    html += `
    <div class="footer">
      <p>Execution ID: <code>${report.executionId}</code></p>
      <p>Generated: ${report.timestamp}</p>
    </div>
  </div>
</body>
</html>
`;

    return html;
  }

  /**
   * Prints console summary of healing report.
   */
  private printConsoleSummary(report: HealingReport): void {
    console.log("\n" + "=".repeat(70));
    console.log("📊 AI SELF-HEALING REPORT");
    console.log("=".repeat(70));
    console.log(`\nExecution ID: ${report.executionId}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Duration: ${(report.executionDurationMs / 1000).toFixed(2)}s`);

    console.log("\n📈 SUMMARY");
    console.log(`  Total Failures:            ${report.totalFailures}`);
    console.log(`  Locator Failures:          ${report.locatorFailures}`);
    console.log(`  Successfully Healed:       ${report.healedCount}`);
    console.log(`  Success Rate:              ${report.healingSuccessRate.toFixed(1)}%`);
    console.log(`  Skipped (Non-Healable):    ${report.skippedFailures.length}`);
    console.log(`  AI Attempts Failed:        ${report.failedToHeal.length}`);

    console.log("\n💰 EFFICIENCY");
    console.log(`  AI Calls Made:             ${report.aiCallsMade}`);
    console.log(`  Prompts Cached:            ${report.promptsCached}`);
    console.log(
      `  Estimated Tokens Saved:    ${report.estimatedTokensSaved.toLocaleString()}`
    );

    if (report.filesModified.length > 0) {
      console.log("\n📝 MODIFIED FILES");
      for (const file of report.filesModified) {
        console.log(`  ✅ ${file}`);
      }
    }

    if (report.errors.length > 0) {
      console.log("\n⚠️  ERRORS");
      for (const error of report.errors) {
        console.log(`  [${error.stage}] ${error.error}`);
      }
    }

    console.log("\n" + "=".repeat(70) + "\n");
  }

  /**
   * Escapes HTML special characters.
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (char) => map[char] ?? char);
  }

  /**
   * Removes all previously generated report files from the directory.
   * Called before writing the new report so only the latest is retained.
   */
  private clearPreviousReports(dir: string): void {
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const ext = path.extname(entry);
        if (ext === '.json' || ext === '.html') {
          fs.unlinkSync(path.join(dir, entry));
        }
      }
    } catch {
      // best-effort — don't fail the report if cleanup fails
    }
  }

  /**
   * Ensures report directory exists.
   */
  private ensureReportDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
