# AI-Powered Playwright Test Generation Framework

An enterprise Playwright test framework with an integrated AI pipeline that converts plain-English requirements into fully executable, maintainable test suites — automatically.

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
       │  support/fixtures/visitFixture   │  ← testDesktop / testMobile
       │  support/pages/[PageName].ts     │  ← private locators + methods
       │  support/helper/                 │  ← interceptHelper, CorePattern
       │  tests/e2e/[page].spec.ts        │  ← generated + maintained specs
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
├── support/                          # Framework support layer
│   ├── fixtures/
│   │   └── visitFixture.ts           # testDesktop + testMobile — override page with viewport + auto-navigate
│   ├── pages/
│   │   ├── AeHomePage.ts             # POM: export default class, private readonly locators
│   │   └── AeLoginPage.ts
│   ├── helper/
│   │   ├── interceptHelper.ts        # Standalone: loginWithValidCredentials, doLogOut, verifyPageTitle
│   │   └── commonPattern.ts          # CorePattern class — shared nav helpers
│   ├── utils/
│   │   └── constants.ts              # DESKTOP_VIEW_PORT, MOBILE_VIEW_PORT
│   └── data/
│       └── example.ts                # Template for page data interfaces
│
├── tests/
│   └── e2e/
│       ├── ae-home-excel-1.spec.ts   # Generated specs — AE-TC-001–020 @regression @smoke
│       ├── ae-home-excel-2.spec.ts
│       ├── ae-home-excel-3.spec.ts
│       ├── ae-home-excel-4.spec.ts
│       ├── ae-home-mobile.spec.ts    # Mobile viewport specs — AE-MOB-001–004 @mobile
│       └── ae-home.data.ts           # Shared test data for home page specs
│
├── ai/
│   └── src/
│       ├── generate-all.ts           # PRIMARY: generates all suites from platform.config.json
│       ├── generate-from-excel.ts    # Generates specs from requirements.xlsx
│       ├── test-case-generator/      # TestCaseGenerator — requirement → TestCase[]
│       ├── test-data-generator/      # TestDataGenerator — requirement → TestData
│       ├── action-model/             # AIActionModelGenerator — step → ActionModel
│       ├── assertion-generator/      # AssertionGenerator — expected result → assertion
│       ├── pom-generator/            # POMGenerator + DataFileGenerator
│       ├── self-healing-locator/     # SelfHealingLocatorEngine — heals broken selectors
│       ├── regression-selector/      # RegressionSelector — impact analysis for CI
│       ├── flaky-test-analyzer/      # FlakyTestAnalyzer
│       ├── root-cause-analyzer/      # BugRootCauseAnalyzer
│       └── utils/
│           └── AIJsonParser.ts       # Strips markdown fences, parses typed JSON
│
├── automation/
│   └── src/
│       ├── generators/
│       │   └── PlaywrightGenerator.ts  # Orchestrates actions + assertions → .spec.ts string
│       └── renderers/
│           └── PlaywrightRenderer.ts   # ActionModel → code string (method registry aware)
│
├── knowledge-base/
│   ├── KnowledgeBaseService.ts         # Loads page JSON by name
│   ├── TestCatalogService.ts           # Loads available test suite names
│   ├── ae-home.json                    # Selectors + metadata for automationexercise.com home
│   ├── ae-login.json                   # Selectors + metadata for login page
│   └── test-catalog.json               # Registry of available suite names for regression selector
│
├── llm/
│   └── src/
│       ├── interfaces/LLMProvider.ts   # Common LLM interface
│       ├── providers/                  # GeminiProvider, GitHubModelsProvider, OpenRouterProvider, MockLLMProvider
│       ├── CachingLLMProvider.ts       # Wraps any provider with file-based response caching
│       ├── FallbackProvider.ts         # Circuit breaker + automatic provider failover
│       └── ProviderFactory.ts          # Single entry point — reads LLM_PROVIDER env var
│
├── requirements/
│   └── requirements.xlsx               # Input requirements for the Excel-based pipeline
│
├── docs/
│   ├── DEMO_PITCH.md                   # 2-min pitch, 5-min demo script, feature summary
│   ├── architecture.md
│   ├── current-architecture.md
│   └── self-healing-locator-design.md
│
├── platform.config.json               # Suite definitions for generate:all
├── playwright.config.ts               # Playwright config — multi-browser, Allure, baseURL
├── tsconfig.json                      # TypeScript strict mode config
├── eslint.config.js                   # ESLint flat config + eslint-plugin-playwright
├── .prettierrc                        # Prettier formatting config
├── .env.example                       # Environment variable template — copy to .env
└── ci-workflow.yml                    # CI workflow (move to .github/workflows/ci.yml)
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
BASE_URL=https://automationexercise.com   # defaults to this if omitted
```

> Tests run against `BASE_URL` directly. You can run `npx playwright test` without a `.env` file — it defaults to `https://automationexercise.com`.

### 2. Platform config (for AI pipeline)

`platform.config.json` defines which pages the AI pipeline generates tests for:

```json
{
  "projectName": "My Project",
  "defaultEnvironment": "qa",
  "llmModel": "gpt-4.1-mini",
  "testOutputPath": "tests/e2e/",
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

The `page` field must match a JSON file in `knowledge-base/` (e.g. `"ae-home"` → `knowledge-base/ae-home.json`).

---

## Generating Tests with AI

### Generate from `platform.config.json` (recommended)

```bash
npm run generate:all
```

Reads all suites from `platform.config.json` and generates POMs + specs for each.

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

| Script | Description |
|---|---|
| `npm run generate:all` | AI pipeline — generate specs from platform.config.json |
| `npm run generate:all:qa` | Same, with `ENVIRONMENT=qa` |
| `npm run generate:all:uat` | Same, with `ENVIRONMENT=uat` |
| `npm run ai:run` | AI pipeline — generate specs from requirements.xlsx |
| `npm run test:unit` | Run 69 unit + integration tests for the framework itself |
| `npm run test:smoke` | Run `@smoke` tagged tests |
| `npm run test:regression` | Run `@regression` tagged tests |
| `npm run test:mobile` | Run `@mobile` tagged tests |
| `npm run test:chromium` | Run tests in Chromium only |
| `npm run test:firefox` | Run tests in Firefox only |
| `npm run test:webkit` | Run tests in WebKit only |
| `npm run lint` | ESLint check (0 errors required) |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier — format all files |
| `npm run format:check` | Prettier — check formatting without writing |

---

## Adding a New Page

1. **Add a knowledge base file** — `knowledge-base/my-page.json` with `pageName`, `url`, and `selectors`
2. **Add a suite to platform.config.json**:
   ```json
   { "name": "My Page", "page": "my-page", "outputFile": "my-page.spec.ts" }
   ```
3. **Run the pipeline**: `npm run generate:all`
   - This creates `support/pages/MyPage.ts` and `tests/e2e/my-page.spec.ts`
4. **Enrich the POM** — add behavior/assertion methods following the pattern in `support/pages/AeHomePage.ts`
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

1. Create `llm/src/providers/YourProvider.ts` implementing `LLMProvider`
2. Add a branch in `llm/src/ProviderFactory.ts`
3. Add the required env var to `.env.example` and all `config/environments/*.env` files

---

## CI

The CI workflow runs on every push and pull request to `main`.

> **Note:** `ci-workflow.yml` is currently at the project root due to a file permission issue.
> To activate GitHub Actions, run:
> ```bash
> sudo chown -R $USER .github/
> mv ci-workflow.yml .github/workflows/ci.yml
> ```

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
