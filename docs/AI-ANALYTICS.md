# AI Analytics Suite - Production-Ready Commands

## Overview

The AI Analytics Suite provides enterprise-grade test analysis and insights through a set of production-ready commands (`npm run ai:*`). Each command analyzes real Playwright execution artifacts and generates actionable recommendations using AI.

**Key Principle**: These commands use real execution data, not hardcoded demos. They intelligently use AI only when needed, minimizing token usage while maximizing insights.

---

## Commands

### 1. `npm run ai:flaky` - Flaky Test Analysis

Identifies and analyzes flaky tests from execution history.

```bash
npm run ai:flaky
```

**What it does**:
- Scans latest 100 Allure test results
- Calculates flakiness percentage for each test
- Identifies patterns and failure reasons
- Uses AI to generate mitigation recommendations

**Output**:
- Identifies tests with 3+ failures in recent runs
- Ranks by flakiness percentage
- Provides specific recommendations for fixing each test
- Generates HTML dashboard with interactive insights

**Example Output**:
```
🔍 Analyzing flaky tests from Allure results...

  📊 Analyzed 847 tests
  🎯 Found 12 flaky candidates

  Analyzing: login_test (87% flaky)
  Analyzing: payment_checkout (62% flaky)
  ...

✅ Reports generated:
  📄 JSON: reports/analysis/flaky-report-2026-06-30_14-30-45.json
  🌐 HTML: reports/analysis/flaky-report-2026-06-30_14-30-45.html
```

**Use Cases**:
- Stabilize test suite before production release
- Identify timing-dependent or environment-sensitive tests
- Prioritize test refactoring efforts
- Monitor test reliability trends

---

### 2. `npm run ai:rootcause` - Root Cause Analysis

Analyzes test failures to identify underlying root causes.

```bash
npm run ai:rootcause
```

**What it does**:
- Parses failure messages, stack traces, and execution logs
- Classifies failures by type (timeout, connection, assertion, etc.)
- Extracts associated screenshots and attachments
- Uses AI to determine probable root causes
- Maps failures to affected components

**Output**:
- Categorized failures by type
- Probable root causes with confidence scores
- Impacted components and recommendations
- Evidence and supporting data

**Example Output**:
```
🔎 Analyzing test failures to identify root causes...

  📊 Analyzed failure artifacts
  🎯 Found 23 failures to analyze

  Analyzing: payment_gateway_test
  Analyzing: user_profile_update
  ...

Insights Generated:
  [CRITICAL] Connection refused to localhost:3000
    - Probable Cause: Application server not running
    - Component: PaymentGateway
    - Evidence: net::ERR_CONNECTION_REFUSED

  [HIGH] Element not found: input[name="password"]
    - Probable Cause: DOM structure changed
    - Component: LoginPage
    - Evidence: UI changed, selector outdated
```

**Use Cases**:
- Quick triage of test failures
- Identify infrastructure vs. code issues
- Understand failure patterns
- Validate fixes in subsequent runs

---

### 3. `npm run ai:coverage` - Test Coverage Analysis

Analyzes test coverage against requirements.

```bash
npm run ai:coverage
```

**What it does**:
- Parses requirements files (Markdown)
- Scans test code for test cases
- Matches tests to requirements using AI
- Identifies coverage gaps and orphaned tests
- Recommends tests to create for uncovered requirements

**Output**:
- Coverage percentage (target: 80%+)
- List of uncovered requirements
- Test-to-requirement mapping
- Prioritized recommendations

**Example Output**:
```
📋 Analyzing test coverage against requirements...

  📊 Requirements: 45
  🧪 Test Cases: 38
  ✅ Coverage: 73.3%

  🔴 Uncovered Requirements: 12

  Coverage Gap Analysis:
  [CRITICAL] REQ_001: User can login
    - Status: UNCOVERED
    - Risk: Core functionality
    - Recommendation: Create comprehensive login test suite

  [HIGH] REQ_012: Payment processing
    - Status: UNCOVERED
    - Risk: Revenue-impacting
    - Recommendation: Implement full payment flow tests
```

**Use Cases**:
- Compliance and quality assurance
- Planning test development
- Identifying high-risk uncovered areas
- Tracking coverage trends

---

### 4. `npm run ai:regression` - Regression Analysis

Identifies tests affected by recent changes and regression risks.

```bash
npm run ai:regression
```

**What it does**:
- Analyzes recent test failures from Allure
- Calculates risk levels (critical/high/medium/low)
- Identifies affected components
- Recommends immediate actions
- Prioritizes fixes by impact

**Output**:
- Risk assessment matrix
- Affected tests by severity
- Component-level impact
- Action recommendations

**Example Output**:
```
🔄 Analyzing test regressions from recent executions...

  📊 Tests Analyzed: 156
  🔴 Critical: 3
  🟠 High: 8
  🟡 Medium: 12

Risk Assessment:
  [CRITICAL] Core functionality broken
    Tests: login_test, checkout_test, payment_test
    Recommendation: URGENT: Fix immediately

  [HIGH] Important features affected (8 tests)
    Recommendation: Prioritize in current sprint

  [MEDIUM] Non-critical issues (12 tests)
    Recommendation: Add to backlog for next sprint
```

**Use Cases**:
- Release readiness checks
- Post-deployment validation
- Identifying broken builds
- Prioritizing fix efforts

---

## Architecture

### Data Flow

```
Real Execution Artifacts
├── Allure Results (JSON)
├── Screenshots & Videos
├── Logs & Stack Traces
└── Test Metadata

    ↓ (Extractor)

Structured Analysis Input
├── Test metadata
├── Failure data
├── Coverage mapping
└── Regression risks

    ↓ (Analyzer)

AI-Generated Insights
├── Root causes
├── Recommendations
├── Risk assessments
└── Action items

    ↓ (Reporter)

Professional Reports
├── JSON (Machine-readable)
├── HTML (Interactive dashboard)
└── Console (Immediate feedback)
```

### Component Architecture

#### Extractors
Extract and structure real data from execution artifacts:

- **FlakyTestExtractor**: Analyzes test execution history
- **RootCauseExtractor**: Parses failure details and artifacts
- **CoverageExtractor**: Maps tests to requirements
- **RegressionExtractor**: Identifies affected tests and risk levels

#### Analyzers
Use existing analyzers or enhanced versions:

- **FlakyTestAnalyzer**: LLM-powered flakiness analysis
- **BugRootCauseAnalyzer**: LLM-powered root cause detection
- **CoverageAnalyzer**: Requirement-to-test mapping
- **RegressionSelector**: Impact and risk assessment

#### Reporter
Unified reporting across all analysis types:

- **AnalysisReporter**: Generates JSON, HTML, and console outputs
- Consistent format across all ai:* commands
- Professional styling and interactive features
- Actionable recommendations and next steps

---

## Reports

All commands generate three types of reports in `reports/analysis/`:

### 1. JSON Report
Machine-readable format for CI/CD integration:

```json
{
  "metadata": {
    "analysisType": "flaky",
    "executedAt": "2026-06-30T14:30:45Z",
    "executionDuration": 12450,
    "dataSource": "allure-results/",
    "testsAnalyzed": 847,
    "tokensUsed": 1200
  },
  "result": {
    "insights": [
      {
        "severity": "high",
        "category": "Test Flakiness",
        "title": "login_test is 87% flaky",
        "recommendation": "Use explicit waits instead of fixed delays",
        "confidence": 85,
        "affectedItems": ["login_test"]
      }
    ],
    "statistics": {...},
    "summary": "...",
    "nextSteps": [...]
  },
  "errors": []
}
```

### 2. HTML Report
Interactive dashboard with visualizations:

- Professional styling and layout
- Metric cards showing key statistics
- Color-coded severity indicators
- Collapsible insight details
- Next steps and recommendations
- Error and warning log

### 3. Console Output
Immediate feedback in terminal:

```
==============================================================================
                    FLAKY ANALYSIS REPORT
==============================================================================

📈 SUMMARY
  Type: flaky
  Executed: 6/30/2026, 2:30:45 PM
  Duration: 12450ms
  Tests Analyzed: 847

Found 12 flaky tests from 847 total tests analyzed. The most problematic
tests show 50-100% failure rates and need immediate attention.

🎯 KEY INSIGHTS (12 total)
  🔴 Critical: 3
  🟠 High: 9

📌 TOP INSIGHTS:

  1. [HIGH] login_test is 87% flaky
     This test failed in 13 out of 15 runs.
     Affected: login_test

  2. [HIGH] checkout_flow is 62% flaky
     ...
```

---

## Output Locations

All reports are saved to: `reports/analysis/`

**File naming convention**:
- `{analysisType}-report-{date}_{time}.{ext}`
- Example: `flaky-report-2026-06-30_14-30-45.{json,html}`

**Access reports**:
```bash
# View latest HTML report in browser
open reports/analysis/flaky-report-*.html

# Read JSON for CI/CD processing
cat reports/analysis/flaky-report-*.json

# Get console output (appears during execution)
npm run ai:flaky
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run AI Analytics
  run: |
    npm run ai:flaky
    npm run ai:rootcause
    npm run ai:coverage
    npm run ai:regression

- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
    name: ai-analysis-reports
    path: reports/analysis/
```

### Failure Gates

```yaml
- name: Check Coverage
  run: |
    COVERAGE=$(jq '.result.statistics."Coverage %" | tonumber' reports/analysis/coverage-report-*.json)
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage below threshold: $COVERAGE%"
      exit 1
    fi
```

---

## Performance & Efficiency

### Token Usage
- **KB-only analysis**: 0 tokens (extractors only)
- **AI analysis**: ~100-200 tokens per item
- **Full suite**: ~500-1000 tokens for typical run
- **Caching**: Reduces repeat analysis by 70%+

### Execution Time
- **ai:flaky**: ~15-30 seconds (100 test analysis)
- **ai:rootcause**: ~20-40 seconds (20-50 failure analysis)
- **ai:coverage**: ~10-20 seconds (50 requirements)
- **ai:regression**: ~15-30 seconds (100+ test analysis)

### Scalability
- Handles 1000+ tests efficiently
- Processes latest N executions (configurable)
- Automatic pagination and limiting
- Memory-optimized for large result sets

---

## Comparison: Demo vs Production

| Feature | demo:* | ai:* |
|---------|--------|------|
| **Data Source** | Hardcoded | Real execution artifacts |
| **Scope** | Single test | 100+ tests |
| **Reports** | Console only | JSON + HTML + Console |
| **History** | None | Latest 100 executions |
| **Recommendations** | Generic | Specific and actionable |
| **Use** | Demonstrations | Production workflows |
| **AI Cost** | Demo | Optimized (KB-first) |

---

## Troubleshooting

### "No tests found to analyze"
```bash
# Ensure tests have been run first
npm run test
# Then run analysis
npm run ai:flaky
```

### "No requirements found"
```bash
# Create requirements markdown files in requirements/
echo "## REQ_001: Feature X" > requirements/feature-x.md
```

### "Analysis failed: Provider error"
```bash
# Check LLM provider configuration
env | grep LLM_PROVIDER
# Verify .env file has valid credentials
npm run ai:flaky -- --skip-ai  # Run without AI if needed
```

---

## Best Practices

1. **Run after test execution**: Always run after `npm test`
2. **Check reports regularly**: Daily or per-release
3. **Integrate with CI**: Automate in build pipelines
4. **Track trends**: Keep historical reports
5. **Act on insights**: Use recommendations to improve quality
6. **Combine analyses**: Use all 4 commands for complete picture

---

## Future Enhancements (Roadmap)

- [ ] Web UI dashboard for report visualization
- [ ] Historical trend analysis and projections
- [ ] Slack/Email report notifications
- [ ] Custom analysis rules and filters
- [ ] Machine learning for confidence scoring
- [ ] Integration with Jira for automatic ticket creation
- [ ] Multi-project analysis across test suites
- [ ] Performance profiling alongside test analysis

---

## Technical Details

### Data Retention
- Allure results: Up to 100 latest files per analysis
- Reports: Indefinite (archived in reports/analysis/)
- Cache: Cleaned on provider reset

### File System
```
reports/
└── analysis/
    ├── flaky-report-2026-06-30_14-30-45.json
    ├── flaky-report-2026-06-30_14-30-45.html
    ├── rootcause-report-2026-06-30_14-31-00.json
    ├── rootcause-report-2026-06-30_14-31-00.html
    ├── coverage-report-2026-06-30_14-31-30.json
    ├── coverage-report-2026-06-30_14-31-30.html
    ├── regression-report-2026-06-30_14-32-00.json
    └── regression-report-2026-06-30_14-32-00.html
```

### Environment Variables
```bash
# LLM Provider Configuration
LLM_PROVIDER=gemini          # gemini | github-models | openrouter | lm-studio
LLM_MODEL=gemini-pro         # Model identifier
LLM_API_KEY=your-key         # API key for provider

# Analysis Configuration
ANALYSIS_WINDOW=100          # Number of recent results to analyze
ANALYSIS_MAX_ITEMS=20        # Max items per report
```

---

## Support

For issues or questions:
1. Check logs in console output
2. Review JSON report for error details
3. Verify Allure results exist: `ls allure-results/*.json`
4. Ensure requirements files are present: `ls requirements/*.md`
5. Check LLM provider configuration in `.env`

---

**Last Updated**: June 30, 2026  
**Version**: 1.0  
**Status**: Production Ready ✅
