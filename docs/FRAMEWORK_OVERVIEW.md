# Framework Overview — Developer KT Guide

> Open this file, start from the top, and just talk. This is written the way you would explain it in a real KT session — not like documentation.

---

## Let me start with the problem we are solving

So before I show you any folder or any file, let me tell you why we built this. Because once you understand the pain points, every piece of this framework will make sense immediately.

Think about what happens when a developer finishes a new feature and hands it over to QA. What does the QA engineer actually have to do? They have to sit down and think through every possible scenario — happy path, wrong input, empty fields, edge cases. That is just the thinking part. Then they have to write those scenarios into test cases. Then for every single test case, they have to write the Playwright code — navigate here, fill this, click that, assert this. Then they have to come up with realistic test data. And then six months later a developer renames a button, and now 15 tests are broken, and someone is spending half a day hunting down selectors.

That whole cycle — from requirement to running test — takes hours per feature. Multiply that across a product. QA becomes the bottleneck.

So this framework is the answer to that. The idea is simple: you give it a plain English requirement, and it generates test cases, test data, Page Object Models, and a complete ready-to-run Playwright spec file. Automatically. Using AI.

And then after your tests run, it has five more AI modules that analyze results — they can find broken selectors and fix them, explain failures in plain English, detect flaky tests, identify gaps in your coverage, and tell you which tests to run when specific files change.

---

## The one principle that runs through everything

Before I show you any code, let me tell you the one idea that is behind every design decision here.

The AI is never trusted blindly.

Think about what happens if you just ask ChatGPT to write a Playwright test for a login page. It will invent selectors. It will write `page.fill('#email-input', ...)` because that sounds reasonable. But your actual selector might be `input[name='username']`. The AI is hallucinating.

So what we do instead is — we give the AI the truth before it answers. We have a Knowledge Base (JSON files with real selectors, real URLs, real error messages from your actual application). Every AI prompt that needs selector information gets that KB as context, and is told: use only what is in here. Do not invent anything.

And then after the AI responds, we validate. We check that the response is valid JSON. We check that required fields exist. We check that numeric values are in range. If the AI returns garbage, the code throws immediately. The AI must meet our contract — not the other way around.

That is the whole philosophy. Constrain the input, validate the output.

---

## The big picture — five layers

So here is how the whole thing is organized. Think of it like a factory with five floors:

```
┌──────────────────────────────────────────────────────────────┐
│  scripts/                ← This is what you actually run     │
├──────────────────────────────────────────────────────────────┤
│  pipeline/generators/    ← AI turns requirements into code   │
│  pipeline/analyzers/     ← AI analyzes test results          │
├──────────────────────────────────────────────────────────────┤
│  pipeline/kb/            ← Real app data lives here          │
├──────────────────────────────────────────────────────────────┤
│  pipeline/providers/     ← The only place that calls an LLM  │
└──────────────────────────────────────────────────────────────┘

                      output lands here ↓

┌──────────────────────────────────────────────────────────────┐
│  tests/UI/    support/pages/    reports/                     │
└──────────────────────────────────────────────────────────────┘
```

The bottom layer — `pipeline/providers/` — is just the connection to the AI. Nothing else in the codebase directly calls any AI SDK. Everything goes through here.

Above that is the Knowledge Base — the real data about your application. This is what prevents hallucination.

Above that are the generators and analyzers — the actual AI intelligence modules.

And at the top are the scripts — the CLI entry points that tie everything together when you run an `npm run` command.

The output lands in `tests/UI/` for spec files, `support/pages/` for Page Object Models, and `reports/` for everything related to test runs.

---

## Now let me walk you through each folder

### `pipeline/providers/` — the LLM layer

So this is the folder where we connect to AI models. Every LLM call in the entire framework — whether it is generating test cases, healing a locator, or analyzing a failure — goes through this one folder. No other folder directly touches an AI SDK.

The reason we designed it this way is that if you ever want to switch from Gemini to OpenRouter, or from OpenRouter to a local model running on LM Studio, you change one line in your `.env`. Nothing else in the project changes. Not a single generator. Not a single analyzer.

The contract is dead simple. There is one interface:

```typescript
// pipeline/providers/interfaces/LLMProvider.ts
export interface LLMProvider {
  generateResponse(prompt: string): Promise<string>;
}
```

One method. Takes a string, returns a string. Every generator and every analyzer depends on this interface — not on any specific AI company.

Now let me go through the actual files:

**`GeminiProvider.ts`** — connects to Google Gemini. You need `GOOGLE_API_KEY` in your `.env`.

**`GitHubModelsProvider.ts`** — uses GitHub's free AI tier. You need `GITHUB_TOKEN`. Good for demos if you have a GitHub account.

**`OpenRouterProvider.ts`** — this one is like a proxy. OpenRouter gives you access to GPT, Claude, Mistral, and dozens of other models through a single API key. The advantage is you are not locked to one model.

**`LMStudioProvider.ts`** — this one is interesting. If you have LM Studio running locally on your machine, this connects to it. No API key, no internet, no cost. Useful for fully offline work.

**`FallbackProvider.ts`** — so this is the smart one. You give it a chain of providers — say, `lm-studio, gemini, openrouter, github-models`. It tries the first one. If that provider fails or takes more than 30 seconds (we use `Promise.race` for the timeout), it automatically moves to the next one. So if your Gemini quota runs out halfway through a pipeline run, it silently switches to OpenRouter and carries on. No manual intervention, no `.env` changes mid-run.

**`CachingLLMProvider.ts`** — this wraps any other provider with a disk cache. When you call the LLM with a prompt, the cache saves the response to `.llm-cache/` keyed by a hash of the prompt. Next time you run the same prompt — instant response, zero API cost. This is exactly why demo commands that would normally take 12–18 minutes come back in 2–4 seconds. The cache is already warm.

**`ProviderFactory.ts`** — this is the entry point. You set `LLM_PROVIDER=gemini` in your `.env` and `ProviderFactory.create()` reads that and hands back the right provider, wrapped in the cache. This is the only file you ever interact with when configuring which AI to use.

```bash
# In your .env
LLM_PROVIDER=gemini       # or openrouter, github-models, lm-studio, fallback
LLM_CACHE=true            # set false to bypass cache
```

---

### `pipeline/kb/` — the Knowledge Base

Okay so now we come to the most important design decision in this framework.

Think of the Knowledge Base as the framework's "map" of your application. It is a collection of JSON files — one per page — that contains the real selectors, the real URLs, the real error messages. Not what an AI thinks they might be. What they actually are.

Let me show you what one of these files looks like. Open `pipeline/kb/pages/parabank-login-page.json`:

```json
{
  "pageName": "ParaBank Login Page",
  "pageKey": "parabank-login-page",
  "url": "https://parabank.parasoft.com/parabank/login.htm",
  "authRequired": false,
  "describeName": "Login",
  "selectors": {
    "usernameField": "input[name='username']",
    "passwordField": "input[name='password']",
    "loginButton": "input[type='submit'][value='Log In']"
  },
  "messages": {
    "invalidCredentials": "The username and password could not be verified."
  }
}
```

This file is the source of truth for the login page. The selectors here are the real CSS selectors from the live application. When a generator needs to create a POM, it reads from here. When a generator needs to create an assertion, it reads the `messages` from here. When a selector breaks, you fix it here — and everything downstream automatically picks up the correct value.

The big maintenance win: when a developer renames `#loginBtn` to `input[type='submit'][value='Log In']`, you update one line in this JSON. No POM changes, no spec changes. The POM was generated from this JSON, and the AI prompts read from this JSON. One change cascades correctly.

Now let me go through the files in this folder:

**`KnowledgeBaseService.ts`** — loads a KB by page name. `kbService.load("parabank-login-page")` reads the JSON and returns a typed object. Extremely simple, but every generator and every analyzer calls this.

**`KnowledgeBaseGenerator.ts`** — this is what runs when you do `npm run kb:generate`. It opens a live URL with Playwright, crawls the page structure, and uses AI to generate the KB JSON. So you do not have to manually write these JSON files — you run one command per page and it generates them. Then you review and fix any selectors it missed.

**`SelectorRetriever.ts`** — keyword-based search inside a KB. The self-healing engine uses this when it is trying to find a replacement for a broken locator.

**`TestCatalogService.ts`** — reads `pipeline/kb/pages/test-catalog.json` which is the list of all available test suite names. The Regression Selector uses this to constrain the AI — it can only recommend suites that actually exist in this catalog.

**`pipeline/kb/pages/`** is where all those JSON files live. Right now we have files for Login, Bill Pay, Register, and Transfer pages of ParaBank. When you onboard a new application, you generate new JSON files here.

---

### `pipeline/models/` — shared data types

So these are the TypeScript interfaces that define the "shape" of data flowing through the pipeline. Think of them as the shared language all modules speak.

- **`TestCase.ts`** — `{ id, title, steps[], expectedResult, preconditions[] }` — what a test case looks like
- **`TestData.ts`** — valid and invalid input values for a test scenario
- **`KnowledgeBase.ts`** — the shape of a KB JSON file

These come out of generators and go into renderers. Nobody creates them from scratch in business logic — they are always the output of one module and the input of the next.

---

### `pipeline/generators/` — where requirements become test code

So this folder is the heart of the generation pipeline. Think of it as an assembly line. There are multiple stations, and data flows through them one step at a time. Each subfolder is one station.

**`test-cases/TestCaseGenerator.ts`**  
This is the first station. You give it a plain-English requirement like `"User should be able to login with valid credentials"`. It sends a carefully engineered prompt to the LLM — with a "Senior QA Engineer" persona, explicit rules to generate positive, negative, validation, and edge case scenarios, and the exact JSON structure it expects back. It comes back with a `TestCase[]` — typically 5 to 10 test cases covering scenarios you might not have thought of manually.

**`test-data/TestDataGenerator.ts`**  
Takes the same requirement and generates realistic test data — valid username, invalid username, valid password, invalid password. Separate from test cases because it is a different concern and a different prompt.

**`action-model/AIActionModelGenerator.ts`**  
This is a clever one. Every test case has steps written in natural language like `"Click the login button"`. These need to become Playwright code. But Playwright code needs exact selectors and exact data references. The Action Model is the bridge.

It converts a natural language step into a structured object:
```typescript
// "Click the login button"  →  { action: "click", target: "loginButton" }
// "Enter valid username"    →  { action: "fill", target: "usernameField", dataKey: "validUsername" }
```

The prompt constrains the AI to only three allowed actions (`goto`, `fill`, `click`) and five allowed `dataKey` values. The AI literally cannot return something outside those lists. And there is also a `RuleBasedActionModelGenerator.ts` that handles common steps like "navigate to" using regex patterns — no LLM call needed at all.

**`assertions/AssertionGenerator.ts`**  
Every test case has an `expectedResult` written in plain English. This converts that into a single executable Playwright assertion line. It receives the full KB so it knows the real error messages and redirect URLs — no guessing.

**`playwright/PlaywrightGenerator.ts`**  
This is the main assembler. It takes test cases + the Knowledge Base, and coordinates all the other generators to produce a complete `.spec.ts` file. The output follows the enterprise pattern — both `testDesktop.describe` and `testMobile.describe` in one file, proper imports, `beforeEach` with navigation and POM initialization, test names in the format `TC-001 @regression : [PageName] Test Title`.

It uses `pMap` internally so multiple test cases are processed in parallel, which speeds up generation significantly.

**`pom/POMGenerator.ts`**  
Reads KB files and generates Page Object Model TypeScript class skeletons in `support/pages/`. The generated class has the locators as private properties and empty public method signatures. You then fill in the method bodies with the actual Playwright interactions. Also has `FixtureUpdater.ts` which keeps `support/fixtures/visitFixture.ts` in sync when new pages are added.

**`requirements/RequirementGenerator.ts`**  
Expands terse requirement rows into full formal requirement descriptions. Used when your Excel requirements are short bullet points that need more context before test generation.

**`discovery/`**  
`PageAnalyzer.ts` and `ScenarioInferenceEngine.ts` — these crawl a live URL and infer what test scenarios are possible. This feeds the KB generator so it knows what to include in the knowledge base.

---

### `pipeline/analyzers/` — the five post-run AI modules

So these run after your tests complete. They read the results and use AI to give you actionable insights. Each one is completely independent — you can run any of them in isolation.

**`self-healing/`**  
This is probably the most practical one for day-to-day work. When a test fails because a locator broke, `SelfHealingLocatorEngine.ts` reads the KB for that page, calls the LLM, and returns a healed selector with a confidence score.

The full healing pipeline when you run `npm run ai:heal`:
1. `FailureAnalyzer` reads `reports/<runId>/playwright/results.json` — this is the Playwright JSON output, not allure
2. `FailureClassifier` looks at each failure and says: is this a locator issue, a timeout, an assertion failure, or a network error?
3. For locator failures, `POMIdentifier` figures out which POM file contains the broken selector
4. `SelfHealingLocatorEngine` calls the LLM with the KB and gets back a healed selector
5. `POMUpdater` patches the POM file directly
6. `HealingCache` saves the solution so if the same locator breaks again, it heals instantly without another LLM call
7. `HealingReporter` generates an HTML report showing what was healed

**`root-cause/`**  
When tests fail, someone has to read the stack trace and figure out why. This module does that for you. `BugRootCauseAnalyzer.ts` reads each failure and returns: failure type, probable cause, impacted component, specific recommendation, and a confidence score. Confidence is validated to be between 0 and 100 — if the AI returns 150 or leaves out the recommendation, the code throws immediately.

**`flaky/`**  
`FlakyTestAnalyzer.ts` looks at retry history from allure-results. A test that fails sometimes but passes on retry is flaky. This module gives you a flakiness probability score, the probable causes (usually timing issues or environment instability), and a specific recommendation for what to fix.

**`coverage/`**  
`CoverageGapAnalyzer.ts` compares your requirements list against your existing tests and tells you what is not covered. You feed it requirements and test names, it comes back with coverage percentage and exactly which requirements have no tests.

**`regression/`**  
`RegressionSelector.ts` solves the CI waste problem. Every PR triggers the full test suite. If your suite takes 45 minutes, every PR waits 45 minutes. This module takes the list of changed files from a PR and returns only the test suites that actually need to run. Important: after the AI responds, we filter its recommendations against `test-catalog.json` in code. If the AI hallucinates a suite name that does not exist, it gets silently removed. The AI is constrained by reality, even in post-processing.

---

### `pipeline/utils/` — small but important

**`AIJsonParser.ts`** — strips markdown code fences from LLM responses before `JSON.parse()`. Every AI module uses this. The reason it exists: LLMs very often respond with JSON wrapped in triple-backtick code blocks. If you call `JSON.parse()` directly on that, it throws. This parser strips the fences first.

**`concurrency.ts`** — `pMap(items, fn, concurrency)` — runs async functions in parallel with a cap on how many run at once. `PlaywrightGenerator` uses this so test cases are processed in parallel without spawning a hundred simultaneous LLM calls.

---

### `pipeline/reporting/RunContext.ts` — this file is more important than it looks

Every time you run tests, we create a unique timestamped run ID — something like `2026-06-29_14-30-00`. All output for that run goes into `reports/<runId>/`. The Playwright reports, the Allure results, the AI analysis reports — all organized under that one folder.

This file manages that whole lifecycle:
- `createRunContext()` — creates a fresh timestamped folder, writes the run ID to `reports/.current-run-id`, creates a `reports/latest/` symlink pointing to this run, and cleans up old runs
- `resolveRunContext()` — called by `playwright.config.ts` to figure out which run folder to use. It looks for `REPORT_RUN_ID` env var first, then the `.current-run-id` file (if it was written within the last 2 hours), then creates a new one

The path is anchored to the project root using `import.meta.url`. This matters because if you run commands from different directories, `reports/` still always lands inside the project, not wherever your shell happens to be sitting.

---

### `scripts/` — what you actually run

So these are the entry points for every `npm run` command. They are thin wires — they do not contain AI logic or business logic. They set up providers, wire together modules, and call into the pipeline.

Here is the complete map:

| Command | What it does |
|---|---|
| `npm run kb:generate` | Crawl a URL → generate KB JSON in `pipeline/kb/pages/` |
| `npm run generate:pom` | KB JSON → POM skeletons in `support/pages/` |
| `npm run generate:all` | All pages in `config/platform.json` → spec files in `tests/UI/` |
| `npm run generate:from-excel` | `requirements.xlsx` → spec files (no test execution) |
| `npm run ai:run` | Full end-to-end: Excel → generate → run tests → report |
| `npm run test:ui` | Run existing tests in `tests/UI/` |
| `npm run test:api` | Run existing tests in `tests/API/` |
| `npm run ai:heal` | Read latest run failures → heal broken locators in POM files |
| `npm run ai:heal:dry` | Show what would be healed, without making any changes |
| `npm run ai:heal:rerun` | Heal and then immediately re-run the healed tests |
| `npm run ai:flaky` | Analyze retry history → identify flaky tests |
| `npm run ai:rootcause` | Classify latest run failures → plain English root cause analysis |
| `npm run ai:coverage` | Compare requirements vs tests → identify coverage gaps |
| `npm run ai:regression` | Changed file paths → which test suites to run |
| `npm run report:latest` | Open the latest Playwright HTML report in browser |
| `npm run project:reset` | Delete all generated artifacts for a clean restart |
| `npm run demo:healing` | Self-healing demo (runs in ~2-4s from cache) |
| `npm run demo:flaky` | Flaky test analysis demo |
| `npm run demo:rootcause` | Root cause analysis demo |

---

### `tests/UI/` and `tests/API/` — the spec files

So these are the actual Playwright test files. The UI ones are AI-generated (and then you review them). The API ones follow the same structure but use the `request` fixture instead of `page`.

Each UI spec file looks like this:

```typescript
import { testDesktop, testMobile } from '../../support/fixtures/visitFixture.js';
import { loginToParaBank, navigateTo } from '../../support/helper/loginHelper.js';
import LoginPage from '../../support/pages/loginPage.page.js';

let loginPage: LoginPage;

testDesktop.describe('Login - Desktop', () => {
    testDesktop.beforeEach(async ({ page }) => {
        await navigateTo(page, 'login.htm');
        loginPage = new LoginPage(page);
    });

    testDesktop('TC-001 @regression : [Login] Login with valid credentials',
        async ({ page }) => {
            // steps are here as comments, actual logic in loginPage methods
            await loginPage.loginWithValidCredentials();
        }
    );
});

testMobile.describe('Login - Mobile Web', () => {
    // exact same structure, runs at 375x812 viewport
});
```

You will notice every spec has both a `testDesktop.describe` and a `testMobile.describe`. So every test automatically runs on both desktop and mobile. That is baked into the generator.

Test names always follow this format: `TC-001 @regression : [PageName] Test Title`. The `@regression` tag means it is in the main regression suite. You can also tag `@smoke` manually for fast CI checks.

---

### `support/fixtures/visitFixture.ts` — where testDesktop and testMobile come from

So this is the file that exports `testDesktop` and `testMobile`. Both are extended Playwright `test` objects. When a spec uses `testDesktop`, behind the scenes it:

1. Creates a browser context with `1440×900` viewport
2. Opens `BASE_URL` and waits for the page to load
3. Passes `page` to your test
4. After the test finishes, closes the context properly

`testMobile` does the same thing but at `375×812`. The viewport sizes are defined in `support/utils/constants.ts` and you can change them there.

The context close step is important — without it you get browser context leaks that slow down long test runs.

---

### `support/pages/` — Page Object Models

Think of a POM as a typed wrapper around a page. Instead of your spec file saying `page.fill('input[name="username"]', 'john')`, it says `loginPage.loginWithValidCredentials()`. The spec does not know what a selector is.

Every POM file follows this pattern:
- Filename: `loginPage.page.ts` (camelCase + `.page.ts`)
- Class: `export default class LoginPage`
- Locators declared as `private readonly` properties
- Constructor takes `private page: Page`
- Public methods for user actions: `loginWithValidCredentials()`, `submitBillPayment()`
- Public methods for assertions: `verifyLoginSuccess()`, `verifyErrorMessage()`

These are **initially generated** by `npm run generate:pom`. The generator creates the skeleton — correct class name, correct locators pulled from the KB, correct method signatures. You then fill in the method bodies with actual Playwright interactions.

The reason we separate POM generation from spec generation is this: specs can be regenerated as many times as you want from requirements. POMs you enrich manually with logic — you do not want that work overwritten.

---

### `support/helper/` — shared utilities

**`loginHelper.ts`** — two functions. `loginToParaBank(page)` logs into the application — this is called in `beforeEach` for pages where `authRequired: true` is set in the KB. `navigateTo(page, path)` navigates to a relative path from `BASE_URL`.

**`apiHelper.ts`** — `getApiConfig()` and `getUserCredentials()` for API tests.

**`fileReader.ts`** — generic file reader utility.

---

### `config/platform.json` — controls bulk generation

This file tells `generate:all` which pages to process. Add a new page here when you want it included in a full run:

```json
[
  { "name": "Login", "page": "parabank-login-page", "outputFile": "parabank-login.spec.ts" },
  { "name": "BillPay", "page": "parabank-billpay-page", "outputFile": "parabank-billpay.spec.ts" }
]
```

The `page` value must match a filename in `pipeline/kb/pages/` (without `.json`).

---

### `reports/` — all test output, organized by run

```
reports/
├── .current-run-id              ← which run is active
├── latest → 2026-06-29_14-30-00 ← symlink, always points to most recent run
├── 2026-06-29_14-30-00/
│   ├── playwright/
│   │   ├── index.html           ← Playwright HTML report
│   │   └── results.json         ← what ai:heal and ai:rootcause read
│   ├── allure/
│   │   ├── results/             ← raw Allure data (what ai:flaky reads)
│   │   └── report/              ← Allure HTML report
│   └── ai-reports/
└── analysis/
    ├── rootcause-report-*.html
    ├── flaky-report-*.html
    └── coverage-report-*.html
```

The whole `reports/` folder is gitignored. `reports/latest/` is always there as a symlink so `npm run report:latest` always works — you never have to remember the run ID.

---

## Now let me show you the end-to-end flow

Let me trace what actually happens from the beginning to the end.

**Step 1 — One-time setup: generate the Knowledge Base**

```bash
npm run kb:generate -- --url https://parabank.parasoft.com/parabank/login.htm
```

This crawls the login page, reads the DOM, and generates `pipeline/kb/pages/parabank-login-page.json` with real selectors and inferred scenarios. You review the JSON, fix any selectors it got wrong, and you are done with this step for that page.

**Step 2 — Generate the spec files**

```bash
npm run generate:all
```

This reads `config/platform.json` and for each page:
- Loads the KB JSON via `KnowledgeBaseService.load()`
- Calls `TestCaseGenerator` → gets back `TestCase[]`
- Calls `PlaywrightGenerator` → assembles the complete `.spec.ts` file
- Writes the file to `tests/UI/`

If `support/pages/` does not already have a POM for that page, it generates the skeleton too.

**Step 3 — Run the tests**

```bash
npm run test:ui
```

Playwright runs all specs in `tests/UI/` in headless mode. `playwright.config.ts` calls `resolveRunContext()` from `RunContext.ts` to get the output paths. Results land in `reports/<runId>/playwright/`. The `reports/latest/` symlink gets updated.

Set `HEADED=true` if you want to watch the browser during the run.

**Step 4 — View results**

```bash
npm run report:latest
```

Opens the Playwright HTML report. If any tests failed, the report shows the failure message, screenshot, and trace.

**Step 5 — If tests failed due to broken locators**

```bash
npm run ai:heal
```

Reads `reports/<runId>/playwright/results.json`, classifies failures, finds broken locators, heals them in the POM files, and writes an HTML healing report.

**Step 6 — If you want to understand the failures in plain English**

```bash
npm run ai:rootcause
```

Takes every failure from the results JSON and runs an AI analysis on it. Tells you the failure type, probable cause, impacted component, and what to fix.

---

## What is auto-generated vs what you actually own

This is important to understand before you start making changes.

**Do not edit these manually — they get overwritten:**

- `tests/UI/*.spec.ts` — regenerated every time you run `generate:all`
- `.llm-cache/` — managed by `CachingLLMProvider` (use `npm run cache:clear` to reset)
- `reports/` — test runner output, auto-cleaned

**Generated once, but you enrich and own them after:**

- `support/pages/*.page.ts` — generated by `generate:pom` the first time. After that, you fill in the method bodies. These survive project resets.

**Always human-written — you own these completely:**

- `requirements/requirements.xlsx` — you write what needs to be tested
- `pipeline/kb/pages/*.json` — you own selector accuracy, run `kb:generate` to create, then verify
- `support/helper/*.ts` — your project-specific utilities
- `config/platform.json` — you decide which pages to generate for

---

## Onboarding a new application

Say you want to point this at a completely different application. Here is exactly what you do:

```bash
# 1. Set the URL in config/environments/.env.development
#    BASE_URL=https://your-new-app.com

# 2. Generate Knowledge Bases (run once per page)
npm run kb:generate -- --url https://your-new-app.com/login
npm run kb:generate -- --url https://your-new-app.com/register

# 3. Open the generated JSON files, check selectors in browser DevTools, fix anything wrong

# 4. Add pages to config/platform.json

# 5. Generate POM skeletons
npm run generate:pom

# 6. Write requirements in requirements/requirements.xlsx

# 7. Generate specs
npm run generate:all

# 8. Run the tests
npm run test:ui

# 9. Open each POM in support/pages/ and fill in the method bodies
```

To clean everything and start fresh: `npm run project:reset`.

---

## Questions that usually come up

**"A selector broke after a UI update. Do I manually find and fix it?"**  
No. Run `npm run ai:heal`. It reads the test failures, finds the broken locators, heals them in the POM files automatically. Check the healing report it generates.

**"How do I add a new test for an existing page?"**  
Add a row in `requirements.xlsx` under the right page and feature. Fill in the Description like a user story. Run `npm run generate:all`. The spec gets regenerated with the new test case included.

**"The AI calls are slow. How do I speed things up?"**  
`LLM_CACHE=true` should already be set — check your `.env`. The cache stores responses on disk so the same prompt never calls the LLM twice. If you cleared the cache recently, the first run will be slow but subsequent runs will be fast.

**"How do I run only smoke tests?"**  
```bash
npx playwright test --grep "@smoke"
```

**"I want to see the browser while tests run."**  
```bash
HEADED=true npm run test:ui
```

**"I want to add a new AI provider."**  
Create a class in `pipeline/providers/` that implements `LLMProvider` (one method: `generateResponse(prompt): Promise<string>`). Register it in `ProviderFactory.createSingle()`. That is literally all you need to do — no other file in the project changes.

---

## Quick reference — where to go for what

| I want to… | Go here |
|---|---|
| Change which AI model is used | `.env` → `LLM_PROVIDER` and `MODEL` |
| Fix a broken selector | `pipeline/kb/pages/<page>.json` |
| Add a new page to the framework | `kb:generate` → `generate:pom` → `config/platform.json` |
| Understand the spec file format | `pipeline/generators/playwright/PlaywrightGenerator.ts` |
| Change how test cases are generated | `pipeline/generators/test-cases/TestCaseGenerator.ts` |
| Change viewport sizes | `support/utils/constants.ts` |
| Change the beforeEach navigation | `support/fixtures/visitFixture.ts` |
| Understand where reports go | `pipeline/reporting/RunContext.ts` |
| Add a new AI analyzer | `pipeline/analyzers/<category>/` |
| See every npm command | `package.json` → `scripts` section |

---

That is the whole framework. Every file has one job. Every module talks to the next through typed interfaces. The AI is always given real data, and its output is always validated before being used. Once you have understood one generator or one analyzer, you have understood the pattern — the other nine work the same way.
