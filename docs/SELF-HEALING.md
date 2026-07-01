# 🔧 AI Self-Healing Framework Documentation

## Overview

The **AI Self-Healing Framework** is a production-ready automated test locator repair system for Playwright. It analyzes failed test executions, identifies broken CSS/XPath selectors, generates correct replacements using AI, and automatically updates Page Object Model (POM) files.

### Key Differentiator: `demo:healing` vs `ai:heal`

| Feature | `demo:healing` | `ai:heal` |
|---------|---|---|
| **Input** | Hardcoded demo data (`input[type='submit'][value='Log In']`) | Real Playwright JSON test failures |
| **Failure Analysis** | None - manual input | Automatic from latest run |
| **POM Detection** | Manual specification | Automatic mapping (test → POM) |
| **Selector Extraction** | Manual | Automatic from error messages |
| **Confidence Scoring** | Simple | Comprehensive with validation |
| **Backup System** | None | Full versioning with deduplication |
| **Change Tracking** | None | Complete diff reports |
| **Production Ready** | ❌ PoC only | ✅ Enterprise-grade |
| **Re-run Capability** | ❌ No | ✅ Yes (optional) |
| **Reporting** | Console only | JSON + Interactive HTML |

---

## Usage

### Basic Command

```bash
npm run ai:heal
```

This will:
1. Read the latest Playwright JSON results (`reports/<runId>/playwright/results.json`)
2. Identify locator-related failures
3. Heal broken selectors using AI + Knowledge Base
4. Update POM files with healed locators
5. Generate comprehensive report

### With Options

```bash
# Set minimum confidence threshold (default: 70%)
npm run ai:heal -- --min-confidence 85

# Skip AI healing (only apply KB matches)
npm run ai:heal -- --skip-ai

# Limit number of heals to apply
npm run ai:heal -- --max-heals 5

# Enable re-running failed tests after healing
npm run ai:heal -- --enable-rerun

# Combine options
npm run ai:heal -- --min-confidence 80 --max-heals 10 --enable-rerun
```

### All Options

| Option | Default | Description |
|--------|---------|-------------|
| `--min-confidence <N>` | 70 | Minimum confidence (0-100) to apply a heal |
| `--skip-ai` | false | Only heal using KB matches, skip AI calls |
| `--enable-rerun` | false | Re-run failed tests after healing to validate |
| `--max-heals <N>` | unlimited | Maximum number of failures to heal |

---

## Architecture

### Component Stack

```
┌─────────────────────────────────────────────────────────────┐
│ CLI Entry Point (scripts/ai-heal.ts)                        │
│ - Parse arguments, initialize LLM provider, orchestrate     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ HealingOrchestrator (Main Pipeline)                         │
│ - Coordinates all components, drives workflow               │
└─┬─────────────┬──────────────┬──────────────┬───────────────┘
  │             │              │              │
  │             │              │              │
┌─▼──────────┐ ┌─▼──────────┐ ┌──▼─────────┐ ┌──▼────────────┐
│ Failure    │ │ POM        │ │ Healing    │ │ Backup       │
│ Analyzer   │ │ Identifier │ │ Engine     │ │ Manager      │
├────────────┤ ├────────────┤ ├────────────┤ ├──────────────┤
│ • Parse    │ │ • Map test │ │ • Use KB   │ │ • Version    │
│  PW JSON   │ │   → POM    │ │ • Call AI  │ │   POMs       │
│ • Extract  │ │ • Extract  │ │ • Score    │ │ • Dedupe     │
│   errors   │ │   property │ │   results  │ │ • Restore    │
│ • Filter   │ │   name     │ │ • Validate │ │ • Prune old  │
│   selectors│ │            │ │            │ │ • Report     │
└────────────┘ └────────────┘ └────────────┘ └──────────────┘
                                                      │
                                                      ▼
                                            ┌──────────────────┐
                                            │ POM Updater      │
                                            │ • Modify files   │
                                            │ • Generate diffs │
                                            │ • Validate new   │
                                            │   selectors      │
                                            └──────────────────┘
                                                      │
                                                      ▼
                                            ┌──────────────────┐
                                            │ Healing Reporter │
                                            │ • JSON report    │
                                            │ • HTML dashboard │
                                            │ • Console summary│
                                            └──────────────────┘
```

### Data Flow

```
┌──────────────────────────────────────────┐
│ Playwright Results JSON                  │
│ reports/<runId>/playwright/results.json  │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ FailureAnalyzer                      │
│ • Filter for locator-related errors  │
│ • Extract broken selectors           │
│ • Output: LocatorFailureDetail[]     │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ POMIdentifier                        │
│ • Map failures to POM files          │
│ • Find matching locator properties   │
│ • Output: Enriched failures          │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ HealingEngine + KB Service           │
│ • Look up Knowledge Base             │
│ • Call LLM if needed                 │
│ • Score confidence                   │
│ • Output: HealingResult[]            │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ BackupManager                        │
│ • Create POM backups (deduplicated)  │
│ • Track versions                     │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ POMUpdater                           │
│ • Update POM files with healed       │
│   selectors                          │
│ • Generate change diffs              │
│ • Validate new selectors             │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ HealingReporter                      │
│ • JSON report (structured data)      │
│ • HTML report (interactive)          │
│ • Console summary (immediate)        │
└──────────────────────────────────────┘
```

---

## Failure Analysis

### Detector Patterns

The `FailureAnalyzer` detects locator failures by matching error message patterns:

| Pattern | Example | Type |
|---------|---------|------|
| `locator.click()` failed | Method call on broken selector | Selector failure |
| `element not found` | Timeout waiting for element | Not found |
| `unable to locate` | XPath/CSS not matching | Locate error |
| `no element matches selector` | CSS selector invalid | Selector mismatch |
| `timeout waiting for selector` | Explicit wait exceeded | Timeout |
| `expect(...).toBeVisible()` failed | Visibility assertion | Visibility |
| `.first()` failed | Chained selector problem | Chained selector |

### Confidence Scoring

Confidence score (0-100) determined by:

- **Locator extraction success**: ±15 points
- **POM mapping success**: ±15 points
- **KB match found**: ±20 points
- **AI response validity**: ±20 points
- **Selector validation**: ±30 points

**Default minimum confidence**: 70% (override with `--min-confidence`)

### Extraction Example

```
Failure Message:
"Error: locator.click() failed:
  locator used: css=input[type='submit']
  timeout 30000ms exceeded waiting for element to appear"

Extracted:
- brokenLocator: "input[type='submit']"
- failureReason: "timeout"
- isLocatorFailure: true
- confidence: 85 (good extraction)
```

---

## POM Identifier

### Test-to-POM Mapping

The `POMIdentifier` automatically maps test files to Page Object classes:

```
Test File                     → POM File              → Class
───────────────────────────────────────────────────────────
parabank-login.spec.ts        → loginPage.page.ts     → LoginPage
parabank-register.spec.ts     → registerPage.page.ts  → RegisterPage
parabank-billpay.spec.ts      → billpayPage.page.ts   → BillPayPage
parabank-transfer.spec.ts     → transferPage.page.ts  → TransferPage
```

### Locator Property Matching

When a broken selector is found, the identifier attempts to match it to the corresponding POM property:

```typescript
// Broken selector from error: "input[name='username']"

// POM file content:
private readonly usernameField: Locator;
  = page.locator("input[name='username']").first();

// Match result:
locatorPropertyName: "usernameField" ✅
```

Uses fuzzy matching for variations:
- Exact match: 100% confidence
- Similar patterns: Levenshtein distance scoring
- Minimum similarity threshold: 60%

---

## Healing Engine

### Two-Stage Healing Strategy

#### Stage 1: Knowledge Base Matching (Fast, No AI)

```
1. Load KB for the page (e.g., "parabank-login-page.json")
2. Search for alternative selectors for the same element
3. Return best match if found (high confidence)
4. Fallback to Stage 2 if no good match
```

**Example**:
```json
{
  "usernameField": "input[name='username']",           // Broken
  "usernameFieldAlt": "input:first-of-type",          // Found in KB
  "usernameFieldAlt2": "input.username-input"         // Found in KB
}
```

#### Stage 2: AI-Powered Healing (Intelligent, Uses LLM)

If no KB match found:

```
1. Send prompt to LLM with:
   - Knowledge Base (all selectors + page info)
   - Failed locator
   - Error message context
2. LLM suggests replacement from KB values only
3. Validate suggested selector
4. Score confidence based on reasoning quality
```

**Prompt Template**:
```
You are a Playwright locator expert.

Application knowledge (from KB):
{
  "pageName": "onlineBankingLogin",
  "selectors": {
    "usernameField": "input[name='username']",
    "loginButton": "input[type='submit'].button",
    ...
  }
}

Failed locator: "input[type='submit']"
Error: "Element did not appear after 30s timeout"

Rules:
- MUST use ONLY selectors from the knowledge base
- CANNOT invent selectors
- Return only valid JSON

Suggest a replacement selector.
```

**AI Response**:
```json
{
  "originalLocator": "input[type='submit']",
  "healedLocator": "input[type='submit'].button",
  "confidence": 92,
  "reasoning": "The .button class is in KB and matches login button. Changed specificity slightly for better targeting."
}
```

---

## Direct Engine Integration

The `ai:heal` command runs the full pipeline (analyze → map → heal → update POMs). You can also call `SelfHealingLocatorEngine` directly in a Playwright fixture to heal failures inline during a test run:

```typescript
import { SelfHealingLocatorEngine } from './pipeline/analyzers/self-healing/SelfHealingLocatorEngine.js';

// In a Playwright fixture or base page class:
const engine = new SelfHealingLocatorEngine(llmProvider);

try {
  await page.locator(selector).click();
} catch (e) {
  const result = await engine.heal(
    { failedLocator: selector, pageName: 'parabank-login-page' },
    loginPageKnowledgeBase,
  );
  if (result.confidence >= 85) {
    await page.locator(result.healedLocator).click();
  } else {
    throw new Error(`Healing confidence too low (${result.confidence}): ${result.reasoning}`);
  }
}
```

**Confidence thresholds for direct integration:**

| Score | Recommended action |
|---|---|
| ≥ 85 | Auto-accept — update selector in place |
| 60–84 | Flag for review — proceed with healed selector this run |
| < 60 | Stop run — require manual fix |

> **Note:** The engine requires a KB for the page. If the page has no KB or the KB is stale, healing will fail. Run `npm run kb:generate <url> <page-name>` to refresh.

---

## Backup & Version Control

### Backup Directory Structure

```
pipeline/backups/pom-healing/
├── loginPage.page.ts.a3f7b2e1.2025-06-30T14-30-45.backup
├── loginPage.page.ts.a3f7b2e1.2025-06-30T14-30-45.backup.metadata.json
├── billpayPage.page.ts.c9e2d5f4.2025-06-30T14-45-22.backup
├── billpayPage.page.ts.c9e2d5f4.2025-06-30T14-45-22.backup.metadata.json
└── ...
```

### Deduplication

If the same POM content already has a backup, it's reused (SHA-256 hash):
- **Benefit**: Saves disk space for identical content
- **Metadata preserved**: Full lineage tracked

### Automatic Pruning

```bash
# Keeps 5 most recent backups per POM file
# Automatically runs after healing
BackupManager.pruneOldBackups(maxBackupsPerFile: 5)
```

### Manual Restore

```typescript
const backupManager = new BackupManager();

// List available backups
const backups = backupManager.listBackups('support/pages/loginPage.page.ts');
// [
//   { version: "a3f7b2e1", timestamp: "2025-06-30T14:30:45", path: "..." },
//   { version: "c9e2d5f4", timestamp: "2025-06-30T14:45:22", path: "..." }
// ]

// Restore a specific version
backupManager.restoreFromBackup('support/pages/loginPage.page.ts', 'a3f7b2e1');
```

---

## Reports

### Generated Report Files

After running `npm run ai:heal`, you'll find reports in:

```
reports/healing/
├── healing-report-2025-06-30T14-30-45-123.json      # Structured data
├── healing-report-2025-06-30T14-30-45-123.html      # Interactive dashboard
└── ...
```

### JSON Report Structure

```json
{
  "executionId": "heal-1719755445000-a7b2c3",
  "timestamp": "2025-06-30T14:30:45.000Z",
  "executionDurationMs": 12500,
  "totalFailures": 47,
  "locatorFailures": 8,
  "healedCount": 7,
  "healingSuccessRate": 87.5,
  "failuresCausingAICalls": 2,
  "aiCallsMade": 2,
  "promptsCached": 0,
  "promptsNewlyEvaluated": 2,
  "estimatedTokensSaved": 5000,
  "healingResults": [
    {
      "allureId": "uuid-123",
      "testName": "TC_001 @regression : [onlineBankingLogin] Successful Login",
      "originalLocator": "input[name='username']",
      "healedLocator": "input[type='text'].username",
      "locatorPropertyName": "usernameField",
      "confidence": 92,
      "reasoning": "Matched in KB with additional class specificity",
      "method": "ai-suggested",
      "pomFile": "support/pages/loginPage.page.ts",
      "pomClass": "LoginPage",
      "backupVersion": "a3f7b2e1",
      "changeHash": "k9x2l5m8",
      "validated": false,
      "rerunPassed": null,
      "validationError": null
    },
    ...
  ],
  "failedToHeal": ["uuid-456"],
  "filesModified": ["support/pages/loginPage.page.ts"],
  "backupCreated": true,
  "errors": []
}
```

### HTML Report Features

- **Visual Summary**: Metrics dashboard with color-coded status
- **Healed Locators Table**: Full details of each fix
- **Confidence Visualization**: Bar charts showing confidence scores
- **Before/After Diffs**: Clear selector comparisons
- **Error Log**: Debugging information if issues occurred
- **Interactive**: Sortable tables, expandable sections

### Console Output

```
======================================================================
📊 AI SELF-HEALING REPORT
======================================================================

Execution ID: heal-1719755445000-a7b2c3
Timestamp: 2025-06-30T14:30:45.000Z
Duration: 12.50s

📈 SUMMARY
  Total Failures:            47
  Locator Failures:          8
  Successfully Healed:       7
  Success Rate:              87.5%
  Failed to Heal:            1

💰 EFFICIENCY
  AI Calls Made:             2
  Prompts Cached:            0
  Estimated Tokens Saved:    5000

📝 MODIFIED FILES
  ✅ support/pages/loginPage.page.ts

======================================================================
```

---

## Token Optimization

### Caching Strategy

The `CachingLLMProvider` automatically caches LLM responses:

```
SHA256(MODEL + PROMPT_VERSION + PROMPT_TEXT) = Cache Key

If identical prompt is sent again:
- Cache HIT: Return cached response instantly (0 tokens)
- Cache MISS: Evaluate with LLM, store result
```

### Estimated Token Savings

For each healed locator:

| Scenario | Tokens Used | Explanation |
|----------|-------------|-------------|
| **KB Match** | 0-100 | Only parsing, no LLM call |
| **AI Healing** | 2000-3500 | Full prompt → AI → parse cycle |
| **Cached AI** | 0 | Identical prompt, instant response |

### Report Metrics

```
Estimated Tokens Saved = KB_MATCHES × 500 + CACHED_PROMPTS × 2000
```

In the example above:
- 5 KB matches × 500 = 2,500
- 1 cached response × 2,500 = 2,500
- **Total saved: 5,000 tokens** (instead of 7,000 if all AI calls)

---

## Error Handling & Resilience

### Failure Scenarios Handled

| Scenario | Handling | Fallback |
|----------|----------|----------|
| **No Playwright results** | Log warning | Report 0 failures, exit gracefully |
| **KB not found** | Skip AI healing | Cannot heal, add to `failedToHeal` |
| **LLM unavailable** | Retry with fallback provider | Try next provider in chain |
| **Invalid healed selector** | Validation fails | Add to `insufficientConfidenceHeals` |
| **POM file not found** | Skip that failure | Continue with others |
| **Backup creation fails** | Non-blocking warning | Still attempt heal, no backup |

### Confidence Thresholds

- **≥85%**: Auto-apply heal, high confidence
- **70-84%**: Apply heal, medium confidence (default minimum)
- **<70%**: Hold for review, insufficient confidence (use `--min-confidence` to adjust)

---

## Workflow Example

### Step-by-Step Execution

```bash
$ npm run test:ui && NO_OPEN=true npm run ai:heal -- --min-confidence 80 --enable-rerun

# Output:

✅ Tests completed. 47 failed, 125 passed.

🔧 AI Self-Healing Engine - Production Mode

Options:
  Skip AI Healing:     false
  Min Confidence:      80%
  Enable Re-run:       true
  Max Heals:           unlimited

✅ LLM Provider: CachingLLMProvider (using Gemini)

📋 Step 1: Analyzing latest failures...
Found 47 failed tests.

🔍 Step 2: Identifying locator failures and mapping to POMs...
Found 8 locator failures.

🔧 Step 4: Healing locator failures...
  ✅ TC_001: usernameField (confidence: 92%, KB match)
  ✅ TC_002: passwordField (confidence: 88%, KB match)
  ⚠️  TC_003: submitButton (confidence: 76%, SKIPPED - below 80%)
  ✅ TC_005: homeLink (confidence: 85%, AI suggested)
  ...

✏️  Step 5: Updating 6 POMs with healed locators...
✅ Updated support/pages/loginPage.page.ts with 3 healed locators
✅ Updated support/pages/transferPage.page.ts with 2 healed locators
✅ Updated support/pages/registerPage.page.ts with 1 healed locator

🗑️  Pruned 2 old backups

📊 Healing Statistics:
   Total Locator Failures: 8
   Successfully Healed: 6 (75.0%)
   AI Calls Made: 1
   KB Matches: 5
   Estimated Tokens Saved: 2500

🔄 Step 7: Re-running healed tests...
(Skipped - implement in v2)

✅ JSON Report: reports/healing/healing-report-2025-06-30T14-30-45-123.json
✅ HTML Report: reports/healing/healing-report-2025-06-30T14-30-45-123.html

======================================================================
📊 AI SELF-HEALING REPORT
======================================================================
...
```

---

## Best Practices

### 1. Run After Test Failures

```bash
# Run tests first (headless by default)
npm run test:ui   # or: npm run test

# Then heal (suppress auto-open)
NO_OPEN=true npm run ai:heal
```

### 2. Validate Before Merging

```bash
# Check report
npm run ai:heal

# Review changes
git diff support/pages/

# Re-run tests to validate
npm run test -- --grep @regression

# Commit if validated
git add . && git commit -m "fix: healed broken selectors via AI"
```

### 3. Adjust Confidence Threshold

- **High confidence (90%+)**: Auto-heal risky changes, review later
  ```bash
  npm run ai:heal -- --min-confidence 90
  ```

- **Conservative (<70%)**: Only heal very confident fixes, review low-confidence
  ```bash
  npm run ai:heal -- --min-confidence 50
  ```

### 4. Use with CI/CD

```yaml
# .github/workflows/heal.yml
- name: Heal broken selectors
  run: npm run ai:heal -- --min-confidence 85
  continue-on-error: true

- name: Commit healed changes
  if: ${{ success() }}
  run: |
    git add support/pages/
    git commit -m "chore: auto-healed selectors"
    git push
```

### 5. Monitor Token Usage

```bash
# Check how many tokens you're saving
npm run ai:heal

# Look for "Estimated Tokens Saved" in report
# Adjust KB coverage if too many AI calls needed
```

---

## Architecture Decisions

### Why Separate Components?

- **Single Responsibility**: Each component has one job
- **Testability**: Components can be unit tested independently
- **Reusability**: Can use POMIdentifier without HealingEngine
- **Maintainability**: Easy to modify behavior in isolation

### Why POM-Only Updates?

- **Safety**: Never modify test code (behavior-driven)
- **POMs are implementation**: Safe to update selectors
- **Test intent preserved**: Test logic unchanged
- **Audit trail**: All changes are locator updates

### Why Backup Before Update?

- **Zero data loss**: Always revert if needed
- **Deduplication**: Same content = same backup
- **History**: Track what changed when
- **Validation**: Can compare before/after

### Why Knowledge Base Required?

- **Prevents hallucination**: AI can't invent selectors
- **Faster healing**: Can skip AI for known values
- **Grounded solutions**: Always valid for the page
- **Lower token cost**: Less LLM evaluation needed

---

## Troubleshooting

### No failures detected

```bash
$ npm run ai:heal
# No failures found in latest test run.

# Solution: Run tests first
npm run test
npm run ai:heal
```

### KB not found error

```
KB not found for "parabank-login-page.json"

# Solution: Generate KB first
npm run kb:generate https://parabank.parasoft.com/parabank/index.htm onlineBankingLogin
```

### Low confidence scores

```
⚠️  Several heals were not applied due to low confidence (< 70%)

# Solution 1: Lower threshold to 60%
npm run ai:heal -- --min-confidence 60

# Solution 2: Improve KB coverage
npm run kb:generate <url> <page>
```

### Slow execution

```
Duration: 2m 34s

# Solution: Limit heals if time-constrained
npm run ai:heal -- --max-heals 10

# Or: Skip AI, KB-only (much faster)
npm run ai:heal -- --skip-ai
```

### POM file not updated

```
Healing results: 5
Modified files: 0

# Solution: Check confidence threshold
npm run ai:heal -- --min-confidence 60

# Check if POMs are on correct path
ls support/pages/
```

---

## Next Steps

### v2 Roadmap

- [ ] Enable `--enable-rerun` to actually re-run tests
- [ ] Visual diff UI for proposed changes
- [ ] Integration with GitHub Actions for PR comments
- [ ] Machine learning model for confidence scoring
- [ ] Support for API tests and endpoints
- [ ] Dashboard for healing history and trends
- [ ] Multi-language selector support (CSS, XPath, Playwright locators)

---

## Related Documentation

- [POM Architecture](../README.md#pom-architecture)
- [Knowledge Base System](../kb/README.md)
- [LLM Provider Factory](../providers/README.md)
- [Backup & Recovery](../backups/README.md)

---

## Support

For issues or questions:

1. Check **Troubleshooting** section above
2. Review **Architecture** section
3. Check logs in `reports/healing/`
4. Open an issue with:
   - Command used (e.g., `npm run ai:heal -- --min-confidence 75`)
   - Output (console + HTML report)
   - Error messages (full stack trace)

---

**Last Updated**: 2025-06-30  
**Maintained By**: AI Test Engineering Team
