# Production Self-Healing Implementation Guide

## Overview

This guide explains the complete architecture, components, and workflow of the **production-ready AI Self-Healing system** for Playwright tests.

### Quick Start

```bash
# Run your tests
npm run test

# Heal broken selectors automatically
npm run ai:heal

# View report
cat reports/healing/healing-report-*.html
```

---

## Architecture Summary

### Component Breakdown

#### 1. **FailureAnalyzer** - Parses test failures

**File**: `pipeline/analyzers/self-healing/FailureAnalyzer.ts`

**Responsibility**:
- Reads latest Playwright JSON results (`reports/<runId>/playwright/results.json`)
- Identifies locator-related failures using regex patterns
- Extracts broken selector strings from error messages
- Returns typed `LocatorFailureDetail` objects

**Key Features**:
- Detects 8+ failure patterns (timeout, not found, not visible, etc.)
- Extracts locators from error messages automatically
- Sorts failures by recency
- Handles malformed results gracefully

**Example Detection**:
```typescript
// Error message
"Error: locator.click() failed: timeout 30s waiting for css=input[name='username']"

// Extracts
{
  allureId: "uuid-123",
  testName: "TC_001 [onlineBankingLogin] Login Test",
  failureMessage: "...",
  brokenLocator: "input[name='username']",
  locatorPattern: "css",
  failureReason: "timeout",
  isLocatorFailure: true,
  confidenceInExtraction: 85
}
```

---

#### 2. **POMIdentifier** - Maps failures to POMs

**File**: `pipeline/analyzers/self-healing/POMIdentifier.ts`

**Responsibility**:
- Maps test file name to POM file (e.g., `parabank-login.spec.ts` → `loginPage.page.ts`)
- Parses POM files to extract locator properties and their selectors
- Matches broken selectors to POM properties using fuzzy matching
- Returns enriched failure details with POM context

**Key Features**:
- Pattern-based file matching (case-insensitive)
- Regex extraction of private locators from POM code
- Similarity scoring using Levenshtein distance
- 60% minimum threshold for fuzzy matches

**Example Mapping**:
```typescript
// Input
{ brokenLocator: "input[name='username']" }

// Processing
Test file: "parabank-login.spec.ts"
  ↓ Extract "login"
POM file: "support/pages/loginPage.page.ts"
  ↓ Parse class
POM class: "LoginPage"
  ↓ Extract properties
{
  usernameField: "input[name='username']",
  passwordField: "input[name='password']",
  loginButton: "input[type='submit'].button"
}
  ↓ Match broken locator
Matched property: "usernameField" ✅

// Output
{
  pageObjectFile: "support/pages/loginPage.page.ts",
  pageObjectClass: "LoginPage",
  locatorPropertyName: "usernameField",
  confidenceInExtraction: 95
}
```

---

#### 3. **SelfHealingLocatorEngine** - Heals selectors

**File**: `pipeline/analyzers/self-healing/SelfHealingLocatorEngine.ts`

**Responsibility**:
- Uses LLM provider to suggest healed selectors
- Grounds AI with Knowledge Base (cannot invent selectors)
- Returns typed `LocatorHealingResult` with confidence

**Key Features**:
- Leverages existing LLM infrastructure (provider-agnostic)
- Caching LLM provider (deduplicates identical prompts)
- Multi-provider fallback support
- JSON parsing with error recovery

**Healing Logic**:
```
Input: { failedLocator: "input[type='submit']", pageName: "login-page" }
  ↓
Load KB: parabank-login-page.json
  ↓
Prompt LLM:
  "Use ONLY selectors from KB to replace 'input[type='submit']'"
  ↓
LLM Response:
  "input[type='submit'].button" (found in KB)
  ↓
Output:
  {
    originalLocator: "input[type='submit']",
    healedLocator: "input[type='submit'].button",
    confidence: 92,
    reasoning: "Matches button in KB with correct specificity"
  }
```

---

#### 4. **BackupManager** - Versions POM changes

**File**: `pipeline/analyzers/self-healing/BackupManager.ts`

**Responsibility**:
- Creates content-hash-based backups before modifying POMs
- Stores backup metadata with timestamps
- Deduplicates identical content (SHA-256)
- Manages backup retention and cleanup

**Key Features**:
- SHA-256 content hashing for deduplication
- Preserves backup lineage and metadata
- Automatic pruning (keeps 5 recent versions per file)
- Directory: `pipeline/backups/pom-healing/`

**Backup Lifecycle**:
```
1. Before any POM update:
   - Calculate SHA-256 hash of current content
   - Check if backup already exists (dedup)
   - If new, create timestamped backup file + metadata

2. Backup naming:
   loginPage.page.ts.a3f7b2e1.2025-06-30T14-30-45.backup
   ↑                ↑          ↑
   POM name        Hash       Timestamp

3. On healing completion:
   - Prune old backups (> 5 per file)
   - Keep metadata.json for recovery
```

---

#### 5. **POMUpdater** - Modifies POM files

**File**: `pipeline/analyzers/self-healing/POMUpdater.ts`

**Responsibility**:
- Safely updates POM files with healed selectors
- Generates diff reports for change tracking
- Validates healed selectors before applying
- Returns `LocatorUpdateDiff` for reporting

**Key Features**:
- Regex-based locator replacement (preserves indentation)
- Syntax validation for healed selectors
- Prevents invalid or suspicious patterns
- Generates human-readable diff reports

**Update Process**:
```typescript
// Input healing results
[
  {
    locatorPropertyName: "usernameField",
    originalLocator: "input[name='username']",
    healedLocator: "input[type='text'].username"
  }
]

// Find in POM
private readonly usernameField: Locator = 
  page.locator("input[name='username']").first();

// Replace
private readonly usernameField: Locator = 
  page.locator("input[type='text'].username").first();

// Output diff
Property: usernameField (Line 28)
  Old: input[name='username']
  New: input[type='text'].username
```

---

#### 6. **HealingOrchestrator** - Main workflow

**File**: `pipeline/analyzers/self-healing/HealingOrchestrator.ts`

**Responsibility**:
- Orchestrates entire healing workflow
- Coordinates all components in proper sequence
- Handles options and configurations
- Returns comprehensive `HealingReport`

**Workflow Steps**:
```
1. analyzeLatestFailures()
   → FailureAnalyzer reads reports/<runId>/playwright/results.json
   → Returns array of failures

2. Filter locator failures
   → Keep only isLocatorFailure = true

3. populateFailureWithPOMInfo()
   → POMIdentifier enriches each failure
   → Maps to POM files and properties

4. healLocatorFailure() for each failure
   → Create backup
   → Load KB
   → Call HealingEngine
   → Validate result
   → Collect HealingResult

5. Filter by confidence (--min-confidence option)
   → Group results by confidence level

6. updatePOMFiles()
   → POMUpdater modifies POM files
   → BackupManager prunes old backups

7. trackHealing Statistics()
   → Count AI calls vs KB matches
   → Calculate token savings

8. Optional: validate via re-run
   → (v2 feature)
```

---

#### 7. **HealingReporter** - Generates reports

**File**: `pipeline/analyzers/self-healing/HealingReporter.ts`

**Responsibility**:
- Generates JSON report (machine-readable)
- Generates HTML report (interactive dashboard)
- Prints console summary (immediate feedback)
- Saves reports to `reports/healing/` with timestamps

**Report Contents**:
```json
{
  "executionId": "heal-1719755445000-a7b2c3",
  "timestamp": "2025-06-30T14:30:45.000Z",
  "executionDurationMs": 12500,
  "totalFailures": 47,
  "locatorFailures": 8,
  "healedCount": 7,
  "healingSuccessRate": 87.5,
  "healingResults": [...],
  "filesModified": ["support/pages/loginPage.page.ts"],
  "errors": []
}
```

---

#### 8. **CLI Entry Point** - User interface

**File**: `scripts/ai-heal.ts`

**Responsibility**:
- Parse command-line arguments
- Initialize LLM provider
- Create HealingOrchestrator
- Run orchestration
- Generate reports
- Exit with appropriate code

**Command Interface**:
```bash
npm run ai:heal [options]

Options:
  --min-confidence <N>    Minimum confidence threshold (0-100)
  --skip-ai              Only heal from KB matches
  --enable-rerun         Re-run tests after healing
  --max-heals <N>        Limit number of heals
```

---

## Data Models

### LocatorFailureDetail

**Purpose**: Represents a single test failure with locator context.

```typescript
interface LocatorFailureDetail {
  // Allure failure metadata
  allureId: string;                    // UUID from Allure
  testName: string;                    // Test case name
  testFile: string;                    // Source test file
  failureMessage: string;              // Error message
  failureTrace: string;                // Stack trace

  // Extracted information
  brokenLocator: string | null;        // CSS/XPath that failed
  locatorPattern: string | null;       // "css", "xpath", "text"
  failureReason: string;               // "timeout", "not-found", etc.
  
  // Context for healing
  pageObjectFile: string | null;       // e.g., "support/pages/loginPage.page.ts"
  pageObjectClass: string | null;      // e.g., "LoginPage"
  locatorPropertyName: string | null;  // e.g., "usernameField"
  
  // Confidence metrics
  confidenceInExtraction: number;      // 0-100
  isLocatorFailure: boolean;           // Locator-related?
  requiresAIHealing: boolean;          // Need LLM?

  // Timestamp
  timestamp: string;                   // ISO string
}
```

### HealingResult

**Purpose**: Represents a successfully healed locator.

```typescript
interface HealingResult {
  allureId: string;                    // Source failure ID
  testName: string;                    // Test that failed
  
  // Original vs Healed
  originalLocator: string;             // What failed
  healedLocator: string;               // What replaces it
  locatorPropertyName: string;         // POM property name
  
  // Healing metadata
  confidence: number;                  // 0-100
  reasoning: string;                   // Why this fix
  method: 'kb-match' | 'ai-generated' | 'ai-suggested';
  
  // Update info
  pomFile: string;                     // File modified
  pomClass: string;                    // Class in file
  
  // Backup info
  backupVersion: string;               // Hash of backup
  changeHash: string;                  // Hash of change
  
  // Validation (after optional re-run)
  validated: boolean;
  rerunPassed: boolean | null;
  validationError: string | null;
}
```

### HealingReport

**Purpose**: Complete report of healing execution.

```typescript
interface HealingReport {
  // Metadata
  executionId: string;
  timestamp: string;
  executionDurationMs: number;

  // Summary statistics
  totalFailures: number;
  locatorFailures: number;
  healedCount: number;
  healingSuccessRate: number;           // 0-100 %
  
  // Costs and efficiency
  failuresCausingAICalls: number;
  aiCallsMade: number;
  promptsCached: number;
  promptsNewlyEvaluated: number;
  estimatedTokensSaved: number;

  // Results
  healingResults: HealingResult[];
  failedToHeal: string[];               // Allure IDs

  // Validation (if re-run performed)
  validationPerformed: boolean;
  validationResults: {
    rerunTests: string[];
    rerunPassed: number;
    rerunFailed: number;
  } | null;

  // Changes made
  filesModified: string[];
  backupCreated: boolean;
  backupLocation: string | null;

  // Report metadata
  successfulHeals: HealingResult[];
  insufficientConfidenceHeals: HealingResult[];
  errors: Array<{
    stage: string;
    error: string;
    context?: Record<string, unknown>;
  }>;
}
```

---

## Execution Flow Diagram

```
┌─────────────────────────────────────┐
│ npm run ai:heal [options]           │
│ scripts/ai-heal.ts                  │
└────────────────┬────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Parse Arguments    │
        │ Initialize LLM     │
        └────────┬───────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Create             │
        │ HealingOrchestrator│
        └────────┬───────────┘
                 │
    ┌────────────┼────────────┐
    │                         │
    ▼                         ▼
┌─────────────────┐  ┌──────────────────┐
│ Analyze Failures│  │ Load LLM Provider│
│ (FailureAnalyzer)  │ (ProviderFactory)  │
└────────┬────────┘  └──────────────────┘
         │
         ▼
    ┌────────────────────┐
    │ Filter Locator     │
    │ Failures           │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ Map to POMs        │
    │ (POMIdentifier)    │
    └────────┬───────────┘
             │
    ┌────────▼────────────┐
    │ For each failure:   │
    │                    │
    │ 1. Create Backup   │
    │    (BackupManager) │
    │ 2. Load KB         │
    │ 3. Call Healing   │
    │    Engine          │
    │ 4. Validate       │
    │ 5. Score Result   │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ Filter by          │
    │ Confidence         │
    │ (--min-confidence) │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ Update POMs        │
    │ (POMUpdater)       │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ Track Statistics   │
    │ (Token savings)    │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ Generate Reports   │
    │ (HealingReporter)  │
    │ - JSON             │
    │ - HTML             │
    │ - Console          │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ Exit with code     │
    │ 0: success         │
    │ 1: errors          │
    └────────────────────┘
```

---

## Integration Points

### With Existing Infrastructure

#### 1. LLM Providers

Uses existing `ProviderFactory`:
- Multi-provider support (Gemini, GitHub Models, OpenRouter, LM Studio)
- Automatic fallback on failure
- Caching LLM provider for deduplication
- Environment variable configuration

```typescript
const provider = ProviderFactory.create();
// Automatically picks from env vars:
// LLM_PROVIDER, MODEL, FALLBACK_CHAIN
```

#### 2. Knowledge Base Service

Uses existing KB system:
- Loads `pipeline/kb/pages/parabank-*.json`
- Validates KB structure
- Grounds AI to prevent hallucination

```typescript
const kbService = new KnowledgeBaseService();
const kb = kbService.load("parabank-login-page");
// KB constrains AI responses
```

#### 3. Playwright Reporting

Reads Playwright JSON results:
- `reports/<runId>/playwright/results.json` (current run)
- Run ID resolved via `reports/.current-run-id`
- Extracts failure information and stack traces

#### 4. Page Object Pattern

Works with existing POM structure:
- Private readonly locators
- Public behavior methods
- Enterprise-grade encapsulation

```typescript
// Parses existing POMs like:
export default class LoginPage {
  private readonly usernameField: Locator;
  private readonly passwordField: Locator;
  // ...
}
```

---

## Configuration & Options

### Environment Variables

```bash
# LLM Configuration
LLM_PROVIDER=gemini          # or: github-models, openrouter, lm-studio
MODEL=gemini-2.0-flash       # Model selection
FALLBACK_CHAIN=lm-studio,gemini,openrouter,github-models

# Test Environment
ENVIRONMENT=qa               # qa, uat, production, development
BASE_URL=https://example.com
```

### CLI Options

```bash
# Confidence threshold (default: 70%)
npm run ai:heal -- --min-confidence 85

# Skip AI healing (KB-only)
npm run ai:heal -- --skip-ai

# Enable test re-run after healing
npm run ai:heal -- --enable-rerun

# Limit heals to apply
npm run ai:heal -- --max-heals 10

# Combine multiple
npm run ai:heal -- --min-confidence 80 --max-heals 5 --enable-rerun
```

### Report Location

```bash
# Reports generated at:
reports/healing/healing-report-2025-06-30T14-30-45-123.json
reports/healing/healing-report-2025-06-30T14-30-45-123.html

# Backups created at:
pipeline/backups/pom-healing/loginPage.page.ts.a3f7b2e1.2025-06-30T14-30-45.backup
```

---

## Error Handling

### Graceful Degradation

| Failure Point | Behavior | Impact |
|---------------|----------|--------|
| No Playwright results | Log warning, exit | No heals possible |
| KB not found | Skip AI for that page | Cannot heal that page |
| LLM timeout | Retry with fallback | May heal using fallback |
| Invalid selector | Validation fails | Not applied, noted in report |
| POM parse error | Skip that POM | Other POMs still healed |
| Backup creation fails | Continue anyway | Still attempt heal (no backup) |

### Confidence Filtering

- Heals < `--min-confidence` are held for review
- Not applied to POMs
- Included in "insufficientConfidenceHeals" section of report
- Can be manually reviewed and applied

---

## Performance Characteristics

### Execution Time

| Operation | Typical Time | Factors |
|-----------|--------------|---------|
| Results parsing | 1-2s | Size of results JSON |
| POM identification | 0.5-1s | Number of POMs |
| KB healing (AI) | 2-5s per heal | LLM response time |
| KB healing (no AI) | 0.1s per heal | Database lookups only |
| POM updates | 0.5-1s | File I/O |
| Report generation | 1-2s | Report size |
| **Total** | 5-30s | Typically ~10s for 5-10 heals |

### Token Usage

| Scenario | Tokens | Savings |
|----------|--------|---------|
| No AI (KB-only) | 0-200 | 100% |
| AI + Cache hit | 0 | 100% |
| AI + Cache miss | 2000-3500 | 0% (first time) |
| KB match + AI backup | 500-1000 | 60% |

---

## Testing & Validation

### Unit Tests

```bash
npm run test:unit -- POMIdentifier.test.ts
npm run test:unit -- BackupManager.test.ts
npm run test:unit -- FailureAnalyzer.test.ts
```

### Integration Tests

```bash
# Create synthetic failures in Allure
# Run healing command
# Verify POMs updated
# Verify backups created
# Verify reports generated
```

### Manual Testing

```bash
# 1. Run tests (create failures)
npm run test

# 2. Run healing
npm run ai:heal

# 3. Check reports
cat reports/healing/healing-report-*.json

# 4. Review modified POMs
git diff support/pages/

# 5. Re-run tests
npm run test

# 6. View HTML report
npm run report:latest
```

---

## Maintenance & Monitoring

### Regular Tasks

```bash
# Prune old backups manually
node -e "
const { BackupManager } = require('./pipeline/analyzers/self-healing/BackupManager.ts');
const bm = new BackupManager();
const pruned = bm.pruneOldBackups(3);
console.log('Pruned ' + pruned + ' old backups');
"

# Clear old reports
find reports/healing -mtime +30 -delete

# Monitor token usage
grep "estimatedTokensSaved" reports/healing/healing-report-*.json
```

### Monitoring Metrics

- **Success rate**: % of locators successfully healed
- **Confidence distribution**: Average confidence of heals
- **AI call frequency**: How often AI is needed vs KB
- **Token savings**: Cumulative tokens saved through caching
- **Backup space**: Size of backup directory

---

## Troubleshooting Guide

### No failures detected

**Symptom**: "No failures found in latest test run."

**Causes**:
- Tests all passed
- Allure results not generated
- Wrong environment

**Solutions**:
```bash
# Verify tests failed
npm run test:ui

# Verify Playwright results exist
ls -la reports/latest/playwright/results.json

# Check current run ID
cat reports/.current-run-id
```

### KB not found

**Symptom**: "KB not found for parabank-login-page.json"

**Causes**:
- KB not generated yet
- Wrong naming convention
- KB directory not found

**Solutions**:
```bash
# Generate KB
npm run kb:generate https://parabank.parasoft.com parabank onlineBankingLogin

# Verify KB exists
ls pipeline/kb/pages/

# Check naming
# Format: parabank-{pageName}.json
```

### Low confidence scores

**Symptom**: "Insufficient confidence (confidence: 52%)"

**Causes**:
- Broken selector not in KB
- Similar selectors but high variance
- KB incomplete or outdated

**Solutions**:
```bash
# Lower threshold temporarily
npm run ai:heal -- --min-confidence 50

# Update KB
npm run kb:generate <url> <page>

# Review proposed changes
cat reports/healing/healing-report-*.json | jq '.insufficientConfidenceHeals'
```

### Slow execution

**Symptom**: "Duration: 2m 34s"

**Causes**:
- Many AI calls (no KB matches)
- Slow LLM provider
- Network latency

**Solutions**:
```bash
# Use KB-only (fastest)
npm run ai:heal -- --skip-ai

# Limit heals
npm run ai:heal -- --max-heals 10

# Use faster LLM
LLM_PROVIDER=lm-studio npm run ai:heal
```

### POM not updated

**Symptom**: "Healed: 5, Modified files: 0"

**Causes**:
- All heals below confidence threshold
- POM file not found
- Regex pattern doesn't match

**Solutions**:
```bash
# Lower confidence threshold
npm run ai:heal -- --min-confidence 60

# Check POM path
ls -la support/pages/

# Verify selector syntax
cat reports/healing/healing-report-*.json | jq '.insufficientConfidenceHeals'
```

---

## Related Documentation

- [Self-Healing User Guide](./SELF-HEALING.md)
- [POM Architecture](../README.md)
- [Knowledge Base System](../kb/README.md)
- [LLM Providers](../providers/README.md)

---

**Implementation Date**: June 30, 2025  
**Status**: Production Ready  
**Version**: 1.0.0
