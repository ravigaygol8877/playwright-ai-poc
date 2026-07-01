# Command Reference

Every npm script in this project, with purpose, usage, and when to reach for it.

---

## AI Generation Pipeline

### `npm run ai:run`
Runs the full pipeline: parse requirements → generate POMs → expand test cases → write spec files → execute tests → open Allure report.

```bash
npm run ai:run                         # development environment
npm run ai:run:qa                      # QA environment (loads config/environments/qa.env)
npm run ai:run:uat                     # UAT environment
SKIP_TESTS=true npm run ai:run         # generate only, skip test execution
SKIP_REPORT=true npm run ai:run        # skip Allure report generation
EXCEL_FILE=custom.xlsx npm run ai:run  # use a different requirements file
```

**Output:** spec files in `tests/UI/`, HTML report in `reports/latest/playwright/`.

---

### `npm run generate:from-excel`
Runs Steps 1–5 of the pipeline plus Step 2.5 (scenario discovery) — parses requirements, generates the Knowledge Base if not present, infers test scenarios, and generates spec files without executing them.

```bash
npm run generate:from-excel
```

Use this when you want to inspect the generated specs before running them.

---

### `npm run generate:pom`
Generates a single Page Object Model from a knowledge-base (KB) JSON file.

```bash
npm run generate:pom
```

Use this when you've manually edited a KB JSON and want to regenerate the POM without triggering the full pipeline.

---

### `npm run generate`
Older single-suite generation entry point with verbose output. For multi-suite projects, prefer `generate:from-excel` or `generate:all`.

```bash
npm run generate
```

---

### `npm run generate:all`
Generates specs for all requirements across all configured pages at once.

```bash
npm run generate:all
npm run generate:all:qa    # with QA environment overrides
npm run generate:all:uat   # with UAT environment overrides
```

---

## Knowledge Base

### `npm run kb:generate`
Generates a knowledge-base (KB) JSON file for a page by crawling its live URL with a headless browser and extracting selectors via AI.

```bash
npm run kb:generate <url> <page-name>
```

Example: `npm run kb:generate https://myapp.com/login myapp-login`

Output goes to `pipeline/kb/pages/<page-name>.json`.

---

## Demo Scripts

### `npm run demo`
Full end-to-end demo covering all AI scenarios (login, registration, transfer, self-healing locator, root cause, flaky test analysis, coverage gaps, regression selection).

```bash
npm run demo
```

Use this for live presentations or onboarding new team members.

---

### `npm run demo:flaky`
Demonstrates the Flaky Test Analyzer on a sample test history.

### `npm run demo:rootcause`
Demonstrates the Root Cause Analyzer on a sample CI failure.

### `npm run demo:healing`
Demonstrates the Self-Healing Locator on a broken selector.

### `npm run demo:coverage`
Demonstrates the Coverage Gap Analyzer on a sample requirement set.

### `npm run demo:regression`
Demonstrates the Regression Selector for a sample PR diff.

---

## AI Self-Healing

### `npm run ai:heal`
Reads the latest Playwright JSON results, identifies locator failures, heals broken selectors using AI + Knowledge Base, and updates POM files.

```bash
npm run ai:heal                              # default — 70% min confidence
npm run ai:heal -- --min-confidence 85       # stricter threshold
npm run ai:heal -- --max-heals 5             # limit heals per run
npm run ai:heal -- --enable-rerun            # re-run failed tests after healing
NO_OPEN=true npm run ai:heal                 # suppress auto-opening HTML report
```

---

### `npm run ai:heal:dry`
Runs the healing pipeline but skips all AI calls — only applies knowledge-base direct matches. Useful for quick, zero-cost triage.

```bash
npm run ai:heal:dry
```

---

### `npm run ai:heal:rerun`
Runs healing with `--enable-rerun` pre-set, automatically re-running the healed tests to validate fixes.

```bash
npm run ai:heal:rerun
```

---

## AI Analytics

### `npm run ai:flaky`
Analyzes Playwright test results to identify flaky tests and generates AI-powered recommendations.

```bash
npm run ai:flaky
```

**Output:** JSON + HTML report in `reports/analysis/`.

---

### `npm run ai:rootcause`
Parses test failure messages and stack traces to classify root causes and recommend fixes.

```bash
npm run ai:rootcause
```

**Output:** JSON + HTML report in `reports/analysis/`.

---

### `npm run ai:coverage`
Maps requirements against existing test names to calculate coverage percentage and surface gaps.

```bash
npm run ai:coverage
```

**Output:** JSON + HTML report in `reports/analysis/`.

---

### `npm run ai:regression`
Assesses regression risk from recent test failures and produces a risk matrix.

```bash
npm run ai:regression
```

**Output:** JSON + HTML report in `reports/analysis/`.

---

## Test Execution

### `npm test`
Runs all Playwright specs across all configured browsers.

```bash
npm test
```

---

### `npm run test:chromium` / `test:firefox` / `test:webkit`
Run tests in a single browser.

```bash
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

---

### `npm run test:qa` / `test:uat` / `test:prod`
Run tests against a specific environment. Loads the corresponding `.env` file from `config/environments/`.

```bash
npm run test:qa
npm run test:uat
npm run test:prod
```

---

### `npm run test:smoke` / `test:regression` / `test:mobile`
Run tests filtered by tag.

```bash
npm run test:smoke       # tests tagged @smoke
npm run test:regression  # tests tagged @regression
npm run test:mobile      # tests tagged @mobile
```

---

## Reports

### `npm run report:latest`
Opens the most recent Playwright HTML report in the browser.

```bash
npm run report:latest
```

---

### `npm run allure:serve`
Starts Allure's live server to browse the last test run report.

```bash
npm run allure:serve
```

---

### `npm run allure:generate` / `allure:open` / `allure:full`

```bash
npm run allure:generate  # generate HTML from raw results
npm run allure:open      # open the generated HTML report
npm run allure:full      # run tests → generate → open (all in one)
```

---

## Requirements Template

### `npm run requirements:template`
Creates a blank `requirements.xlsx` with the correct column headers pre-filled.

```bash
npm run requirements:template
```

Use this when setting up the framework for a new project.

---

## Code Quality

### `npm run typecheck`
Runs TypeScript type checking without emitting output. Zero errors required before merging.

```bash
npm run typecheck
```

---

### `npm run test:unit` / `test:unit:watch`
Runs unit tests with Vitest.

```bash
npm run test:unit        # single pass (CI mode)
npm run test:unit:watch  # watch mode (dev mode)
```

---

### `npm run lint` / `lint:fix`
Runs ESLint across the project.

```bash
npm run lint       # report only
npm run lint:fix   # auto-fix what's fixable
```

---

### `npm run format` / `format:check`
Formats all files with Prettier.

```bash
npm run format        # write changes
npm run format:check  # check only (CI mode)
```

---

## Utilities

### `npm run cache:clear`
Deletes the `.llm-cache/` directory to force fresh LLM calls on the next pipeline run.

```bash
npm run cache:clear
```

Use this when a prompt was updated but old cached responses are still being returned.

---

### `npm run project:reset`
Resets generated artifacts (spec files, POMs, data files) so the pipeline starts clean.

```bash
npm run project:reset
```

---

### `npm run test:provider-switching`
Tests that the LLM provider failover chain works correctly.

```bash
npm run test:provider-switching
```

---

### `npm run test:github-models`
Tests the GitHub Models (GPT-4.1) provider directly.

```bash
LLM_PROVIDER=github-models npm run test:github-models
```

Requires `GITHUB_TOKEN` in `.env`.

---

## Execution Time & Token Consumption Summary

Token estimates are input + output combined, averaged across typical runs.  
**Cached** = `CachingLLMProvider` returns a disk-cached response (`.llm-cache/`) — no API call, no tokens consumed.

### AI Generation Commands (invoke the LLM)

| Command | First Run | Cached Run | LLM Calls | ~Tokens (first run) | Cache mechanism |
|---|---|---|---|---|---|
| `npm run ai:run` | 15–25 min | 3–5 min | 20–50 | 80k–150k† | CachingLLMProvider + ArtifactManifest + spec manifest |
| `npm run generate:from-excel` | 10–18 min | 30–60 sec | 20–50 | 80k–150k† | CachingLLMProvider + ArtifactManifest + spec manifest |
| `npm run generate:all` | 5–15 min | 10–30 sec | 10–25 | 30k–70k† | CachingLLMProvider |
| `npm run generate:pom` | 30–60 sec | 3–5 sec | 2 per page | 5k–8k per page | CachingLLMProvider + ArtifactManifest |
| `npm run kb:generate` | 30–60 sec | 3–5 sec | 1 | 3k–5k | CachingLLMProvider |
| `npm run demo` | 8–12 min | 15–30 sec | ~40 | 70k–100k | CachingLLMProvider |
| `npm run demo:flaky` | 5–10 sec | 1–2 sec | 1 | 1.5k–2.5k | CachingLLMProvider |
| `npm run demo:rootcause` | 5–10 sec | 1–2 sec | 1 | 1.5k–2.5k | CachingLLMProvider |
| `npm run demo:healing` | 5–10 sec | 1–2 sec | 1 | 1.5k–2.5k | CachingLLMProvider |
| `npm run demo:coverage` | 5–10 sec | 1–2 sec | 1 | 1.5k–2.5k | CachingLLMProvider |
| `npm run demo:regression` | 5–10 sec | 1–2 sec | 1 | 1.5k–2.5k | CachingLLMProvider |
| `npm run ai:heal` | 15–45 sec | 5–10 sec | 0–3 | 0–8k | CachingLLMProvider (KB matches skip AI) |
| `npm run ai:heal:dry` | 5–10 sec | 1–3 sec | 0 | 0 | KB-only, no AI |
| `npm run ai:flaky` | 15–30 sec | 3–8 sec | 0–3 | 0–5k | CachingLLMProvider |
| `npm run ai:rootcause` | 20–40 sec | 5–10 sec | 0–5 | 0–8k | CachingLLMProvider |
| `npm run ai:coverage` | 10–20 sec | 3–5 sec | 0–2 | 0–4k | CachingLLMProvider |
| `npm run ai:regression` | 15–30 sec | 3–8 sec | 0–3 | 0–5k | CachingLLMProvider |
| `npm run test:provider-switching` | 10–30 sec | 5–10 sec | 3–5 | 5k–10k | CachingLLMProvider |
| `npm run test:github-models` | 5–15 sec | 3–5 sec | 2–3 | 3k–5k | CachingLLMProvider |

> † Token count scales with project size. Estimate: ~15k–25k tokens per page (KB + POM + data file) and ~3k–5k tokens per requirement row (test case expansion + spec generation). A 10-row, 2-page project uses ~80k–100k tokens on first run.

**What drives the most tokens in `ai:run` / `generate:from-excel`:**
1. **Step 5 — Spec generation** — largest consumer: `AIActionModelGenerator` makes one call per test-case step (~3–5 steps each), plus one `AssertionGenerator` call per test case.
2. **Step 4 — Test case expansion** — one LLM call per requirement row in Excel.
3. **Step 2 — KB generation** — one call per new page (includes full DOM snapshot in the prompt).

**What eliminates redundant token use:**
- `ArtifactManifest` — unchanged requirement rows skip Step 4 and 5 entirely (zero LLM calls).
- Spec manifest (`.llm-cache/spec-manifest.json`) — if generated test cases are identical to the last run, spec files are not regenerated.
- Scenario cache (`pipeline/kb/pages/{page}-scenarios.json`) — Step 2.5 AI discovery runs only once per page; result is stored on disk.
- `CachingLLMProvider` — every prompt is SHA-256 hashed; identical prompts always return the cached response.

---

### Execution & Reporting Commands (no LLM calls)

| Command | Typical Duration | LLM Calls | Tokens |
|---|---|---|---|
| `npm test` | 1–3 min per spec file | 0 | 0 |
| `npm run test:qa` / `test:uat` / `test:prod` | 1–3 min per spec file | 0 | 0 |
| `npm run test:chromium` / `firefox` / `webkit` | 1–3 min per spec file | 0 | 0 |
| `npm run test:smoke` / `regression` / `mobile` | 30 sec – 2 min | 0 | 0 |
| `npm run report:latest` | 1–2 sec | 0 | 0 |
| `npm run allure:generate` | 5–15 sec | 0 | 0 |
| `npm run allure:serve` | 3–5 sec | 0 | 0 |
| `npm run allure:full` | 2–5 min + test time | 0 | 0 |

---

### Utility Commands (no LLM calls)

| Command | Typical Duration | LLM Calls | Tokens |
|---|---|---|---|
| `npm run project:reset` | 2–5 sec | 0 | 0 |
| `npm run requirements:template` | 2–3 sec | 0 | 0 |
| `npm run cache:clear` | 1–2 sec | 0 | 0 |
| `npm run typecheck` | 10–20 sec | 0 | 0 |
| `npm run test:unit` | 5–10 sec | 0 | 0 |
| `npm run lint` / `lint:fix` | 5–10 sec | 0 | 0 |
| `npm run format` / `format:check` | 3–8 sec | 0 | 0 |
