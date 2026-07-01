import * as fs from "fs";
import * as path from "path";
import type { AnalysisReport } from "./models/AnalysisReport.js";

/**
 * Professional reporting for AI analysis results
 * Generates JSON, HTML, and console outputs
 */

export class AnalysisReporter {
  /**
   * Generate all reports (JSON, HTML, console)
   */
  async generateReports(report: AnalysisReport, outputDir: string): Promise<{
    jsonPath: string;
    htmlPath: string;
    timestamp: string;
  }> {
    const isoString = new Date().toISOString();
    const parts = isoString.split('T');
    const datePart = parts[0] || '';
    const timePart = (parts[1] || '').split('.')[0]?.replace(/:/g, '-') || '';
    const timestamp = `${datePart}_${timePart}`;
    
    const analysisType = report.metadata.analysisType;
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Remove previous reports for this analysis type so only the latest is kept
    this.clearPreviousReports(outputDir, analysisType);

    // Generate JSON report
    const jsonPath = path.join(outputDir, `${analysisType}-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlPath = path.join(outputDir, `${analysisType}-report-${timestamp}.html`);
    const htmlContent = this.generateHTMLReport(report);
    fs.writeFileSync(htmlPath, htmlContent);

    // Print console summary
    this.printConsoleSummary(report);

    return { jsonPath, htmlPath, timestamp };
  }

  /**
   * Removes previous report files for the given analysis type from the output directory.
   * Keyed by analysisType prefix so flaky, rootcause, regression and coverage reports
   * each only clear their own files, not each other's.
   */
  private clearPreviousReports(dir: string, analysisType: string): void {
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith(`${analysisType}-report-`) &&
            (entry.endsWith('.json') || entry.endsWith('.html'))) {
          fs.unlinkSync(path.join(dir, entry));
        }
      }
    } catch {
      // best-effort — don't fail the report if cleanup fails
    }
  }

  /**
   * Generate interactive HTML report
   */
  private generateHTMLReport(report: AnalysisReport): string {
    const { metadata, result, errors } = report;
    const insightCount = result?.insights?.length || 0;
    const criticalCount = result?.insights?.filter(i => i.severity === 'critical').length || 0;
    const highCount = result?.insights?.filter(i => i.severity === 'high').length || 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.analysisType.toUpperCase()} Analysis Report</title>
  <style>
    :root {
      --primary: #0066cc;
      --danger: #dc3545;
      --warning: #ff9800;
      --success: #28a745;
      --info: #17a2b8;
      --light: #f8f9fa;
      --dark: #333;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    header p {
      opacity: 0.9;
      font-size: 1.1em;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 40px;
      background: var(--light);
      border-bottom: 1px solid #ddd;
    }
    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid var(--primary);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .metric-card.danger { border-left-color: var(--danger); }
    .metric-card.warning { border-left-color: var(--warning); }
    .metric-card.success { border-left-color: var(--success); }
    .metric-value {
      font-size: 2em;
      font-weight: bold;
      color: var(--primary);
    }
    .metric-card.danger .metric-value { color: var(--danger); }
    .metric-card.warning .metric-value { color: var(--warning); }
    .metric-card.success .metric-value { color: var(--success); }
    .metric-label {
      color: #666;
      font-size: 0.9em;
      margin-top: 8px;
    }
    .content {
      padding: 40px;
    }
    .summary {
      background: var(--light);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      border-left: 4px solid var(--info);
    }
    .summary h2 {
      margin-bottom: 10px;
      color: var(--dark);
    }
    .summary p {
      color: #666;
      line-height: 1.6;
    }
    .insights-section h2 {
      margin: 30px 0 20px;
      color: var(--dark);
      border-bottom: 2px solid var(--primary);
      padding-bottom: 10px;
    }
    .insight-item {
      background: var(--light);
      padding: 20px;
      margin-bottom: 15px;
      border-radius: 8px;
      border-left: 4px solid var(--info);
    }
    .insight-item.critical { border-left-color: var(--danger); }
    .insight-item.high { border-left-color: var(--warning); }
    .insight-item.medium { border-left-color: #ffc107; }
    .insight-item.low { border-left-color: var(--success); }
    .insight-title {
      font-weight: bold;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .severity-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 0.8em;
      font-weight: bold;
      color: white;
    }
    .severity-badge.critical { background: var(--danger); }
    .severity-badge.high { background: var(--warning); }
    .severity-badge.medium { background: #ffc107; color: #333; }
    .severity-badge.low { background: var(--success); }
    .insight-description {
      color: #666;
      margin-bottom: 10px;
      line-height: 1.6;
    }
    .insight-items {
      background: white;
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
      font-size: 0.9em;
      color: #555;
    }
    .insight-items strong {
      display: block;
      margin-bottom: 5px;
      color: var(--dark);
    }
    .insight-items ul {
      margin-left: 20px;
      line-height: 1.8;
    }
    .recommendation {
      background: #f0f8ff;
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
      font-size: 0.9em;
      color: #0066cc;
      border-left: 3px solid #0066cc;
    }
    .next-steps {
      background: var(--light);
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
    }
    .next-steps h3 {
      margin-bottom: 15px;
      color: var(--dark);
    }
    .next-steps ol {
      margin-left: 20px;
      line-height: 2;
      color: #666;
    }
    .errors {
      background: #fff3cd;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
      border-left: 4px solid var(--warning);
    }
    .errors h3 {
      margin-bottom: 10px;
      color: var(--dark);
    }
    .error-item {
      margin: 10px 0;
      padding: 10px;
      background: white;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .error-item.warning { border-left: 3px solid var(--warning); }
    .error-item.error { border-left: 3px solid var(--danger); color: var(--danger); }
    footer {
      background: var(--light);
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 0.9em;
      border-top: 1px solid #ddd;
    }
    .metadata-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 20px;
      font-size: 0.9em;
      color: #666;
    }
    .metadata-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #ddd;
    }
    .metadata-item strong { color: var(--dark); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${metadata.analysisType.toUpperCase()} Analysis Report</h1>
      <p>Automated AI-powered test analysis and recommendations</p>
    </header>

    <div class="metrics">
      <div class="metric-card ${criticalCount > 0 ? 'danger' : 'success'}">
        <div class="metric-value">${criticalCount}</div>
        <div class="metric-label">Critical Issues</div>
      </div>
      <div class="metric-card ${highCount > 0 ? 'warning' : 'success'}">
        <div class="metric-value">${highCount}</div>
        <div class="metric-label">High Priority</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${insightCount}</div>
        <div class="metric-label">Total Insights</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${Math.round(metadata.executionDuration / 1000)}s</div>
        <div class="metric-label">Analysis Time</div>
      </div>
    </div>

    <div class="content">
      <div class="summary">
        <h2>Analysis Summary</h2>
        <p>${this.escapeHtml(result?.summary || 'Analysis completed')}</p>
      </div>

      <div class="metadata-info">
        <div class="metadata-item">
          <strong>Analysis Type:</strong>
          <span>${metadata.analysisType}</span>
        </div>
        <div class="metadata-item">
          <strong>Executed At:</strong>
          <span>${new Date(metadata.executedAt).toLocaleString()}</span>
        </div>
        <div class="metadata-item">
          <strong>Data Source:</strong>
          <span>${metadata.dataSource}</span>
        </div>
        <div class="metadata-item">
          <strong>Tests Analyzed:</strong>
          <span>${metadata.testsAnalyzed}</span>
        </div>
        ${metadata.tokensUsed ? `<div class="metadata-item">
          <strong>Tokens Used:</strong>
          <span>${metadata.tokensUsed}</span>
        </div>` : ''}
      </div>

      <div class="insights-section">
        <h2>🔍 Key Insights</h2>
        ${result.insights.length > 0 ? result.insights.map(insight => `
          <div class="insight-item ${insight.severity}">
            <div class="insight-title">
              <span class="severity-badge ${insight.severity}">${insight.severity.toUpperCase()}</span>
              <strong>${this.escapeHtml(insight.title || 'Insight')}</strong>
            </div>
            <div class="insight-description">${this.escapeHtml(insight.description || 'No description')}</div>
            ${insight.affectedItems.length > 0 ? `
              <div class="insight-items">
                <strong>Affected Items (${insight.affectedItems.length}):</strong>
                <ul>${insight.affectedItems.slice(0, 5).map(item => `
                  <li>${this.escapeHtml(item)}</li>
                `).join('')}${insight.affectedItems.length > 5 ? `
                  <li>... and ${insight.affectedItems.length - 5} more</li>
                ` : ''}</ul>
              </div>
            ` : ''}
            <div class="recommendation">
              <strong>📌 Recommendation:</strong> ${this.escapeHtml(insight.recommendation || 'See above for details')}
            </div>
            <div class="insight-items" style="margin-top: 10px;">
              <strong>Confidence: ${insight.confidence}%</strong>
            </div>
          </div>
        `).join('') : '<p style="color: #666;">No critical insights found.</p>'}
      </div>

      ${result.nextSteps.length > 0 ? `
        <div class="next-steps">
          <h3>📋 Next Steps</h3>
          <ol>${result.nextSteps.map(step => `
            <li>${this.escapeHtml(step)}</li>
          `).join('')}</ol>
        </div>
      ` : ''}

      ${errors.length > 0 ? `
        <div class="errors">
          <h3>⚠️ Warnings & Errors (${errors.length})</h3>
          ${errors.map(error => `
            <div class="error-item ${error.severity}">
              <strong>${this.escapeHtml(error.source)}:</strong> ${this.escapeHtml(error.message)}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>

    <footer>
      <p>Generated on ${new Date().toLocaleString()} | AI Analysis Report v1.0</p>
    </footer>
  </div>
</body>
</html>`;
  }

  /**
   * Print console summary
   */
  private printConsoleSummary(report: AnalysisReport): void {
    const { metadata, result, errors } = report;
    if (!result) return;

    console.log('\n' + '='.repeat(80));
    console.log(`📊 ${metadata.analysisType.toUpperCase()} ANALYSIS REPORT`.padStart(50));
    console.log('='.repeat(80));

    console.log(`\n📈 SUMMARY`);
    console.log(`  Type: ${metadata.analysisType}`);
    console.log(`  Executed: ${new Date(metadata.executedAt).toLocaleString()}`);
    console.log(`  Duration: ${metadata.executionDuration}ms`);
    console.log(`  Tests Analyzed: ${metadata.testsAnalyzed}`);
    console.log(`  Artifacts Processed: ${metadata.artifactsProcessed}`);

    if (metadata.tokensUsed) {
      console.log(`  Tokens Used: ${metadata.tokensUsed}`);
    }

    console.log(`\n${result.summary}`);

    const criticalCount = result.insights.filter(i => i.severity === 'critical').length;
    const highCount = result.insights.filter(i => i.severity === 'high').length;
    const mediumCount = result.insights.filter(i => i.severity === 'medium').length;

    console.log(`\n🎯 KEY INSIGHTS (${result.insights.length} total)`);
    console.log(`  🔴 Critical: ${criticalCount}`);
    console.log(`  🟠 High: ${highCount}`);
    console.log(`  🟡 Medium: ${mediumCount}`);

    if (result.insights.length > 0) {
      console.log(`\n📌 TOP INSIGHTS:`);
      result.insights.slice(0, 5).forEach((insight, idx) => {
        console.log(`\n  ${idx + 1}. [${insight.severity.toUpperCase()}] ${insight.title}`);
        console.log(`     ${insight.description}`);
        if (insight.affectedItems.length > 0) {
          console.log(`     Affected: ${insight.affectedItems.slice(0, 3).join(', ')}${insight.affectedItems.length > 3 ? ` (+${insight.affectedItems.length - 3} more)` : ''}`);
        }
      });
    }

    if (result.nextSteps.length > 0) {
      console.log(`\n📋 NEXT STEPS:`);
      result.nextSteps.forEach((step, idx) => {
        console.log(`  ${idx + 1}. ${step}`);
      });
    }

    if (errors.length > 0) {
      console.log(`\n⚠️  WARNINGS & ERRORS (${errors.length}):`);
      errors.forEach(error => {
        console.log(`  [${error.severity.toUpperCase()}] ${error.source}: ${error.message}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Report generated successfully`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string | undefined): string {
    if (!text) return '';
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char] || char);
  }
}
