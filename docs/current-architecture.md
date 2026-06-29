# AI Test Intelligence Platform — Current Architecture

## Overview

A modular, AI-powered Playwright test automation framework. The only manual step is writing requirements in Excel. Everything else — KB generation, POM generation, test case expansion, spec generation, test execution, and reporting — runs automatically through a single command.

- **104 unit tests passing** (Vitest)
- **5 LLM providers** supported (Gemini, GitHub Models, OpenRouter, LM Studio, Fallback)
- **10 AI modules** across generation and analysis
- **Smart caching** — unchanged requirements skip all LLM calls

---

## 4-Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1 — LLM Providers                                      │
│  GeminiProvider · GitHubModelsProvider · OpenRouterProvider   │
│  LMStudioProvider · FallbackProvider · CachingLLMProvider     │
│  Single interface: generateResponse(prompt): Promise<string>  │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  Layer 2 — Knowledge Base                                      │
│  KnowledgeBaseGenerator  →  pipeline/kb/pages/{page}.json     │
│  KnowledgeBaseService    →  loads KB for any module           │
│  PageAnalyzer + ScenarioInferenceEngine  →  live discovery    │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  Layer 3 — AI Modules                                          │
│  GENERATORS: TestCaseGenerator · TestDataGenerator            │
│              AIActionModelGenerator · AssertionGenerator       │
│              RequirementExpander · POMGenerator                │
│  ANALYZERS:  BugRootCauseAnalyzer · FlakyTestAnalyzer         │
│              CoverageAnalyzer · RegressionSelector            │
│              SelfHealingLocatorEngine                         │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  Layer 4 — Automation & Code Generation                        │
│  PlaywrightGenerator · PlaywrightRenderer                     │
│  DataFileGenerator · FixtureUpdater                           │
│  Output: tests/e2e/*.spec.ts · tests/pages/*.ts               │
└──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
playwright-ai-poc/
├── pipeline/                              # All AI engine code
│   ├── providers/
│   │   ├── interfaces/LLMProvider.ts      # generateResponse(prompt): Promise<string>
│   │   ├── GeminiProvider.ts
│   │   ├── GitHubModelsProvider.ts
│   │   ├── OpenRouterProvider.ts
│   │   ├── LMStudioProvider.ts
│   │   ├── FallbackProvider.ts            # Circuit breaker (5 failures → auto-switch)
│   │   ├── CachingLLMProvider.ts          # SHA-256 disk cache → .llm-cache/
│   │   └── ProviderFactory.ts
│   ├── kb/
│   │   ├── KnowledgeBaseService.ts        # Reads pipeline/kb/pages/
│   │   ├── KnowledgeBaseGenerator.ts      # Live URL → DOM → AI → JSON
│   │   └── pages/                         # Project KB files (deleted on reset)
│   ├── generators/
│   │   ├── test-cases/TestCaseGenerator.ts
│   │   ├── test-data/TestDataGenerator.ts
│   │   ├── action-model/AIActionModelGenerator.ts
│   │   ├── assertions/AssertionGenerator.ts
│   │   ├── playwright/PlaywrightGenerator.ts + PlaywrightRenderer.ts
│   │   ├── pom/POMGenerator.ts + DataFileGenerator.ts + FixtureUpdater.ts
│   │   ├── requirements/RequirementGenerator.ts
│   │   └── discovery/PageAnalyzer.ts + ScenarioInferenceEngine.ts
│   ├── analyzers/
│   │   ├── self-healing/SelfHealingLocatorEngine.ts
│   │   ├── root-cause/BugRootCauseAnalyzer.ts
│   │   ├── flaky/FlakyTestAnalyzer.ts
│   │   ├── coverage/CoverageAnalyzer.ts
│   │   └── regression/RegressionSelector.ts
│   ├── readers/ExcelReader.ts + RequirementExpander.ts
│   ├── reporting/RunContext.ts
│   ├── utils/AIJsonParser.ts + ArtifactManifest.ts + ExcelTestCaseWriter.ts
│   └── models/TestCase.ts + KnowledgeBase.ts
│
├── scripts/
│   ├── run-pipeline.ts                    # npm run ai:run
│   ├── generate-from-excel.ts             # npm run generate:from-excel
│   ├── generate-kb.ts                     # npm run kb:generate
│   ├── generate-pom.ts                    # npm run generate:pom
│   ├── generate-all.ts                    # npm run generate:all
│   ├── project-reset.ts                   # npm run project:reset
│   ├── demo.ts                            # npm run demo (ParaBank, 9 scenarios)
│   ├── demo-*.ts                          # individual demo scripts
│   ├── create-requirements-template.ts
│   └── test-*.ts
│
├── tests/
│   ├── e2e/                               # Generated specs + .data.ts files
│   ├── pages/                             # Generated POMs
│   ├── data/                              # Generated data files + example.ts
│   ├── fixtures/base.ts                   # Framework: testDesktop + testMobile
│   └── helpers/
│       ├── constants.ts                   # Framework: viewport sizes
│       ├── waitUtils.ts                   # Framework: generic wait utilities
│       ├── interceptHelper.ts             # Project-specific (deleted on reset)
│       └── commonPattern.ts              # Project-specific (deleted on reset)
│
├── config/
│   ├── platform.json                      # projectName, suites[], llmModel
│   └── environments/                      # qa.env · uat.env · production.env · development.env
│
├── requirements/                          # requirements.xlsx — the only manual input
├── reports/                               # Timestamped run folders + latest/ symlink
├── ai-metadata/artifacts.json             # Content hash manifest (git-tracked)
├── .llm-cache/                            # Raw LLM response cache (gitignored)
└── docs/
```

---

## AI Modules

### Generators

| Module | Input | Output |
|--------|-------|--------|
| `TestCaseGenerator` | Requirement text | `TestCase[]` with id, title, steps, expectedResult |
| `TestDataGenerator` | Requirement text | Typed test data (validUsername, validPassword, …) |
| `AIActionModelGenerator` | TestCase + KnowledgeBase | Structured action model per step |
| `AssertionGenerator` | TestCase + KnowledgeBase | Playwright assertion code |
| `RequirementExpander` | Excel row (blank TestCases) | Expanded `TestCase[]` written back to Excel |
| `POMGenerator` | KnowledgeBase | TypeScript Page Object Model class |
| `DataFileGenerator` | KnowledgeBase | TypeScript data file for the page |
| `RequirementGenerator` | KnowledgeBase | Auto-generated requirement string |

### Analyzers

| Module | Input | Output |
|--------|-------|--------|
| `BugRootCauseAnalyzer` | Failure message + stack trace + logs | failureType, probableCause, recommendation, confidence% |
| `FlakyTestAnalyzer` | Test name + retryCount + duration + failureMessage | flakyProbability%, possibleCauses[], recommendation |
| `CoverageAnalyzer` | Requirements list + existing test files | coveragePercentage%, covered[], missingCoverage[] |
| `RegressionSelector` | Changed file paths | impactedFeatures[], recommendedTests[], reasoning |
| `SelfHealingLocatorEngine` | Broken selector + KnowledgeBase | healedLocator, confidence%, reasoning |

### Discovery

| Module | Role |
|--------|------|
| `PageAnalyzer` | Opens live URL headless, extracts DOM context |
| `ScenarioInferenceEngine` | Infers untested scenarios from page context — supplements Excel requirements |

---

## generate-from-excel Pipeline

`npm run generate:from-excel` (called internally by `npm run ai:run`)

```
requirements.xlsx
       │
       ▼ Step 1 — ExcelReader
   Requirements[]
       │
       ▼ Step 2 — KnowledgeBaseGenerator
   pipeline/kb/pages/{page}.json  (auto-generated from URL column if missing)
       │
       ▼ Step 2.5 — PageAnalyzer + ScenarioInferenceEngine
   Additional scenarios discovered from live pages
   Cached to pipeline/kb/pages/{page}-scenarios.json
       │
       ▼ Step 3 — POMGenerator + DataFileGenerator
   tests/pages/{Page}.ts
   tests/data/{page}.data.ts
       │
       ▼ Step 4 — RequirementExpander
   TestCase[] per requirement (written back to Excel Sheet 2)
       │
       ▼ Step 5 — PlaywrightGenerator
   tests/e2e/{page}-excel-{n}.spec.ts
```

---

## LLM Providers

| Provider | Env var | Notes |
|----------|---------|-------|
| `GeminiProvider` | `LLM_PROVIDER=gemini` | Default. Requires `GOOGLE_API_KEY` |
| `GitHubModelsProvider` | `LLM_PROVIDER=github-models` | Requires `GITHUB_TOKEN` |
| `OpenRouterProvider` | `LLM_PROVIDER=openrouter` | Requires `OPENROUTER_API_KEY` |
| `LMStudioProvider` | `LLM_PROVIDER=lm-studio` | Local models, no key needed |
| `FallbackProvider` | `LLM_PROVIDER=fallback` | Circuit breaker: 5 failures → auto-switch to next provider in chain |

**`CachingLLMProvider`** wraps every provider transparently:
- Key: `SHA-256("v1" + prompt)` → `.llm-cache/{hash}.json`
- Cache hit: returns stored response with zero LLM calls
- Cleared by `npm run project:reset` or `npm run cache:clear`

---

## Smart Caching (ArtifactManifest)

`ai-metadata/artifacts.json` is a git-tracked manifest that prevents redundant LLM calls across runs:

| Change detected | Action taken |
|-----------------|-------------|
| Requirement content unchanged | Return cached TestCase[] — zero LLM calls |
| Requirement content changed | Re-expand with LLM |
| URL in Excel changed for a page | Regenerate KB JSON |
| KB file hash changed | Regenerate POM |
| Spec content hash unchanged | Skip spec generation |

The `.llm-cache/` directory is a separate raw-response cache (gitignored). Both are cleared on `npm run project:reset`.

---

## AIJsonParser — 3-Pass Repair

All AI modules parse LLM output through `AIJsonParser.parse<T>()`:

1. **Pass 1** — Native `JSON.parse()` (instant, no cost)
2. **Pass 2** — `jsonrepair` library (handles trailing commas, unquoted keys)
3. **Pass 3** — Truncation recovery (finds last complete JSON object/array)

This ensures robust parsing even when the LLM wraps output in markdown or truncates it.

---

## project:reset Behaviour

`npm run project:reset` prepares the framework for a new target application.

**Deleted (project artifacts):**
- `tests/e2e/*.spec.ts` and `*.data.ts`
- `tests/pages/*.ts` (generated POMs)
- `tests/data/*.data.ts` (generated data files)
- `tests/helpers/interceptHelper.ts` and `commonPattern.ts`
- `pipeline/kb/pages/*.json` (KB files and scenario cache)
- `ai-metadata/artifacts.json`
- `reports/`, `.llm-cache/`, `playwright-report/`, `test-results/`

**Reset:**
- `config/platform.json` → blank template with empty `suites[]`

**Preserved (framework):**
- `pipeline/` — all AI modules
- `scripts/` — all pipeline scripts
- `tests/fixtures/base.ts` — `testDesktop` / `testMobile`
- `tests/helpers/constants.ts` and `waitUtils.ts`
- `tests/data/example.ts` — data file template
- `requirements/*.xlsx` — Excel input files
- `.env` — API keys

---

## Key npm Commands

| Command | Purpose |
|---------|---------|
| `npm run ai:run` | Full pipeline: Excel → specs → run tests → Allure report |
| `npm run ai:run:qa` / `ai:run:uat` | Environment-specific full pipeline |
| `npm run generate:from-excel` | Generation only (no test execution) |
| `npm run kb:generate <url> <name>` | Generate KB JSON from a live URL |
| `npm run generate:pom` | Generate POMs from existing KB files |
| `npm run generate:all` | Platform.json-driven suite generation |
| `npm run project:reset` | Wipe all project artifacts; ready for new project |
| `npm run requirements:template` | Create blank Excel requirements file |
| `npm run demo` | Run ParaBank 9-scenario live demo |
| `npm run test:qa` / `test:uat` / `test:prod` | Env-specific Playwright test run |
| `npm run report:latest` | Open latest Playwright HTML report |
| `npm run allure:serve` | Open Allure report |
| `npm run cache:clear` | Clear LLM response cache only |
| `npm run typecheck` | TypeScript compile check |
| `npm run test:unit` | Run 104 unit tests (Vitest) |

---

## Architecture Principles

**Separation of concerns** — Each module has one job. `TestCaseGenerator` only generates test cases; it has no knowledge of Playwright or selectors.

**Provider independence** — Every module depends on `LLMProvider` (the interface), not a vendor SDK. Swapping providers requires changing one env var.

**Knowledge-constrained AI** — Selectors, messages, and success states come from KB JSON files, not AI imagination. AI cannot invent selectors that don't exist on the page.

**Validated output** — All AI output goes through `AIJsonParser` (3-pass repair) and model-specific validation before use.

**Zero manual intervention** — After filling the Excel file, the entire pipeline runs unattended. The only exception is writing project-specific helpers (`interceptHelper.ts`, `commonPattern.ts`) for a new target app.
