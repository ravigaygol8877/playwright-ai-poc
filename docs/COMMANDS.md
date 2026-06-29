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

**Output:** spec files in `tests/e2e/`, Allure results in `reports/latest/allure/`.

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
