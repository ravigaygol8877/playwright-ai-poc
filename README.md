# AI-Powered Playwright Test Generation Framework

An enterprise Playwright test framework with an integrated AI pipeline that converts plain-English requirements into fully executable, maintainable test suites — automatically.

---

**Documentation**

| | |
|---|---|
| [Getting Started](docs/GETTING-STARTED.md) | Clone → configure → first run in 10 minutes |
| [Command Reference](docs/COMMANDS.md) | Every npm script with examples |
| [New Project Onboarding](docs/ONBOARDING.md) | Add a new target application |
| [Framework Structure](docs/FRAMEWORK_STRUCTURE.md) | Every folder explained — purpose, owner, examples |
| [Contributing](docs/CONTRIBUTING.md) | Add providers, extend the pipeline |
| [AI Architecture Evaluation](docs/ai-architecture-evaluation.md) | MCP / Agents / RAG analysis |

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Generating Tests with AI](#generating-tests-with-ai)
- [Running Tests](#running-tests)
- [Available Scripts](#available-scripts)
- [Adding a New Page](#adding-a-new-page)
- [AI Modules Reference](#ai-modules-reference)
- [LLM Provider Abstraction](#llm-provider-abstraction)
- [CI](#ci)

---

## Overview

This framework combines enterprise Playwright conventions with an AI generation pipeline. Given a requirements file and a knowledge base for a page, the platform:

1. Auto-generates test cases (4–10 per requirement) covering happy paths, negative flows, edge cases, and security scenarios
2. Generates realistic test data (valid/invalid credentials, emails, edge-case strings)
3. Generates a Page Object Model following enterprise conventions (`export default class`, `private readonly` locators, public behavior methods)
4. Writes production-quality Playwright spec files with ticket IDs, grep tags, and fixture imports

Everything generated follows the same patterns as hand-written tests — so generated and manual tests are indistinguishable in the suite.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Pipeline                              │
│  Excel Requirements → Knowledge Base → POM → Spec Files     │
│  generate-from-excel.ts  /  generate-all.ts                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
       ┌───────────────▼──────────────────┐
       │           AI Layer               │
       │  TestCaseGenerator               │
       │  TestDataGenerator               │
       │  AIActionModelGenerator          │
       │  AssertionGenerator              │
       │  POMGenerator / DataFileGenerator│
       │  SelfHealingLocatorEngine        │
       │  RegressionSelector              │
       └───────────────┬──────────────────┘
                       │
       ┌───────────────▼──────────────────┐
       │       Automation Layer           │
       │  PlaywrightGenerator             │
       │  PlaywrightRenderer              │
       └───────────────┬──────────────────┘
                       │
       ┌───────────────▼──────────────────┐
       │          Test Layer              │
       │  support/fixtures/              │  ← testDesktop / testMobile
       │    visitFixture.ts              │
       │  support/pages/[page].page.ts  │  ← private locators + methods
       │  support/helper/               │  ← loginHelper, apiHelper
       │  tests/UI/[page].spec.ts        │  ← generated + maintained specs
       └──────────────────────────────────┘
```

### Architecture Principles

| Principle | Description |
|---|---|
| Separation of Concerns | AI pipeline, automation layer, and test layer are independent |
| POM Encapsulation | All locators are `private readonly`; specs call behavior methods only |
| Provider Independence | LLM provider is swappable via `LLM_PROVIDER` env var |
| Reliability | Circuit breaker, caching, and multi-provider fallback baked in |
| Enterprise Conventions | TypeScript strict, ESLint + Playwright rules, Prettier, Allure reporting |

---

## Project Structure

```
playwright-ai-poc/
│
├── pipeline/                         # AI generation pipeline (all logic lives here)
│   ├── models/                       # Shared TypeScript interfaces (KnowledgeBase, TestCase, TestData)
│   ├── providers/                    # LLM provider abstraction
│   │   ├── interfaces/LLMProvider.ts # Common LLMProvider interface
│   │   ├── ProviderFactory.ts        # Reads LLM_PROVIDER env var, returns provider
│   │   ├── GeminiProvider.ts / GitHubModelsProvider.ts / OpenRouterProvider.ts
│   │   ├── CachingLLMProvider.ts     # File-based response cache
│   │   └── FallbackProvider.ts       # Circuit breaker + auto-failover
│   ├── kb/                           # Knowledge base layer
│   │   ├── pages/                    # Per-page JSON (selectors, URLs, messages)
│   │   ├── KnowledgeBaseService.ts   # Loads page JSON by name
│   │   ├── KnowledgeBaseGenerator.ts # Crawls a live URL, generates KB JSON
│   │   ├── SelectorRetriever.ts      # RAG: keyword + synonym scoring for selectors
│   │   └── TestCatalogService.ts     # Lists available test suites
│   ├── generators/                   # Code/artifact generators
│   │   ├── test-cases/               # TestCaseGenerator — requirement → TestCase[]
│   │   ├── test-data/                # TestDataGenerator — requirement → TestData
│   │   ├── action-model/             # ActionModel + AI/Rule-based generators
│   │   ├── assertions/               # AssertionGenerator — expectedResult → assertion
│   │   ├── playwright/               # PlaywrightGenerator + PlaywrightRenderer → .spec.ts
│   │   └── pom/                      # POMGenerator, DataFileGenerator, FixtureUpdater
│   ├── analyzers/                    # Post-run analysis modules
│   │   ├── flaky/                    # FlakyTestAnalyzer
│   │   ├── root-cause/               # BugRootCauseAnalyzer
│   │   ├── coverage/                 # CoverageAnalyzer
│   │   ├── regression/               # RegressionSelector — impacted suites from diff
│   │   └── self-healing/             # SelfHealingLocatorEngine
│   ├── execution/                    # Test execution engine
│   ├── readers/                      # ExcelReader + RequirementExpander
│   ├── reporting/                    # ReportingService + RunContext
│   ├── orchestrator/                 # TestIntelligenceOrchestrator
│   └── utils/                        # AIJsonParser, ArtifactManifest, concurrency
│
├── tests/                            # Playwright test suite
│   ├── UI/                           # Generated + hand-written spec files
│   │   └── parabank-login.spec.ts    # TC-001 @regression
│   ├── API/                          # API-level test specs
│   └── unit/                         # Vitest unit tests for pipeline modules
│
├── support/
│   ├── fixtures/
│   │   └── visitFixture.ts           # testDesktop + testMobile custom fixtures
│   ├── pages/                        # Page Object Models (.page.ts suffix)
│   │   └── loginPage.page.ts         # private readonly locators + public methods
│   └── helper/                       # loginHelper, apiHelper, fileReader, constants
│
├── scripts/                          # CLI entry points
│   ├── run-pipeline.ts               # npm run ai:run
│   ├── generate-all.ts               # npm run generate:all (reads config/platform.json)
│   ├── generate-from-excel.ts        # npm run generate:from-excel
│   ├── generate-pom.ts               # npm run generate:pom
│   ├── generate-kb.ts                # npm run kb:generate
│   ├── demo.ts                       # npm run demo — full live demo
│   └── demo-*.ts / project-reset.ts  # Sub-demos and utilities
│
├── config/
│   ├── platform.json                 # Suite definitions for generate:all
│   └── environments/                 # Per-env .env files (qa, uat, production)
│
├── requirements/
│   └── requirements.xlsx             # Input requirements for the Excel pipeline
│
├── docs/
│   ├── GETTING-STARTED.md            # Clone → first run in 10 minutes
│   ├── FRAMEWORK_OVERVIEW.md         # Developer KT guide — full walkthrough
│   ├── COMMANDS.md                   # Every npm script explained
│   ├── ONBOARDING.md                 # Add a new target application
│   ├── SELF-HEALING.md               # ai:heal command guide
│   ├── AI-ANALYTICS.md               # ai:flaky / ai:rootcause / ai:coverage / ai:regression
│   └── CONTRIBUTING.md               # Add providers, extend the pipeline
│
├── playwright.config.ts              # Multi-browser, Allure, baseURL
├── tsconfig.json                     # TypeScript strict mode
└── .env.example                      # Environment variable template
```

---

## Prerequisites

- Node.js 18+
- Git
- An LLM provider API key — see [LLM Provider Abstraction](#llm-provider-abstraction)

---

## Installation

```bash
git clone <repo-url>
cd playwright-ai-poc
npm install
npx playwright install
```

---

## Configuration

### 1. Environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Open `.env` and set the credentials for the LLM provider you want to use:

```env
# Choose one provider
LLM_PROVIDER=gemini           # or github-models / openrouter

# Provider credentials (only the one you chose is required)
GOOGLE_API_KEY=your-key       # for gemini
GITHUB_TOKEN=your-token       # for github-models
OPENROUTER_API_KEY=your-key   # for openrouter

# Target application
BASE_URL=https://parabank.parasoft.com   # defaults to this if omitted
```

> Tests run against `BASE_URL` directly. You can run `npx playwright test` without a `.env` file — it defaults to `https://parabank.parasoft.com`.

### 2. Platform config (for AI pipeline)

`config/platform.json` defines which pages the AI pipeline generates tests for:

```json
{
  "projectName": "My Project",
  "defaultEnvironment": "qa",
  "llmModel": "gpt-4.1-mini",
  "testOutputPath": "tests/UI/",
  "reportOutputPath": "reports/",
  "suites": [
    {
      "name": "Home Page",
      "page": "ae-home",
      "outputFile": "ae-home.spec.ts"
    }
  ]
}
```

The `page` field must match a JSON file in ``pipeline/kb/pages/` (e.g. `"ae-home"` → `pipeline/kb/pages/ae-home.json`).

---

## Generating Tests with AI

### Generate from `config/platform.json` (recommended)

```bash
npm run generate:all
```

Reads all suites from `config/platform.json` and generates POMs + specs for each.

```bash
# With a specific environment
npm run generate:all:qa
npm run generate:all:uat
```

### Generate from Excel requirements

```bash
npm run ai:run
```

Reads `requirements/requirements.xlsx` and generates specs for each requirement sheet.

### Override the LLM provider

```bash
LLM_PROVIDER=github-models MODEL=gpt-4.1-mini npm run generate:all
LLM_PROVIDER=gemini MODEL=gemini-2.0-flash npm run generate:all
```

---

## Running Tests

```bash
# Run all tests
npx playwright test

# Run by tag
npm run test:smoke       # @smoke — fast sanity checks
npm run test:regression  # @regression — full suite
npm run test:mobile      # @mobile — mobile viewport tests

# Run by browser
npm run test:chromium
npm run test:firefox
npm run test:webkit

# Open Playwright UI
npx playwright test --ui

# View the HTML report
npx playwright show-report
```

---

## Available Scripts

For the full command reference see **[docs/COMMANDS.md](docs/COMMANDS.md)**.

| Script | Description |
|---|---|
| `npm run ai:run` | Full pipeline — requirements.xlsx → specs → tests → report |
| `npm run generate:all` | Generate specs from config/platform.json (no test execution) |
| `npm run test:unit` | Unit tests for the framework itself |
| `npm run test:smoke` | Run `@smoke` tagged tests |
| `npm run test:regression` | Run `@regression` tagged tests |
| `npm run test:mobile` | Run `@mobile` tagged tests |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type check (0 errors required) |
| `npm run format` | Prettier — format all files |

---

## Adding a New Page

1. **Add a knowledge base file** — `pipeline/kb/pages/my-page.json` with `pageName`, `url`, and `selectors`
2. **Add a suite to config/platform.json**:
   ```json
   { "name": "My Page", "page": "my-page", "outputFile": "my-page.spec.ts" }
   ```
3. **Run the pipeline**: `npm run generate:all`
   - This creates `support/pages/myPage.page.ts` and `tests/UI/my-page.spec.ts`
4. **Enrich the POM** — add behavior/assertion methods following the pattern in `support/pages/loginPage.page.ts`
5. **Update `support/fixtures/visitFixture.ts`** if you need a custom fixture for the new page

---

## AI Modules Reference

### `TestCaseGenerator`
Accepts a plain-English requirement. Returns 4–10 `TestCase` objects covering positive, negative, edge, and security scenarios. Throws if the LLM returns fewer than 4 cases.

### `TestDataGenerator`
Accepts a requirement. Returns a `TestData` object with valid/invalid values appropriate for the page under test.

### `POMGenerator`
Accepts a knowledge base. Generates a TypeScript Page Object Model: `export default class`, `private readonly` locators, `constructor(page: Page)`.

### `AssertionGenerator`
Accepts an expected result string and knowledge base. Returns an executable Playwright assertion.

### `SelfHealingLocatorEngine`
Accepts a `LocatorFailure` (failed selector + page name) and the KB for that page. Returns a healed selector from the KB with a confidence score.

### `RegressionSelector`
Accepts a list of changed file paths. Returns which test suites from `test-catalog.json` should be run — LLM output is filtered against the known catalog so invented suite names are never returned.

### `FlakyTestAnalyzer`
Accepts test execution data (retries, duration, failure message). Returns a flakiness probability score and fix recommendation.

### `BugRootCauseAnalyzer`
Accepts a failure (test name, error, stack trace, log). Returns failure classification, root cause, impacted component, and confidence score.

### `AIJsonParser`
Generic typed utility that strips markdown fences from LLM responses and parses the result as typed JSON. Used by all AI modules.

---

## LLM Provider Abstraction

All LLM calls go through a single interface:

```typescript
export interface LLMProvider {
  generateResponse(prompt: string): Promise<string>;
}
```

`ProviderFactory.create()` reads `LLM_PROVIDER` and `MODEL` from the environment and returns the correct implementation — no code changes required to switch providers.

### Supported Providers

| `LLM_PROVIDER` | Class | Key Required | Default Model |
|---|---|---|---|
| `gemini` (default) | `GeminiProvider` | `GOOGLE_API_KEY` | `gemini-2.0-flash` |
| `github-models` | `GitHubModelsProvider` | `GITHUB_TOKEN` | `gpt-4.1` |
| `openrouter` | `OpenRouterProvider` | `OPENROUTER_API_KEY` | `openai/gpt-4.1-mini` |
| — | `MockLLMProvider` | none | — |

### Reliability Features

| Feature | Description |
|---|---|
| `CachingLLMProvider` | File-based cache — skips API calls for unchanged prompts |
| `FallbackProvider` | Wraps multiple providers; auto-switches on failure |
| Circuit Breaker | Trips after 5 consecutive failures — prevents retry storms |

### Switching Providers

```bash
LLM_PROVIDER=gemini npm run generate:all
LLM_PROVIDER=github-models MODEL=gpt-4.1 npm run generate:all
LLM_PROVIDER=openrouter MODEL=openai/gpt-4.1-mini npm run generate:all
```

### Adding a New Provider

1. Create `pipeline/providers/YourProvider.ts` implementing `LLMProvider`
2. Add a branch in `pipeline/providers/ProviderFactory.ts`
3. Add the required env var to `.env.example` and all `config/environments/*.env` files

---

## CI

The CI workflow (`.github/workflows/playwright.yml`) runs on every push and PR to `main`.

### What runs in CI

| Check | Command |
|---|---|
| TypeScript type check | `npx tsc --noEmit` |
| ESLint | `npm run lint` |
| Unit tests | `npm run test:unit` |
| Smoke tests (Chromium) | `npx playwright test --grep @smoke --project=chromium` |

### Required GitHub Secrets

Add in **Settings → Secrets and variables → Actions**:

| Secret | Used for |
|---|---|
| `GOOGLE_API_KEY` | Gemini provider |
| `GITHUB_TOKEN_MODELS` | GitHub Models provider |
| `OPENROUTER_API_KEY` | OpenRouter provider |
