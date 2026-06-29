# Framework Structure Reference

A complete, per-folder guide to this codebase. Every directory has a clear owner, a reason to exist, and a real-world example of how it is used.

---

## Repository Layout

```
playwright-ai-poc/
│
├── pipeline/                # All AI generation logic — the "brain"
│   ├── models/              # Shared data-transfer types
│   ├── providers/           # LLM integrations + factory
│   │   └── interfaces/      # LLMProvider interface
│   ├── kb/                  # Knowledge-base services
│   │   └── pages/           # JSON page definitions (selectors, URLs, messages)
│   ├── generators/          # Modules that produce TypeScript/test artefacts
│   │   ├── test-cases/      # Requirement → TestCase[]
│   │   ├── test-data/       # Requirement → TestData
│   │   ├── action-model/    # Step → ActionModel (rule-based + AI)
│   │   ├── assertions/      # Expected result → Playwright assertion
│   │   ├── playwright/      # ActionModel → .spec.ts file string
│   │   ├── pom/             # KB → Page Object Model + data file + fixture update
│   │   ├── requirements/    # Natural-language → formal requirement list
│   │   └── discovery/       # Live URL → page structure + inferred scenarios
│   ├── orchestrator/        # Multi-generator coordination
│   ├── analyzers/           # AI post-run analysis modules
│   │   ├── flaky/           # Flaky-test detection
│   │   ├── root-cause/      # CI failure root-cause analysis
│   │   ├── coverage/        # Coverage-gap detection
│   │   ├── regression/      # Smart test-selection from changed file paths
│   │   └── self-healing/    # Broken-locator repair
│   ├── execution/           # Pipeline orchestration + result collection
│   ├── reporting/           # Run context tracking, Allure integration
│   ├── readers/             # Excel + requirement ingestion
│   └── utils/               # Shared low-level helpers
│
├── tests/                   # All Playwright test code — the "body"
│   ├── e2e/                 # Generated + maintained spec files
│   ├── fixtures/            # testDesktop / testMobile fixture factory
│   ├── pages/               # Page Object Models
│   ├── helpers/             # Shared helpers and utilities
│   └── data/                # Static test data interfaces
│
├── scripts/                 # CLI entry points — the "hands"
│
├── config/                  # Static configuration
│   ├── platform.json        # Suite definitions for generate:all
│   └── environments/        # Per-environment .env files
│
├── requirements/            # Input artefacts
│   └── requirements.xlsx    # Excel requirements file
│
├── docs/                    # Human-readable documentation
│
└── reports/                 # Test output (gitignored)
```

---

## `pipeline/` — The AI Generation Core

### `pipeline/models/`

| | |
|---|---|
| **Purpose** | Shared TypeScript interfaces used as data-transfer objects across the pipeline |
| **Why it exists** | Single source of truth for `TestCase`, `TestData`, and `KnowledgeBase` shapes — prevents divergence between generators that produce these objects and scripts that consume them |
| **Contains** | `KnowledgeBase.ts`, `TestCase.ts`, `TestData.ts` |
| **Used when** | Any generator, generator test, or script needs to work with test cases, test data, or page knowledge |
| **Who uses it** | All generators, all analyzer scripts, integration tests |
| **Example** | `TestCaseGenerator` returns `TestCase[]`; `PlaywrightGenerator` consumes `TestCase[]` — both import from `pipeline/models/TestCase.js` |

---

### `pipeline/providers/`

| | |
|---|---|
| **Purpose** | All LLM provider implementations and the factory that creates the correct one |
| **Why it exists** | Isolates provider-specific SDK calls behind a single `LLMProvider` interface, making it trivial to swap Gemini → GitHub Models → OpenRouter with a one-line env change |
| **Contains** | `GeminiProvider.ts`, `GitHubModelsProvider.ts`, `OpenRouterProvider.ts`, `LMStudioProvider.ts`, `MockLLMProvider.ts`, `CachingLLMProvider.ts`, `FallbackProvider.ts`, `ProviderFactory.ts` |
| **Used when** | Any module needs to call an LLM |
| **Who uses it** | All generators, all analyzers, all demo and pipeline entry-point scripts |
| **Example** | `ProviderFactory.create()` reads `LLM_PROVIDER=gemini` and returns a `GeminiProvider` wrapped in `CachingLLMProvider` |

### `pipeline/providers/interfaces/`

| | |
|---|---|
| **Purpose** | The `LLMProvider` contract |
| **Contains** | `LLMProvider.ts` — a single-method interface: `generateResponse(prompt: string): Promise<string>` |
| **Example** | `MockLLMProvider` implements this for unit tests; `GeminiProvider` implements it for production |

---

### `pipeline/kb/`

| | |
|---|---|
| **Purpose** | Everything that reads, generates, or retrieves page knowledge |
| **Why it exists** | Keeps page-specific metadata (selectors, URLs, messages) separate from test code and LLM logic — the KB is the framework's "map" of the application under test |
| **Contains** | `KnowledgeBaseService.ts` (load a KB by name), `KnowledgeBaseGenerator.ts` (crawl a URL and write a KB JSON), `TestCatalogService.ts` (list available test suites), `SelectorRetriever.ts` (keyword-based RAG retrieval), `SelectorRetriever.test.ts` |
| **Used when** | Any generator needs selector information; the KB generator command is run to onboard a new page |
| **Who uses it** | `POMGenerator`, `PlaywrightGenerator`, `AssertionGenerator`, `TestCaseGenerator`, `SelfHealingLocatorEngine`, `RegressionSelector` |
| **Example** | `KnowledgeBaseService.load("ae-home")` reads `pipeline/kb/pages/ae-home.json` and returns a typed `KnowledgeBase` object |

### `pipeline/kb/pages/`

| | |
|---|---|
| **Purpose** | JSON page definitions — the only place selectors and application metadata live |
| **Why it exists** | Decouples selector knowledge from code; the same JSON drives POM generation, assertion generation, and test case generation |
| **Contains** | One `<page-name>.json` per page (auto-generated by `npm run kb:generate`); scenario cache files (`<page-name>-scenarios.json`); `test-catalog.json` (registry of available suites) |
| **Modified when** | A new page is added (`npm run kb:generate`); an existing page's selectors change; messages or notes need updating |
| **Who modifies it** | QA engineers onboarding a new app; developers when page structure changes |
| **Example** | `ae-home.json` contains `"loginButton": "a[href='/login']"` — this exact string is used in the generated `AeHomePage.ts` and in AI prompts |

---

### `pipeline/generators/`

The generators directory contains one subdirectory per transformation step in the AI pipeline. Each subdirectory is a self-contained module: a TypeScript class plus optional `.test.ts` file.

#### `pipeline/generators/test-cases/`

| | |
|---|---|
| **Purpose** | Convert a plain-English requirement into 4–10 structured `TestCase` objects |
| **Contains** | `TestCaseGenerator.ts`, `TestCaseGenerator.test.ts` |
| **Output** | `TestCase[]` — each with `title`, `steps[]`, `expectedResult`, `tags`, `priority` |
| **Example** | Input: `"User logs in with valid credentials"` → Output: `[{title: "Login with valid email and password", steps: ["Navigate to /login", "Fill email field", ...]}, ...]` |

#### `pipeline/generators/test-data/`

| | |
|---|---|
| **Purpose** | Generate realistic test data (valid and invalid values) appropriate for the requirement |
| **Contains** | `TestDataGenerator.ts` |
| **Output** | `TestData` — `validEmail`, `invalidEmail`, `password`, `edgeCaseStrings[]`, etc. |

#### `pipeline/generators/action-model/`

| | |
|---|---|
| **Purpose** | Convert a natural-language test step into a structured `ActionModel` (action type + selector key + value) |
| **Contains** | `ActionModel.ts` (interface), `AIActionModelGenerator.ts` (LLM-based), `RuleBasedActionModelGenerator.ts` (regex patterns, no LLM), `RuleBasedActionModelGenerator.test.ts` |
| **Used when** | `PlaywrightGenerator` processes each test step into executable code |
| **Example** | Step `"Click the login button"` → `{action: "click", selectorKey: "loginButton"}` |

#### `pipeline/generators/assertions/`

| | |
|---|---|
| **Purpose** | Convert an expected result string into an executable Playwright assertion |
| **Contains** | `AssertionGenerator.ts` |
| **Example** | `"User should see the dashboard"` → `await expect(page).toHaveURL('/dashboard')` |

#### `pipeline/generators/playwright/`

| | |
|---|---|
| **Purpose** | Orchestrate all generators to produce a complete `.spec.ts` file string |
| **Contains** | `PlaywrightGenerator.ts` (orchestrator), `PlaywrightRenderer.ts` (ActionModel → code string using POM method registry) |
| **Output** | A string of valid TypeScript — the `.spec.ts` file |
| **Example** | Given a `TestCase[]`, KB, and `PomOptions`, `PlaywrightGenerator.generate()` emits `import { testDesktop } from ...` + `testDesktop.describe(...)` blocks |

#### `pipeline/generators/pom/`

| | |
|---|---|
| **Purpose** | Generate Page Object Models, companion data files, and update the base fixture |
| **Contains** | `POMGenerator.ts`, `DataFileGenerator.ts`, `FixtureUpdater.ts` |
| **Output** | `tests/pages/MyPage.ts`, `tests/data/my-page.data.ts`, updated `tests/fixtures/base.ts` |
| **Modified when** | A new page is added to the KB; `npm run generate:pom` is run |

#### `pipeline/generators/requirements/`

| | |
|---|---|
| **Purpose** | Convert natural-language feature descriptions into formal requirement lists |
| **Contains** | `RequirementGenerator.ts` |

#### `pipeline/generators/discovery/`

| | |
|---|---|
| **Purpose** | Crawl a live URL and infer what test scenarios exist — feeds the KB generator |
| **Contains** | `PageAnalyzer.ts`, `ScenarioInferenceEngine.ts` |

### `pipeline/orchestrator/`

| | |
|---|---|
| **Purpose** | Coordinate all generators into a single high-level pipeline run |
| **Contains** | `TestIntelligenceOrchestrator.ts`, `TestGenerationResult.ts` |

---

### `pipeline/analyzers/`

Each analyzer subdirectory is a standalone AI analysis module — receives structured input, calls the LLM, returns a typed result. None of them write files; they return objects for the caller to act on.

#### `pipeline/analyzers/flaky/`
Detects flaky tests from retry history. Returns a flakiness score and recommended fix.

#### `pipeline/analyzers/root-cause/`
Classifies CI failures. Returns failure category, root cause, impacted component, and confidence.

#### `pipeline/analyzers/coverage/`
Identifies coverage gaps in a requirement set. Returns untested scenarios.

#### `pipeline/analyzers/regression/`
Given a list of changed file paths, returns which test suites should run. Filters LLM output against `test-catalog.json` to prevent hallucinated suite names.

#### `pipeline/analyzers/self-healing/`
Given a failed locator, returns a healed selector from the KB. Returns confidence score.

---

### `pipeline/execution/`

| | |
|---|---|
| **Purpose** | Run generated specs, collect results, and trigger post-run analysis |
| **Contains** | `PipelineRunner.ts` (top-level), `ExecutionEngine.ts` (Playwright subprocess), `ResultCollectionEngine.ts`, `TestResultStore.ts` |
| **Used when** | `npm run ai:run` reaches the test-execution phase |

---

### `pipeline/reporting/`

| | |
|---|---|
| **Purpose** | Track run metadata (run ID, environment, output paths) and integrate with Allure |
| **Contains** | `RunContext.ts`, `ReportingService.ts` |
| **Used by** | `playwright.config.ts` (reads run context), `scripts/run-pipeline.ts` (creates run context), `scripts/generate-all.ts` |

---

### `pipeline/readers/`

| | |
|---|---|
| **Purpose** | Ingest external requirements into typed objects the pipeline can process |
| **Contains** | `ExcelReader.ts` (parse `.xlsx` files into requirement rows), `RequirementExpander.ts` (AI-expand terse requirement rows) |
| **Used by** | `scripts/generate-from-excel.ts`, `scripts/run-pipeline.ts` |

---

### `pipeline/utils/`

| | |
|---|---|
| **Purpose** | Low-level shared utilities used across multiple pipeline modules |
| **Contains** | `AIJsonParser.ts` (strip markdown fences, parse typed JSON), `AIJsonParser.test.ts`, `ArtifactManifest.ts`, `ExcelTestCaseWriter.ts`, `concurrency.ts` |
| **Example** | Every generator calls `AIJsonParser.parse<T>(llmResponse)` to safely extract JSON from LLM output that may include ` ```json ``` ` fences |

---

## `tests/` — The Playwright Test Layer

### `tests/fixtures/`

| | |
|---|---|
| **Purpose** | Extend Playwright's `test` with custom fixtures that handle navigation and viewport |
| **Contains** | `base.ts` — exports `testDesktop` and `testMobile`, each pre-configured with the correct viewport and auto-navigating to `BASE_URL` |
| **Modified when** | A new page is added and needs a fixture entry (`aeLoginPage: async ({page}, use) => { ... }`) |
| **Who modifies it** | Framework developers adding new pages |
| **Example** | A spec file imports `{ testDesktop }` instead of `{ test }` — `testDesktop` guarantees the page is at `BASE_URL` before each test |

---

### `tests/pages/`

| | |
|---|---|
| **Purpose** | Page Object Models — typed wrappers around selectors with behavior methods |
| **Why it exists** | Isolates raw selectors from test logic; if a locator changes, only the POM needs updating |
| **Contains** | `AeHomePage.ts`, `AeLoginPage.ts` |
| **Conventions** | `export default class`, `private readonly` locators, `constructor(page: Page)`, public behavior/assertion methods |
| **Modified when** | `npm run generate:pom` auto-generates a new POM; engineers enrich it with helper methods |
| **Who modifies it** | QA engineers and the AI pipeline |
| **Example** | `aeHomePage.clickLoginButton()` calls `this.loginLink.click()` — the spec never references a raw selector |

---

### `tests/helpers/`

| | |
|---|---|
| **Purpose** | Reusable test helpers that are not page-specific |
| **Contains** | `constants.ts` (`DESKTOP_VIEW_PORT`, `MOBILE_VIEW_PORT`), `waitUtils.ts` (generic wait helpers), `interceptHelper.ts` (project-specific login/logout flows — deleted on `npm run project:reset`), `commonPattern.ts` (project-specific nav pattern class — deleted on `npm run project:reset`) |
| **Modified when** | A helper pattern is identified across multiple specs |
| **Who uses it** | Spec files and page fixtures |

---

### `tests/data/`

| | |
|---|---|
| **Purpose** | Static test data and data interfaces |
| **Contains** | `example.ts` (template showing the data interface pattern) |
| **Convention** | Each page gets its own data file (e.g. `ae-home.data.ts`) — lives in `tests/e2e/` alongside its spec |

---

### `tests/e2e/`

| | |
|---|---|
| **Purpose** | The actual Playwright spec files |
| **Contains** | `ae-home-excel-{1,2,3,4}.spec.ts` (AI-generated), `ae-home-mobile.spec.ts`, `ae-home.data.ts` (data co-located with its spec) |
| **Tags** | `@smoke` — run in CI on every push; `@regression` — full suite; `@mobile` — mobile viewport |
| **Modified when** | The AI pipeline generates new specs; engineers review and add `@smoke`/`@regression` tags |
| **Do NOT edit** | The generated spec header (ticket IDs, describe name) — regenerating will overwrite it |

---

## `scripts/` — CLI Entry Points

All scripts are invoked by `npm run` commands. They wire together pipeline modules — they do not contain business logic themselves.

| Script | npm command | Purpose |
|---|---|---|
| `run-pipeline.ts` | `npm run ai:run` | Full pipeline: parse Excel → generate → execute → report |
| `generate-from-excel.ts` | `npm run generate:from-excel` | Steps 1–4 of ai:run (generate only, no test execution) |
| `generate-all.ts` | `npm run generate:all` | Generate specs for all pages defined in `config/platform.json` |
| `generate.ts` | `npm run generate` | Single-suite generation entry point (older; prefer `generate:from-excel` for pipeline use) |
| `generate-pom.ts` | `npm run generate:pom` | Generate POM for all KB pages that don't yet have one |
| `generate-kb.ts` | `npm run kb:generate` | Crawl a live URL and write a KB JSON |
| `create-requirements-template.ts` | `npm run requirements:template` | Create a blank requirements.xlsx |
| `demo.ts` | `npm run demo` | Full multi-scenario live demo |
| `demo-flaky.ts` | `npm run demo:flaky` | Standalone flaky-test demo |
| `demo-rootcause.ts` | `npm run demo:rootcause` | Standalone root-cause demo |
| `demo-healing.ts` | `npm run demo:healing` | Standalone self-healing locator demo |
| `demo-coverage.ts` | `npm run demo:coverage` | Standalone coverage gap demo |
| `demo-regression.ts` | `npm run demo:regression` | Standalone regression selector demo |
| `project-reset.ts` | `npm run project:reset` | Delete generated artefacts for a clean re-run |
| `test-github-models.ts` | `npm run test:github-models` | Test GitHub Models provider directly |
| `test-provider-switching.ts` | `npm run test:provider-switching` | Test provider failover chain |

---

## `config/`

| | |
|---|---|
| **Purpose** | Static configuration files that change per-environment or per-project |
| **Contains** | `platform.json` (suite definitions), `environments/` (per-env `.env` files) |
| **`platform.json`** | Defines which pages the `generate:all` command processes. Each entry: `{name, page, outputFile}` where `page` matches a filename in `pipeline/kb/pages/` |
| **Modified when** | Adding a new suite; changing the default environment; updating `llmModel` |

---

## `requirements/`

| | |
|---|---|
| **Purpose** | Input artefacts — the Excel file containing requirements that drive test generation |
| **Contains** | `requirements.xlsx` |
| **Columns** | `Page`, `Feature`, `Scenario`, `Description` (the richest column — write it as a user story) |
| **Modified when** | Adding new scenarios to test; onboarding a new page |
| **Who modifies it** | QA engineers and BAs |

---

## `docs/`

| File | Purpose |
|---|---|
| `GETTING-STARTED.md` | First-time setup: clone → configure → first run in 10 minutes |
| `COMMANDS.md` | Every npm script with flags and examples |
| `ONBOARDING.md` | How to add a new target application (KB → POM → fixture → requirements → pipeline) |
| `FRAMEWORK_STRUCTURE.md` | ← This file |
| `CONTRIBUTING.md` | How to add providers, extend generators |
| `DEMO_PITCH.md` | 2-min pitch deck + 5-min live demo script |
| `SHOWCASE.md` | Feature showcase with screenshots and output examples |
| `WALKTHROUGH.md` | Step-by-step pipeline walkthrough with generated file examples |
| `INTERVIEW_QA.md` | Q&A reference for technical interviews and code reviews |
| `current-architecture.md` | Current module inventory, folder structure, and data flow |
| `ai-architecture-evaluation.md` | MCP / Agents / RAG evaluation with phased roadmap |
| `self-healing-locator-design.md` | SelfHealingLocatorEngine algorithm and integration pattern |
| `architecture.md` | High-level architecture overview |

---

## Where to put new things

| What you're adding | Where it goes |
|---|---|
| New target application | 1. `pipeline/kb/pages/<page>.json` via `npm run kb:generate` |
| New LLM provider | `pipeline/providers/<YourProvider>.ts` + register in `pipeline/providers/ProviderFactory.ts` |
| New test page POM | `tests/pages/<PageName>.ts` via `npm run generate:pom` |
| New fixture | `tests/fixtures/base.ts` — extend `testDesktop` / `testMobile` |
| New shared helper | `tests/helpers/<helper-name>.ts` |
| New spec file | `tests/e2e/<page-name>.spec.ts` — via pipeline or hand-written |
| New AI generator | `pipeline/generators/<category>/<GeneratorName>.ts` |
| New analyzer | `pipeline/analyzers/<category>/<AnalyzerName>.ts` |
| New pipeline entry point | `scripts/<script-name>.ts` + add entry to `package.json` scripts |
| New KB page selectors | `pipeline/kb/pages/<page>.json` |
| Generated test output | `tests/e2e/` (specs) and `tests/pages/` (POMs) — both gitignored after generation |
| Reports | `reports/` — fully gitignored |

---

## Folders you should NOT edit manually

| Folder | Reason |
|---|---|
| `tests/e2e/*.spec.ts` (generated ones) | Regenerated by the pipeline — manual edits will be overwritten |
| `tests/pages/*.ts` (generated ones) | Same — enrich via POM methods only |
| `.llm-cache/` | Managed by `CachingLLMProvider` — run `npm run cache:clear` to reset |
| `reports/` | Test runner output — use `npm run report:latest` to view |
| `node_modules/` | `npm install` only |
