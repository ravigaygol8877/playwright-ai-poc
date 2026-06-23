# Playwright AI POC

An AI-powered Playwright test generation platform that converts plain-English requirements into fully executable Playwright test suites — with no manual scripting required.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the AI Generator](#running-the-ai-generator)
- [Running Generated Tests](#running-generated-tests)
- [AI Pipeline Flow](#ai-pipeline-flow)
- [Module Reference](#module-reference)
- [Knowledge Base](#knowledge-base)
- [LLM Provider Abstraction](#llm-provider-abstraction)
- [Roadmap](#roadmap)

---

## Overview

This project is a proof-of-concept for an AI Test Intelligence Platform. Given a plain-English requirement such as:

> "User should be able to login using valid username and password"

The platform:

1. Generates a full regression test suite (5–10 test cases) using an LLM
2. Generates realistic test data (valid/invalid credentials)
3. Converts each test step into a concrete Playwright action using a knowledge base
4. Generates Playwright assertions for each expected result
5. Writes a ready-to-run `.spec.ts` file to `tests/generated/`

---

## Architecture

The platform is built as independent, loosely-coupled layers:

```
┌─────────────────────────────────────────────────────┐
│                    Entry Point                       │
│                  ai/src/index.ts                     │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │        AI Layer         │
          │  TestCaseGenerator      │
          │  TestDataGenerator      │
          │  PlaywrightActionGen.   │
          │  AssertionGenerator     │
          │  FlakyTestAnalyzer      │
          │  SelfHealingLocator     │
          │  BugRootCauseAnalyzer   │
          │  RegressionSelector     │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │    Automation Layer     │
          │   PlaywrightGenerator   │
          │   PlaywrightRenderer    │
          └────────────┬────────────┘
                       │
     ┌─────────────────▼──────────────────┐
     │           Support Layers            │
     │  LLM Layer       Knowledge Base     │
     │  LLMProvider     KnowledgeBase      │
     │  OpenRouter       Service           │
     │  MockProvider    login-page.json    │
     └─────────────────────────────────────┘
```

### Architecture Principles

| Principle | Description |
|-----------|-------------|
| Separation of Concerns | Automation, AI, LLM, and Knowledge Base are independent layers |
| Modularity | New AI modules can be added without affecting existing ones |
| Provider Independence | Multiple LLM providers supported via a common interface |
| Reusability | Shared models and utilities are centralized |
| Scalability | Designed for future agents, RAG systems, and vector databases |

---

## Project Structure

```
playwright-ai-poc/
├── ai/
│   └── src/
│       ├── action-model/
│       │   ├── ActionModel.ts              # ActionModel interface (goto/fill/click)
│       │   └── AIActionModelGenerator.ts   # LLM → ActionModel conversion
│       ├── assertion-generator/
│       │   └── AssertionGenerator.ts       # LLM → Playwright assertion
│       ├── flaky-test-analyzer/
│       │   ├── FlakyTestAnalyzer.ts        # Analyses execution data for flaky patterns
│       │   ├── FlakyTestAnalysis.ts        # Output interface (probability, causes, fix)
│       │   └── TestExecutionData.ts        # Input interface (name, retries, duration, error)
│       ├── models/
│       │   ├── TestCase.ts                 # TestCase interface
│       │   └── TestData.ts                 # TestData interface
│       ├── playwright-generator/
│       │   └── PlaywrightActionGenerator.ts # LLM → Playwright action statement
│       ├── regression-selector/
│       │   ├── RegressionSelector.ts       # Selects impacted test suites from changed files
│       │   └── RegressionSelection.ts      # Output interface (files, features, suites, reasoning)
│       ├── root-cause-analyzer/
│       │   ├── BugRootCauseAnalyzer.ts     # Diagnoses failure type, cause, and fix
│       │   ├── FailureAnalysisInput.ts     # Input interface (name, message, stack, log)
│       │   └── RootCauseAnalysisResult.ts  # Output interface (type, cause, component, confidence)
│       ├── self-healing-locator/
│       │   ├── SelfHealingLocatorEngine.ts # Heals broken locators using the knowledge base
│       │   ├── LocatorFailure.ts           # Input interface (failedLocator, pageName)
│       │   └── LocatorHealingResult.ts     # Output interface (healed selector, confidence, reason)
│       ├── test-case-generator/
│       │   └── TestCaseGenerator.ts        # Requirement → TestCase[]
│       ├── test-data-generator/
│       │   └── TestDataGenerator.ts        # Requirement → TestData
│       ├── utils/
│       │   └── AIJsonParser.ts             # Generic typed JSON parser — strips LLM markdown fences
│       └── index.ts                        # Main entry point / orchestrator
│
├── automation/
│   └── src/
│       ├── generators/
│       │   └── PlaywrightGenerator.ts      # Orchestrates actions + assertions → .spec.ts
│       └── renderers/
│           └── PlaywrightRenderer.ts       # Renders ActionModel objects to code strings
│
├── knowledge-base/
│   ├── KnowledgeBaseService.ts             # Loads page JSON files by name
│   ├── TestCatalogService.ts               # Loads the available test suite catalog
│   ├── login-page.json                     # Selectors, URLs, and messages for login page
│   └── test-catalog.json                   # Registry of available test suite names
│
├── llm/
│   └── src/
│       ├── interfaces/
│       │   └── LLMProvider.ts              # Common LLM interface
│       ├── providers/
│       │   ├── OpenRouterProvider.ts       # OpenRouter (GPT-4.1-mini) implementation
│       │   └── MockLLMProvider.ts          # Mock provider for local testing
│       └── index.ts
│
├── tests/
│   └── generated/
│       └── login.spec.ts                   # AI-generated Playwright test file
│
├── docs/
│   ├── architecture.md                     # Architecture vision and principles
│   ├── current-architecture.md             # Current implemented architecture snapshot
│   └── self-healing-locator-design.md      # Design doc for the self-healing locator module
│
├── playwright.config.ts                    # Playwright config (Chromium, Firefox, WebKit)
├── tsconfig.json                           # TypeScript configuration
├── package.json
└── .env                                    # Environment variables (not committed)
```

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | ^6.0.3 | Type-safe implementation |
| Playwright | ^1.61.0 | Test execution engine |
| OpenAI SDK | ^6.44.0 | LLM API client (used with OpenRouter) |
| OpenRouter | — | LLM gateway (routes to GPT-4.1-mini) |
| tsx | ^4.22.4 | TypeScript execution without compilation |
| dotenv | ^17.4.2 | Environment variable management |
| Node.js ESM | — | Native ES module support |

---

## Prerequisites

- Node.js 18+
- An [OpenRouter](https://openrouter.ai) account with an API key
- Git

---

## Installation

```bash
git clone https://github.com/ravigaygol8877/playwright-ai-poc.git
cd playwright-ai-poc
npm install
npx playwright install
```

---

## Configuration

Create a `.env` file in the project root:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

The `OpenRouterProvider` reads this key at startup and will throw if it is missing.

---

## Running the AI Generator

This command runs the full AI pipeline and writes the generated spec file:

```bash
npx tsx ai/src/index.ts
```

**What happens:**

1. `TestCaseGenerator` calls the LLM and returns 5–10 structured test cases
2. `TestDataGenerator` calls the LLM and returns valid/invalid credential pairs
3. `PlaywrightGenerator` loops over each test case and:
   - Calls `PlaywrightActionGenerator` once per step to produce a Playwright statement
   - Calls `AssertionGenerator` once per expected result to produce an assertion
4. The assembled spec is written to `tests/generated/login.spec.ts`

---

## Running Generated Tests

```bash
# Run all generated tests in all browsers
npx playwright test

# Run in a specific browser
npx playwright test --project=chromium

# View the HTML report
npx playwright show-report
```

> **Note:** The generated tests target `https://example.com/login` by default (from the knowledge base). Update `knowledge-base/login-page.json` with your application's URL and selectors before running against a real app.

---

## AI Pipeline Flow

```
Requirement (string)
        │
        ▼
 TestCaseGenerator ──────► LLM ──► TestCase[]
        │
        ▼
 TestDataGenerator ──────► LLM ──► TestData
        │
        ▼
 PlaywrightGenerator
   │
   ├── for each TestCase.step:
   │     PlaywrightActionGenerator ──► LLM + KnowledgeBase ──► "await page.fill(...)"
   │
   └── for each TestCase.expectedResult:
         AssertionGenerator ──────────► LLM + KnowledgeBase ──► "await expect(...)"
        │
        ▼
  Assembled .spec.ts ──► tests/generated/login.spec.ts
```

All LLM calls use **strict prompt engineering** — prompts explicitly forbid markdown fences, explanations, and invented selectors/variables, ensuring the output is always valid, executable TypeScript.

---

## Module Reference

### `TestCaseGenerator`

Accepts a plain-English requirement string. Returns an array of `TestCase` objects covering positive, negative, validation, and edge-case scenarios.

```typescript
interface TestCase {
  id: string;
  title: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
}
```

### `TestDataGenerator`

Accepts a plain-English requirement string. Returns a `TestData` object with generated credential pairs.

```typescript
interface TestData {
  validUsername: string;
  validPassword: string;
  invalidUsername: string;
  invalidPassword: string;
}
```

### `PlaywrightActionGenerator`

Accepts a single test step string and a knowledge base object. Returns a single executable Playwright statement using only selectors and URLs from the knowledge base.

### `AssertionGenerator`

Accepts an expected result string and a knowledge base object. Returns a single executable Playwright assertion statement.

### `PlaywrightRenderer`

Converts a typed `ActionModel` object (goto / fill / click) into a code string. Used as an alternative, structured rendering path.

```typescript
interface ActionModel {
  action: "goto" | "fill" | "click";
  target: string;
  value?: string;
}
```

### `KnowledgeBaseService`

Reads a JSON file from the `knowledge-base/` directory by page name and returns the parsed object.

```typescript
const kb = new KnowledgeBaseService().load("login-page");
```

### `FlakyTestAnalyzer`

Accepts a `TestExecutionData` object and returns a `FlakyTestAnalysis` with a flakiness probability score, possible causes, and a fix recommendation.

```typescript
interface TestExecutionData {
  testName: string;
  retryCount: number;
  duration: number;
  failureMessage: string;
}

interface FlakyTestAnalysis {
  testName: string;
  flakyProbability: number;   // 0–100
  possibleCauses: string[];
  recommendation: string;
}
```

### `SelfHealingLocatorEngine`

Accepts a `LocatorFailure` and the knowledge base for the relevant page. Returns a `LocatorHealingResult` with a healed selector drawn exclusively from the knowledge base.

```typescript
interface LocatorFailure {
  failedLocator: string;
  pageName: string;
}

interface LocatorHealingResult {
  originalLocator: string;
  healedLocator: string;
  confidence: number;   // 0–100
  reasoning: string;
}
```

### `BugRootCauseAnalyzer`

Accepts a `FailureAnalysisInput` (test name, error message, stack trace, execution log) and returns a `RootCauseAnalysisResult` with failure classification, root cause, impacted component, and a confidence score. Validates that the confidence score is within 0–100 and that all required fields are present.

```typescript
interface FailureAnalysisInput {
  testName: string;
  failureMessage: string;
  stackTrace: string;
  executionLog: string;
}

interface RootCauseAnalysisResult {
  failureType: string;
  probableCause: string;
  impactedComponent: string;
  recommendation: string;
  confidence: number;   // 0–100
}
```

### `RegressionSelector`

Accepts a list of changed file paths and returns a `RegressionSelection` identifying impacted features and which test suites from `test-catalog.json` should be run. Filters LLM output against the known catalog so invented suite names are never returned.

```typescript
interface RegressionSelection {
  changedFiles: string[];
  impactedFeatures: string[];
  recommendedTests: string[];   // only values present in test-catalog.json
  reasoning: string;
}
```

### `AIJsonParser`

Generic typed utility that strips markdown code fences from LLM responses and parses the result as JSON. Used by all AI modules.

```typescript
const result = AIJsonParser.parse<MyType>(llmResponse);
```

---

## Knowledge Base

The knowledge base stores page-specific metadata used to ground LLM-generated code. Each page has its own JSON file.

**`knowledge-base/login-page.json`**

```json
{
  "pageName": "Login Page",
  "url": "https://example.com/login",
  "selectors": {
    "username": "#username",
    "password": "#password",
    "loginButton": "#login"
  },
  "messages": {
    "invalidLogin": "Invalid username or password",
    "usernameRequired": "Username is required",
    "passwordRequired": "Password is required"
  },
  "success": {
    "redirectUrl": "/dashboard"
  }
}
```

To add a new page, create a new JSON file following the same structure and load it by name:

```typescript
const kb = new KnowledgeBaseService().load("dashboard-page");
```

### `TestCatalogService`

Reads `knowledge-base/test-catalog.json` and returns the flat list of available test suite names. Used by `RegressionSelector` to constrain LLM output to known suites only.

```typescript
const suites = new TestCatalogService().load();
// ["Login Tests", "Registration Tests", "Checkout Tests", ...]
```

**`knowledge-base/test-catalog.json`** — add a suite name here to make it eligible for AI-driven regression selection:

```json
{
  "testSuites": [
    "Login Tests",
    "Registration Tests",
    "Password Reset Tests",
    "User Profile Tests",
    "Search Tests",
    "Checkout Tests",
    "Order Tests"
  ]
}
```

---

## LLM Provider Abstraction

All LLM calls go through a single interface:

```typescript
export interface LLMProvider {
  generateResponse(prompt: string): Promise<string>;
}
```

Two implementations are included:

| Provider | Description |
|----------|-------------|
| `OpenRouterProvider` | Production — routes to `openai/gpt-4.1-mini` via OpenRouter |
| `MockLLMProvider` | Local testing — returns the prompt string without any API call |

To switch providers, replace the constructor argument in `ai/src/index.ts`:

```typescript
// Production
const llmProvider = new OpenRouterProvider(apiKey);

// Local / offline testing
const llmProvider = new MockLLMProvider();
```

---

## Roadmap

Planned AI modules based on the platform vision:

| Module | Status |
|--------|--------|
| AI Test Case Generation | Done |
| AI Test Data Generation | Done |
| AI Playwright Action Generation | Done |
| AI Assertion Generation | Done |
| AI Locator Healing | Done |
| AI Flaky Test Analysis | Done |
| AI Bug Root Cause Analysis | Done |
| AI Regression Optimization | Done |
| AI Coverage Analysis | Planned |
| Natural Language to Automation | Planned |
