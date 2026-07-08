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

## Root-level files — the ones you'll open on day one

Before we go folder by folder, let me quickly cover the files sitting at the project root. These are not part of the "AI pipeline" story, but you will touch them in your first hour on this project, so let's get them out of the way.

**`package.json`**

This is just your regular npm file, but the `scripts` section is basically the command menu for the whole framework. If you ever forget how to run something, don't go hunting through folders — open this file and scroll the scripts. Every command we talk about in this document (`npm run ai:run`, `npm run generate:all`, `npm run test:ui`, and so on) is defined here, and each one is a one-line wrapper around a file in `scripts/`.

One thing worth knowing: `dotenv-flow` and `@faker-js/faker` are listed under `dependencies`, but nothing in the codebase actually imports them right now. They were probably added while exploring an approach that didn't get used. Don't go looking for "the faker-based data generation" — it doesn't exist yet.

**`playwright.config.ts`**

This is the file Playwright itself reads before running any test. A few things worth knowing about what's configured here:

- It loads your environment file (`config/environments/<ENVIRONMENT>.env`) before anything else runs, so `BASE_URL`, credentials, etc. are available to every test.
- It calls `resolveRunContext()` from `pipeline/reporting/RunContext.ts` to figure out where this run's output should go — so this file is the bridge between "Playwright's own config" and "our custom run-folder system."
- `retries: CI ? 2 : 0` — locally, a failing test fails once and stops. In CI, it gets two retries before being marked failed. This is exactly the data the Flaky Test Analyzer later reads — retries are what make a test "flaky" instead of "broken."
- `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'` — we don't waste disk space capturing this stuff on every passing test. It only kicks in when something goes wrong or gets retried.
- Three browser projects are registered — `chromium`, `firefox`, `webkit` — but `npm run test:ui` currently pins to a single spec file and doesn't pass `--project`, so by default it runs whichever project Playwright picks first (chromium) unless you explicitly run `npm run test:chromium` / `test:firefox` / `test:webkit`.
- You update this file when you need to change timeouts, add a new reporter, add a new browser project, or change what gets captured on failure. You do **not** need to touch it to add a new page or a new test — that all happens through the KB and the generators.

**`tsconfig.json`**

Standard TypeScript config, but two settings are worth calling out because they change how you write code in this project:

- `noUncheckedIndexedAccess: true` — indexing into an array or object (`arr[0]`, `record[key]`) always comes back typed as possibly `undefined`. You'll see `!` non-null assertions scattered around the codebase because of this — that's not carelessness, it's the compiler forcing you to be explicit.
- `exactOptionalPropertyTypes: true` — you cannot assign `undefined` directly to an optional field (`foo?: string`). You either omit the field or give it a real value. This trips people up the first time they hit it.

**`eslint.config.js`**

The one rule that matters most here is `"@typescript-eslint/no-explicit-any": "error"` — using `any` anywhere in the codebase is a lint error, not a warning. This is deliberate: the whole framework's safety net (constrain the AI, validate the output) falls apart if the TypeScript layer itself is full of untyped `any` escape hatches. If you're tempted to reach for `any` to silence a type error, that's usually a sign you're missing a proper interface somewhere — add one instead.

Generated files (`support/pages/**`, `support/data/**`) are excluded from linting, because they may contain LLM-written code that doesn't perfectly match our style rules, and we don't want lint failures blocking generation.

**`vitest.config.ts`**

This runs the unit tests — anything named `*.test.ts` anywhere in the repo (`npm run test:unit`). This is separate from Playwright: Vitest tests the pipeline's TypeScript logic in isolation (parsers, extractors, retrievers) with the `MockLLMProvider` or no LLM at all, while Playwright runs the actual browser-driven `.spec.ts` files. If you're adding a new generator or analyzer, its unit test goes here, not in `tests/`.

**Environment files — `.env`, `.env.example`, `config/environments/*.env`**

There are two separate environment mechanisms in this project and it's easy to mix them up:

- `.env` (gitignored, your local secrets — copy `.env.example` and fill in your own API keys) controls **which LLM provider** the pipeline talks to (`LLM_PROVIDER`, `GOOGLE_API_KEY`, `GITHUB_TOKEN`, etc.).
- `config/environments/<name>.env` (checked into git, no real secrets in them) controls **which application environment** you're testing against — `BASE_URL`, `QA_USER_EMAIL`/`QA_USER_PASS`, `HTTP_USERNAME`/`HTTP_PASSWORD`. You pick one of these with `ENVIRONMENT=qa|uat|production|development`, defaulting to `development`.

On secrets: this project does **not** use GPG, Vault, or any encrypted-secrets flow. Credentials are plain environment variables, loaded straight from `.env` and `config/environments/*.env`, and `.env*` is gitignored so real keys never get committed. If your organization needs encrypted secrets management, that would be a new piece of infrastructure to add on top of this — it doesn't exist here today, so don't go looking for a decrypt step in the pipeline.

**`config/platform.json`**

This drives `npm run generate:all`. The real shape of the file is:

```json
{
  "projectName": "My Project",
  "defaultEnvironment": "qa",
  "llmModel": "gpt-4.1-mini",
  "uiTestOutputPath": "tests/UI/",
  "apiTestOutputPath": "tests/API/",
  "pageOutputPath": "support/pages/",
  "dataOutputPath": "support/data/",
  "reportOutputPath": "reports/",
  "suites": []
}
```

`suites` is the list of pages to generate for — each entry is `{ name, page, outputFile }` where `page` matches a filename in `pipeline/kb/pages/` (without `.json`). Right now in this repo `suites` is empty, which means `generate:all` will simply refuse to run ("No suites defined") until you populate it — the four existing spec files (`parabank-login`, `parabank-billpay`, `parabank-register`, `parabank-transfer`) were generated earlier and the config wasn't kept in sync, or they were generated via a different path. Don't assume this file is currently driving what's in `tests/UI/` — check it before you trust it.

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

Let me show you what one of these files actually looks like. Open `pipeline/kb/pages/parabank-login-page.json` — this is the real, current content, not a simplified example:

```json
{
  "pageName": "onlineBankingLogin",
  "url": "https://parabank.parasoft.com/parabank/index.htm",
  "selectors": {
    "usernameField": "input[name='username']",
    "passwordField": "input[name='password']",
    "loginButton": "input[type='submit'].button",
    "forgotLoginLink": "a:has-text('Forgot login info?')",
    "registerLink": "a:has-text('Register')"
  },
  "messages": {
    "experienceBanner": "Experience the difference",
    "customerLoginTitle": "Customer Login"
  },
  "success": {
    "redirectUrl": "",
    "landmarkText": ""
  },
  "authRequired": false
}
```

This file is the source of truth for the login page. The selectors here are the real CSS selectors from the live application. When a generator needs to create a POM, it reads from here. When a generator needs a validation message, it reads the `messages` from here. When a selector breaks, you fix it here — and everything downstream automatically picks up the correct value.

One field you will **not** find inside this JSON file is `pageKey`. Even though `PlaywrightGenerator` reads `knowledgeBase.pageKey` to derive the class name, that value is never stored in the KB file itself — it's stamped onto the in-memory KB object at runtime by whichever script loaded it (`generate-all.ts` does `kb.pageKey = suite.page` right before calling the generator). So if you're reading a KB JSON file and wondering where `pageKey` is, it isn't missing — it just isn't meant to live there.

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

- **`TestCase.ts`** — `{ id, title, type, priority, preconditions[], steps[], expectedResult, isSmoke }` — what a test case looks like. `type` is one of `positive | negative | validation | edge-case | security | boundary`; `priority` is `Critical | High | Medium | Low`; `isSmoke` is AI-assigned and code-enforced to be `true` on exactly one test case per requirement (see the `@smoke` writeup under `tests/UI/` below).
- **`TestData.ts`** — valid and invalid input values for a test scenario
- **`KnowledgeBase.ts`** — the shape of a KB JSON file. Also declares an optional `pageKey` field, which — as covered below — is never actually present in the JSON files on disk; it gets attached to the in-memory object at runtime instead.

These come out of generators and go into renderers. Nobody creates them from scratch in business logic — they are always the output of one module and the input of the next.

---

### `pipeline/generators/` — where requirements become test code

So this folder is the heart of the generation pipeline. Before I walk through it, I need to correct something that older docs in this repo (and even some comments in the code) still describe — because if you go in expecting the "textbook" version, you'll get confused reading the actual code.

**The textbook version** (which you'll see described in `docs/WALKTHROUGH.md`) says: a test step in plain English gets converted into a structured "Action Model" object by AI, and a separate renderer turns that object into a Playwright code line, and a separate assertion generator turns the expected result into an assertion line — one station per concern, assembled by `PlaywrightGenerator`.

**What actually runs today is simpler than that.** `AIActionModelGenerator.ts`, `RuleBasedActionModelGenerator.ts`, `PlaywrightRenderer.ts`, and `AssertionGenerator.ts` all still exist in the codebase, but none of them are imported by anything in the active pipeline anymore — check for yourself, `grep` for their class names outside their own files and outside `.test.ts` files, and you'll find nothing. They're leftover from an earlier design. Don't spend time trying to trace a step's journey through them — that path is dead.

Here is what the real, currently-wired flow looks like:

**`test-cases/TestCaseGenerator.ts`**  
This is the first real station. You give it a plain-English requirement, optionally along with the page's Knowledge Base. It uses `SelectorRetriever` (in `pipeline/kb/`) to pull out only the selectors and messages actually relevant to this requirement — not the whole KB, to keep the prompt small — and builds a prompt with a "Senior QA Engineer" persona asking for 6 to 8 distinct test cases covering positive, negative, validation, boundary, edge-case, and security scenarios. Each case comes back with an `id` (`TC_001`, `TC_002`, ...), a `title`, a `type`, a `priority`, `preconditions`, `steps`, an `expectedResult`, and an `isSmoke` boolean. If the LLM returns fewer than 4 cases, the call throws — that's treated as a bad response worth retrying, not something to silently accept. The prompt also requires the AI to mark exactly one case `isSmoke: true` per requirement, and `enforceExactlyOneSmoke()` runs right after parsing to correct the AI if it got the count wrong (zero marked → auto-promote the best candidate; more than one marked → keep only the first).

**`test-data/TestDataGenerator.ts`**  
Takes the same requirement and generates realistic test data — valid/invalid values for the fields involved. Worth knowing: `generate-all.ts` calls this and writes the result out for reference / KB enrichment, but the generated `.spec.ts` file does **not** import or reference this test data — the actual values used at runtime live inside the POM's action methods instead (see `pom/POMGenerator.ts` below). So don't go looking for a `testData` import in a generated spec file; it isn't there.

**`playwright/PlaywrightGenerator.ts`**  
This is the assembler, and its job today is much narrower than the "renders every action" description you'll see elsewhere. For each test case, it:
1. Derives a method name from the test case title using `toMethodName()` (e.g. `"Login Attempt with Invalid Username"` → `loginAttemptWithInvalidUsername`).
2. Writes the test's `steps[]` in as plain `//` comments, purely for readability — they are not executed, they're documentation for whoever reads the spec.
3. Emits a single line: `await ${camelName}.${methodName}();` — calling straight into the Page Object Model.

That's it. All the real Playwright logic — the fills, the clicks, the assertions — lives inside the POM method, not in the generated spec. `PlaywrightGenerator` also has `generateApiSpec()`, which does the same title→method-name→comment→call pattern but wraps it in a `test.describe('... - API Tests', ...)` block using the `request` fixture instead of `page`.

The output follows the enterprise pattern — both `testDesktop.describe` and `testMobile.describe` in one file, a `beforeEach` that instantiates the POM and wires up a console listener, and test names in the format `TC_001 @regression : [PageName] Test Title` (mobile tests get an extra `[Mobile]` marker in the title). It uses `pMap` internally so multiple test cases are processed in parallel.

**`pom/POMGenerator.ts`**  
This is where the actual Playwright interaction code gets written, and it's the piece that makes the simplified `PlaywrightGenerator` above work correctly. When a new page's POM needs generating, this class:
1. Takes the KB's selectors and messages, and (critically) the list of test case titles.
2. Runs those titles through the **same** `toMethodName()` function that `PlaywrightGenerator` uses — imported directly from `playwright/PlaywrightGenerator.ts` (yes, `pom/` depends on `playwright/` for this one helper — an easy thing to trip over if you go looking for it in the "wrong" folder).
3. Sends **one** LLM call asking for the exact list of method names — "you MUST generate exactly these methods, do NOT add extra methods or rename them" — where each method body fills fields, clicks buttons, and includes the assertion inline (e.g. `expect(this.errorMessage).toBeVisible()`), ending with a `console.info(...)` line.

This is why a POM method like `successfulLoginWithValidCredentials()` in `support/pages/loginPage.page.ts` does the fill, the click, *and* the assertion all in one method — there's no separate "do it" method and "verify it" method. The generator's whole trick is: get the AI to produce method names that exactly match what `PlaywrightGenerator` will call, so the two files fit together like a lock and key without either one knowing the other's implementation details.

Also in this folder: `DataFileGenerator.ts` generates the companion `support/data/<page>Data.json` file, and `FixtureUpdater.ts` keeps `support/fixtures/visitFixture.ts` in sync when new pages are added.

**`requirements/RequirementGenerator.ts`**  
Expands terse requirement rows into full formal requirement descriptions. Used when your Excel requirements are short bullet points that need more context before test generation, or — as `generate-all.ts` does — to generate a requirement from scratch straight off the KB when a suite entry doesn't specify one manually.

**`discovery/`**  
`PageAnalyzer.ts` and `ScenarioInferenceEngine.ts` — these crawl a live URL and infer what test scenarios are possible. This feeds the KB generator so it knows what to include in the knowledge base.

**A note on the orphaned files** — `action-model/AIActionModelGenerator.ts`, `action-model/RuleBasedActionModelGenerator.ts`, `assertions/AssertionGenerator.ts`, and `playwright/PlaywrightRenderer.ts` are still sitting in the repo, still have their own unit tests, and are genuinely well-written — they just aren't called by anything anymore. Two reasonable things could happen to them: someone wires them back in as a more granular alternative to the current POM-method approach, or they get deleted as dead weight. Until one of those happens, treat them as reference material, not as part of the live pipeline.

---

### `pipeline/readers/` — turning your Excel sheet into something the AI can use

Okay, this folder is important and it's the one place the earlier version of this document didn't cover at all — and it's actually the folder that runs first in the most common command you'll use, `npm run ai:run`. So let me slow down here.

**`ExcelReader.ts`**

This is literally the file that opens `requirements/requirements.xlsx` and reads it row by row. Think of it like this — you and your QA team fill an Excel sheet the way you always have (Page, URL, Feature, Scenario, Description, Priority, Test Cases), and this file's whole job is to turn each row into a clean TypeScript object the rest of the pipeline can work with. The seven columns it reads, in order, are:

| Column | Name | What goes in it |
|---|---|---|
| A | Page | The KB key for this page, e.g. `parabank-login` — this has to match a filename in `pipeline/kb/pages/` (or become one) |
| B | URL | The real page URL. Only needs filling on the first row for a given page — repeat rows for the same page reuse it |
| C | Feature | Just a functional grouping label, e.g. "Authentication" |
| D | Scenario | Short name for the scenario |
| E | Description | The actual acceptance criteria — this is the text that gets sent to the AI |
| F | Priority | `smoke` or `regression` — **more on this below, because it doesn't do what you'd expect** |
| G | Test Cases | Leave blank to let AI generate test cases. Fill it in yourself if you want to skip AI entirely for that row |

A row gets silently skipped if `Page` or `Description` is blank (skipped rows are just counted, not shown one by one). And here's a small but genuinely useful detail: if a row has a `Page` and `URL` but no `Description`, it still isn't wasted — the URL gets registered so the framework can still generate a Knowledge Base and discover scenarios for that page, even though this particular row won't produce a test case by itself.

**Now here's the gotcha on column F, Priority.** The Excel template's own "Instructions" sheet tells you `'smoke' runs in every CI build; 'regression' runs nightly` — but that is aspirational, not real. If you trace this value through the code, `ExcelReader` reads it, `RequirementExpander` and `TestCaseGenerator` never look at it, and the only place it resurfaces is in the generated "Sheet 2" as a column called `Req. Priority`, purely for your own reference. It has **zero effect** on which test gets the `@smoke` tag or which suite a test lands in. The actual `@smoke` tag comes from a completely separate, AI-driven decision inside `TestCaseGenerator` (the `isSmoke` field we covered earlier). So don't rely on the Excel Priority column to control your CI smoke suite — it doesn't, today. If you want that wired up, that's a genuine gap someone would need to close, not a misunderstanding on your part.

**`RequirementExpander.ts`**

This is the file that actually calls the AI. Don't confuse it with `pipeline/generators/requirements/RequirementGenerator.ts` — yes, the names are annoyingly similar, and they do genuinely different jobs in two different pipelines:
- **`RequirementExpander`** (this file) takes an Excel row's `Description` and turns it into `TestCase[]` — used only by the Excel-driven flow (`generate-from-excel.ts` / `ai:run`).
- **`RequirementGenerator`** (in `pipeline/generators/requirements/`) takes a KB and writes a brand-new requirement sentence from scratch — used only by `generate-all.ts`, for suites in `config/platform.json` that don't specify a manual requirement.

They never call each other and are never both active in the same command.

What `RequirementExpander` actually does: for each Excel row marked `aiGenerate: true` (meaning column G was left blank), it calls `TestCaseGenerator.generate(description, kb)` — the exact same generator we already walked through — and attaches the resulting test cases to that row. The clever part is `expandAll()`, which accepts an optional `ArtifactManifest` (covered next). When you give it one, it doesn't blindly call the AI for every row on every run — it first classifies every row as `new`, `modified`, `unchanged`, or `removed` by comparing a content hash against what's stored from the last run. Rows that haven't changed return their cached test cases instantly, with **zero LLM calls**. Only new or edited rows actually hit the AI. This is the reason you can re-run `npm run ai:run` on a big Excel sheet after tweaking one row and it comes back in seconds instead of minutes.

**`pipeline/utils/ArtifactManifest.ts`**

This is the file that makes the caching above possible, and it's genuinely one of the smarter pieces of this framework, so let me explain it properly instead of just naming it.

Every AI-generation step in this framework costs time and (a little) money, because it's a real LLM call. If you re-ran the whole pipeline from scratch every single time — even when 95% of your Excel sheet hasn't changed since yesterday — you'd be burning API calls and waiting for no reason. `ArtifactManifest` solves this by keeping a small JSON file, `ai-metadata/artifacts.json`, that remembers:
- A content hash for every requirement row (`sha256` of its description + scenario + feature) — so it knows the moment you edit a row's wording.
- The URL and file hash used the last time a page's Knowledge Base and POM were generated — so if you change the URL in Excel, or hand-edit the KB JSON, it knows to regenerate the POM too (this is the "cascade invalidation" the file's own comment talks about — a change in one artifact correctly forces regeneration of the things downstream of it, without you having to remember to delete anything yourself).
- Which spec files were generated for each page.

**One real gotcha worth flagging here too:** the code comment at the top of `ArtifactManifest.ts` says this file is "committed to git... so the team shares the same baseline across machines." But if you check `.gitignore`, `ai-metadata/` is actually listed there and gets ignored. So today, this manifest is **not** shared across the team the way the code comment claims — every developer (and every CI runner) starts with an empty manifest and has to rebuild its cache locally. That's not necessarily wrong — sharing it could also cause weird cross-machine cache-hit bugs — but it does mean the comment and the actual `.gitignore` disagree, and if your team decides caching should be shared, removing `ai-metadata/` from `.gitignore` is the one-line fix.

**`pipeline/utils/ExcelTestCaseWriter.ts`**

After the AI generates test cases from your Excel rows, this file writes them straight back into the *same* Excel file, as a second worksheet called "Generated Test Cases." So don't be surprised when you open `requirements.xlsx` after running `ai:run` and see a new tab — that's expected, and it's replaced fresh on every run (not appended to). This second sheet has columns for the test case ID, page, feature, scenario, title, type, priority, preconditions, steps, expected result, the original Excel-level smoke/regression priority (for cross-reference), and whether the row came from Excel directly or was AI-discovered (see the scenario-discovery step below). It's color-coded by priority and type too, so a QA lead can skim it without opening a single spec file.

**`scripts/ensureScaffold.ts`** — not in `pipeline/`, but this is the right place to mention it since it's what makes the Excel flow (and every other flow) work on a completely fresh clone. Every script entry point calls `ensureScaffoldFiles()` as its very first line. On a brand-new checkout with no `support/` folder at all, this function creates the whole skeleton for you — `support/fixtures/`, `support/helper/`, `support/pages/`, `support/data/`, `support/utils/`, `tests/UI/`, `tests/API/` — plus starter versions of `constants.ts`, `visitFixture.ts`, the helper files, and an `example.page.ts`. It only writes a file if that file doesn't already exist, so on this repo (where all of that already exists and is checked into git) it does nothing every time — you'd only actually see it create files right after a truly fresh clone or after some of those files were deleted. One small thing worth knowing if you ever go looking: the scaffold's built-in copy of `visitFixture.ts` is an older, slightly different version than the real one sitting in `support/fixtures/` today (it types the browser as `any`, which would actually fail this project's own `no-explicit-any` lint rule if it were ever regenerated) — harmless in practice since the real file already exists and this branch never fires, but worth knowing so it doesn't confuse you if you ever read that scaffold source.

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

Before I go through the other four, here's something worth knowing that's easy to miss just from the folder names: each of these four (`root-cause`, `flaky`, `coverage`, `regression`) is actually **two files working together**, not one. There's an `Extractor` (in `pipeline/analyzers/extractors/`) that does the boring, non-AI work of reading raw data off disk and shaping it into a clean input object, and then there's the `Analyzer` (in the category's own folder) that takes that clean object and makes the one AI call. This split matters because it means you can unit-test the "read messy real-world data" part with zero LLM calls, and swap or improve the AI-analysis part without touching the file-reading logic. I actually touched two of these `Extractor` files myself while cleaning up stray `any` types earlier — so this isn't theoretical, it's exactly how the code is laid out today.

**`root-cause/`**  
`pipeline/analyzers/extractors/RootCauseExtractor.ts` reads the latest ~50 Allure result files, keeps only the failed ones, classifies each by pattern-matching the error text (timeout, connection error, assertion failure, locator not found, and so on — plain string matching, no AI here), and pulls out a trimmed stack trace and any attached screenshots. Then `pipeline/analyzers/root-cause/BugRootCauseAnalyzer.ts` takes that structured failure and makes the actual AI call, returning: failure type, probable cause, impacted component, specific recommendation, and a confidence score. Confidence is validated to be between 0 and 100 — if the AI returns 150 or leaves out the recommendation, the code throws immediately. Triggered by `npm run ai:rootcause`.

**`flaky/`**  
`pipeline/analyzers/extractors/FlakyTestExtractor.ts` reads the same `allure-results/` folder and figures out, per test, how many times it ran and how many of those runs failed — that ratio is the raw "flakiness" signal, computed with plain arithmetic, no AI. `pipeline/analyzers/flaky/FlakyTestAnalyzer.ts` then takes each flaky candidate and asks the AI for a flakiness probability score, probable causes (usually timing issues or environment instability), and a specific recommendation for what to fix. Triggered by `npm run ai:flaky`.

**`coverage/`**  
`pipeline/analyzers/extractors/CoverageExtractor.ts` scans your `requirements/` and `tests/` folders directly and works out, in code, which requirements already have a matching test and which don't. `pipeline/analyzers/coverage/CoverageAnalyzer.ts` then asks the AI to look at the uncovered ones and recommend what to prioritize. Triggered by `npm run ai:coverage`.

**`regression/`**  
`pipeline/analyzers/extractors/RegressionExtractor.ts` reads recent Allure failures and works out, per failing test, a risk level based on failure frequency and whether the test name matches something business-critical (login, checkout, payment). `pipeline/analyzers/regression/RegressionSelector.ts` then takes the source files behind those failing tests and asks the AI which other test suites are likely affected by changes in the same area. Important: after the AI responds, we filter its recommendations against `test-catalog.json` in code. If the AI hallucinates a suite name that does not exist, it gets silently removed. The AI is constrained by reality, even in post-processing. Triggered by `npm run ai:regression`.

**`pipeline/analyzers/shared/`**  
All four of the commands above end their run the same way — by calling `AnalysisReporter.ts` here, which takes a common `AnalysisReport` shape (`metadata` + `result.insights[]` + `result.statistics` + `result.summary` + `result.nextSteps`) and writes it out as both a JSON file and a styled HTML file into `reports/analysis/`. The shared types for this live in `pipeline/analyzers/shared/models/AnalysisReport.ts` — one `AnalysisInsight` shape (severity, category, title, description, affected items, recommendation, confidence) used across flaky, root-cause, coverage, and regression alike. This is why all four HTML reports in `reports/analysis/` look and feel the same even though they're analyzing completely different things.

---

### `pipeline/utils/` — small but important

**`AIJsonParser.ts`** — strips markdown code fences from LLM responses before `JSON.parse()`. Every AI module uses this. The reason it exists: LLMs very often respond with JSON wrapped in triple-backtick code blocks. If you call `JSON.parse()` directly on that, it throws. This parser strips the fences first.

**`concurrency.ts`** — `pMap(items, fn, concurrency)` — runs async functions in parallel with a cap on how many run at once. `PlaywrightGenerator` uses this so test cases are processed in parallel without spawning a hundred simultaneous LLM calls.

**`ArtifactManifest.ts`** and **`ExcelTestCaseWriter.ts`** also live here — both are part of the Excel-driven flow specifically, so I've covered them in full just above, under `pipeline/readers/`, right next to `RequirementExpander.ts` which is what actually uses them. Mentioning them here too so you don't go looking in `pipeline/readers/` and wonder why they're not physically there.

---

### `pipeline/reporting/RunContext.ts` — this file is more important than it looks

Every time you run tests, we create a unique timestamped run ID — something like `2026-06-29_14-30-00`. All output for that run goes into `reports/<runId>/`. The Playwright reports, the Allure results, the AI analysis reports — all organized under that one folder.

This file manages that whole lifecycle:
- `createRunContext()` — creates a fresh timestamped folder, writes the run ID to `reports/.current-run-id`, creates a `reports/latest/` symlink pointing to this run, and cleans up old runs
- `resolveRunContext()` — called by `playwright.config.ts` to figure out which run folder to use. It looks for `REPORT_RUN_ID` env var first, then the `.current-run-id` file (if it was written within the last 2 hours), then creates a new one

The path is anchored to the project root using `import.meta.url`. This matters because if you run commands from different directories, `reports/` still always lands inside the project, not wherever your shell happens to be sitting.

**A real gotcha to know about — Allure results don't actually land where `RunContext` says they should.** `RunContext` defines `allureResults: reports/<runId>/allure/results`, and `run-pipeline.ts` checks that exact folder to decide whether to generate an Allure HTML report. But `playwright.config.ts`'s actual reporter line is:

```typescript
['allure-playwright', { detail: true, outputFolder: 'allure-results', suiteTitle: false }],
```

That's a hardcoded path relative to the project root — `allure-results/` — completely separate from the per-run folder structure. So in practice, `reports/<runId>/allure/results/` is always empty (it gets created by `createDirs()` but nothing ever writes into it), while every test run keeps appending to one single top-level `allure-results/` folder. This means:
- The auto-generate-report step inside `npm run ai:run` (which checks `reports/latest/allure/results`) effectively never finds anything and silently skips report generation.
- If you actually want an Allure report, run `npm run allure:generate` (or `allure:serve`) yourself — those read from the real `allure-results/` folder at the project root.
- `npm run ai:flaky` reads from this same top-level `allure-results/` folder directly (see `FlakyTestExtractor.ts`), which is why it works correctly even though the "official" run-folder plumbing doesn't line up.

Also worth knowing: Allure supports trend/history graphs across runs, but that requires copying the previous report's `history/` folder back into `allure-results/` before regenerating — nothing in this project does that (`npm run clean:allure` wipes `allure-results/` and `allure-report/` entirely, and `allure:generate` doesn't restore history). So don't expect to see trend graphs in the Allure report here; that would be additional wiring to add, not something currently broken.

**`pipeline/reporting/ReportingService.ts`** — a second reporting piece, separate from `RunContext`. This one takes the output of the flaky/root-cause/coverage/regression analyzers together and rolls them up into one **release risk** verdict — `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` — based on simple thresholds (e.g. 3+ high-confidence root causes or 5+ flaky tests pushes you to `CRITICAL`). It writes `reports/latest-ai-analysis/ai-analysis-report.json` and a human-readable `release-risk-summary.md`. The catch: as of today, nothing in `scripts/` actually calls this. It's used by `pipeline/execution/PipelineRunner.ts`, which itself isn't wired to any npm command (see the callout below). If you want a single combined risk verdict across all the analyzers today, you'd currently have to run `ai:flaky`, `ai:rootcause`, and `ai:coverage` separately and read three reports instead of one.

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
| `npm run test:ui` | Run existing tests in `tests/UI/` (currently pinned to `parabank-billpay.spec.ts` — see the script definition if you want to run a different file) |
| `npm run test:api` | Run existing tests in `tests/API/` (this folder is currently empty in this repo — nothing to run yet until an API spec is generated) |
| `npm run ai:heal` | Read latest run failures → heal broken locators in POM files |
| `npm run ai:heal:dry` | Show what would be healed, without making any changes |
| `npm run ai:heal:rerun` | Heal and then immediately re-run the healed tests |
| `npm run ai:flaky` | Analyze retry history → identify flaky tests |
| `npm run ai:rootcause` | Classify latest run failures → plain English root cause analysis |
| `npm run ai:coverage` | Compare requirements vs tests → identify coverage gaps |
| `npm run ai:regression` | Recent Allure failures → which test suites are likely affected and worth re-running |
| `npm run report:latest` | Open the latest Playwright HTML report in browser |
| `npm run project:reset` | Delete all generated artifacts for a clean restart |
| `npm run demo:healing` | Self-healing demo (runs in ~2-4s from cache) |
| `npm run demo:flaky` | Flaky test analysis demo |
| `npm run demo:rootcause` | Root cause analysis demo |

---

**Two independent ways to generate spec files — don't mix them up.** `generate:all` and `generate:from-excel` both end up producing `.spec.ts` files, but they are two completely separate code paths reading two completely separate sources of input, and they even name their output files differently:

- **`generate:all`** (`scripts/generate-all.ts`) reads `config/platform.json`'s `suites` array. Each suite gets a requirement either typed manually in that JSON or auto-written by `RequirementGenerator` straight from the KB. Output file name = whatever you put in `suite.outputFile` — e.g. `parabank-login.spec.ts`. **This is how the four spec files already sitting in this repo's `tests/UI/` were actually produced** — even though `config/platform.json`'s `suites` array is empty right now, so if you tried to reproduce them today with this exact command, it would refuse to run until you repopulate that array.
- **`generate:from-excel`** (`scripts/generate-from-excel.ts`, what `npm run ai:run` calls) reads `requirements/requirements.xlsx` and is the richer of the two — it also auto-generates missing KBs, auto-discovers extra scenarios by crawling the live page, and caches everything through `ArtifactManifest`. Output file name is always `<pageKey>-excel.spec.ts` (or `-excel-1.spec.ts`, `-excel-2.spec.ts`, ... if a page has more test cases than `SPEC_BATCH_SIZE`, default 20, in one go).

So if you're ever confused why a page has no `-excel.spec.ts` file even though it clearly has a KB and a POM, the answer is almost always: it was generated through `generate:all`, not through the Excel flow.

**A real bug worth knowing about in `project-reset.ts`:** its `resetPlatformConfig()` function writes a blank `config/platform.json` with a field called `testOutputPath`. But `generate-all.ts`'s own `PlatformConfig` interface expects `uiTestOutputPath`, `apiTestOutputPath`, `pageOutputPath`, and `dataOutputPath` — none of which `project:reset` writes. So if you run `npm run project:reset` and then immediately try `npm run generate:all` without manually fixing `config/platform.json` first, it will crash with a Node.js error about `mkdirSync` receiving `undefined` as a path, because `config.uiTestOutputPath` is `undefined`. The fix, if you hit this, is simple — just edit `config/platform.json` yourself to match the real shape shown earlier in this document (under "Root-level files"). This is exactly the kind of thing worth knowing before you hit it in a demo.

Also, you'll see `project-reset.ts`'s own comments mention preserving `tests/fixtures/base.ts` — that file doesn't exist in this repo. The real fixture file lives at `support/fixtures/visitFixture.ts`, which we cover next. This is just a stale comment left over from an earlier folder layout; the script doesn't actually touch either path, so it's harmless, just a little misleading if you go looking for `tests/fixtures/`.

---

### `tests/UI/` and `tests/API/` — the spec files

So these are the actual Playwright test files. The UI ones are AI-generated (and then you review them). In this repo, `tests/UI/` currently has four spec files (`parabank-login`, `parabank-billpay`, `parabank-register`, `parabank-transfer`) and `tests/API/` is empty — nobody has run `generate:all` with API generation targeted yet, even though `PlaywrightGenerator.generateApiSpec()` fully supports it.

Here is a real generated UI spec file, `tests/UI/parabank-login.spec.ts`, trimmed to two test cases:

```typescript
import type { ConsoleMessage, Page } from '@playwright/test';
import { testDesktop, testMobile } from '../../support/fixtures/visitFixture.js';
import { verifyPageTitle, waitForSelector } from '../../support/helper/interceptHelper.js';
import LoginPage from '../../support/pages/loginPage.page.js';

let loginPage: LoginPage;

testDesktop.describe('onlineBankingLogin - Desktop', () => {
    testDesktop.beforeEach(async ({ page }: { page: Page }) => {
        loginPage = new LoginPage(page);
        page.on('console', (msg: ConsoleMessage) => console.info(`[Console][Desktop]: ${msg.text()}`));
    });

    testDesktop(
        'TC_001 @regression : [onlineBankingLogin] Successful Login with Valid Credentials',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Enter valid username into the 'username' field.
        // Enter valid password into the 'password' field.
        // Click the 'Log In' button.
        await loginPage.successfulLoginWithValidCredentials();
        },
    );
    // ... TC_002 through TC_008 follow the exact same shape ...
});

testMobile.describe('onlineBankingLogin - Mobile Web', () => {
    // identical beforeEach and test list, just under testMobile — same POM, same methods
});
```

A few things to notice that matter for how you read and debug these files:

- The `// comment` lines above each `await loginPage.xxx()` call are **not executed** — they're the original AI-generated test steps kept as documentation. All the real interaction and assertion logic lives inside the POM method being called.
- The `beforeEach` here doesn't call `navigateTo()` or a login helper — this particular KB has `authRequired: false` and no explicit navigation configured, so the page just starts wherever the browser context's initial `page.goto(BASE_URL)` (from the fixture) leaves it. A page with `authRequired: true` in its KB would get a `loginToParaBank(page)` call injected into `beforeEach` instead — you don't write that by hand, `PlaywrightGenerator` reads it straight off the KB.
- The `page.on('console', ...)` line captures browser console output into the test log — useful when a test fails and you want to see if the app itself logged an error, without opening dev tools.

You will notice every spec has both a `testDesktop.describe` and a `testMobile.describe`, using the exact same POM and the exact same method calls, just running at different viewport sizes (`support/utils/constants.ts` defines `1280×800` for desktop and `375×667` for mobile). That's baked into the generator — you never write the mobile block by hand.

Test names always follow this format: `TC_001 @regression : [PageName] Test Title` (mobile ones get `[PageName][Mobile]`). The `@regression` tag means it is in the main regression suite.

`@smoke` is also fully automatic — no human picks it. `TestCaseGenerator`'s prompt requires the AI to mark **exactly one** test case per requirement as `isSmoke: true` (the single fastest, most critical scenario that proves the feature works at all — normally the primary positive-path, Critical/High-priority case). The AI is never trusted to get the count right on its own: `enforceExactlyOneSmoke()` runs after parsing and corrects the response in code — if the AI marks zero, it promotes the best candidate itself (positive type, highest priority); if it marks more than one, it keeps only the first and clears the rest. `PlaywrightGenerator` then reads `testCase.isSmoke` and appends ` @smoke` right after `@regression` in both the desktop and mobile titles (and in the API spec title too). So every generated page automatically gets one, and only one, smoke test — you never add this tag by hand.

**Fixed gotcha, worth knowing the history of:** `package.json` has a `test:mobile` script that runs `npx playwright test --grep @mobile`. Mobile test titles used to only carry `[Mobile]` in the text with no literal `@mobile` tag, so `--grep @mobile` matched nothing. `PlaywrightGenerator.generateTestBlock()` now emits `@regression @mobile` on every `testMobile` title (right next to `@regression`, same pattern), and the four already-generated spec files in `tests/UI/` were patched to match — so `npm run test:mobile` now correctly selects the mobile-only tests instead of zero. If you ever add another manual tag convention, follow this same "space-separated `@tag` right after the test ID" pattern so `--grep` keeps working.

---

### `support/fixtures/visitFixture.ts` — where testDesktop and testMobile come from

So this is the file that exports `testDesktop` and `testMobile`. Both are extended Playwright `test` objects, built off `base.extend<TestFixture>({ page: ... })` — meaning the only thing they override is how `page` gets set up before your test body runs. Here's the actual logic:

```typescript
async function setupPage(browser: Browser, viewportSize: { width: number; height: number }) {
    const context = await browser.newContext({ viewport: viewportSize });
    const page    = await context.newPage();
    if (baseURL) {
        await page.goto(baseURL);
        await page.waitForLoadState('load');
    }
    return { page, context };
}
```

When a spec uses `testDesktop`, behind the scenes it:

1. Creates a browser context at `DESKTOP_VIEW_PORT` (`1280×800`, from `support/utils/constants.ts`)
2. Opens `BASE_URL` and waits for `load` — but only if `BASE_URL` is actually set; if it's missing, you get a console warning and the page just stays blank, it does not throw
3. Passes `page` to your test
4. After the test finishes, closes the context

`testMobile` does the exact same `setupPage()` call, just with `MOBILE_VIEW_PORT` (`375×667`) instead. If you ever need a third viewport — say a tablet size — this is the file and pattern to copy: add the constant to `constants.ts`, then export a `testTablet` the same way.

The context close step is important — without it you get browser context leaks that slow down long test runs.

---

### `support/pages/` — Page Object Models

Think of a POM as a typed wrapper around a page. Instead of your spec file saying `page.fill('input[name="username"]', 'john')`, it says `loginPage.successfulLoginWithValidCredentials()`. The spec does not know what a selector is.

Here is the real `support/pages/loginPage.page.ts`, trimmed to two methods, so you can see the actual pattern:

```typescript
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export default class LoginPage {
    private readonly page: Page;

    private readonly usernameField: Locator;
    private readonly passwordField: Locator;
    private readonly loginButton: Locator;

    private readonly errorMessage = 'The username and password could not be verified.';

    constructor(page: Page) {
        this.page = page;
        this.usernameField = page.locator("input[name='username']").first();
        this.passwordField = page.locator("input[name='password']").first();
        this.loginButton   = page.locator("input[type='submit'].button").first();
    }

    async successfulLoginWithValidCredentials(): Promise<void> {
        await this.usernameField.fill('john');
        await this.passwordField.fill('demo');
        await this.loginButton.click();
        await expect(this.page).toHaveURL(/overview/);
        console.info('Verified successful login with valid credentials.');
    }

    async loginAttemptWithInvalidUsername(): Promise<void> {
        await this.usernameField.fill('invalid_user_xyz');
        await this.passwordField.fill('demo');
        await this.loginButton.click();
        await expect(this.page.getByText(this.errorMessage)).toBeVisible();
        console.info('Verified login attempt with invalid username shows error.');
    }
}
```

Notice something important here: there is **no separate assertion method**. `successfulLoginWithValidCredentials()` fills the fields, clicks the button, *and* asserts the outcome, all in one method, ending with a `console.info(...)` call. That's the actual convention in this codebase — one method per test case, action and verification combined — not "one method to act, one method to check" like you might expect from a more traditional POM style. This matters when you're enriching a POM by hand: don't go creating a separate `verifyLoginSuccess()` — just add the assertion at the end of the action method, matching what's already there.

Every POM file follows this pattern:
- Filename: `loginPage.page.ts` (camelCase + `.page.ts`)
- Class: `export default class LoginPage`
- Locators declared as `private readonly` properties, built in the constructor from the KB's selector strings
- Known message strings declared as `private readonly` plain string properties (not `Locator`s) — used inside assertions like `toBeVisible()` / `toContainText()`
- One `async` method per test case, named to exactly match what `PlaywrightGenerator` will call

These are **generated** the first time a page's POM doesn't exist yet — either via `npm run generate:pom` directly, or automatically by `generate-all.ts` when it notices `support/pages/<page>.page.ts` is missing. The generator (`POMGenerator.ts`) makes one LLM call per page, asking for the exact list of methods (derived from your test case titles) with their bodies filled in — see the `pipeline/generators/pom/POMGenerator.ts` writeup above for the mechanics. After that first generation, the file is yours: enrich it, fix a flaky selector, add a missing `waitFor`, whatever — it will not be silently regenerated once it exists on disk (`generate-all.ts` checks `fs.existsSync(pomFile)` and skips generation entirely if the file is already there).

The reason we separate POM generation from spec generation is this: specs can be regenerated as many times as you want from requirements. POMs you enrich manually with logic — you do not want that work overwritten.

---

### `support/helper/` — shared utilities

**`loginHelper.ts`** — two functions. `loginToParaBank(page)` logs into the application — this is called in `beforeEach` for pages where `authRequired: true` is set in the KB. `navigateTo(page, path)` navigates to a relative path from `BASE_URL`.

**`apiHelper.ts`** — `getApiConfig()` (base URL + login URL for API tests) and `getUserCredentials()` (reads `<ENV>_USER_EMAIL` / `<ENV>_USER_PASS`, throws if missing).

**`interceptHelper.ts`** — `verifyPageTitle()` and `waitForSelector()` for UI tests, plus its own copy of `getUserCredentials()`. Yes, this is the same function as the one in `apiHelper.ts`, duplicated rather than shared — a small bit of debt worth cleaning up if you're touching either file, but harmless today since both copies do the same thing.

**`commonPattern.ts`** — `CorePattern`, a small class with `clickUserMenu()` / `clickHamburgerMenu()` helpers for apps that have a common navigation shell across pages. Not currently used by the ParaBank pages (their nav is simpler), but there if a future target app needs it.

**`fileReader.ts`** — `readJson(fileName)` loads a JSON file from `support/data/` (used to read the data files `DataFileGenerator` writes), and `loadCSV(filePath)` reads a CSV into an array of lines.

---

### `config/platform.json` — controls bulk generation

Covered in full under "Root-level files" above, including the real file shape and the fact that `suites` is currently empty in this repo. Quick reminder since we're walking through `config/` here: each entry inside `suites` is `{ name, page, outputFile }`, and `page` must match a filename in `pipeline/kb/pages/` (without `.json`) — e.g. `{ "name": "Login", "page": "parabank-login-page", "outputFile": "parabank-login.spec.ts" }`.

---

### `requirements/` — where your QA team's input actually lives

This one folder is arguably the real starting point of the whole framework, more than any code file. `requirements/requirements.xlsx` is the Excel sheet your QA team fills in with plain-English scenarios, and `npm run requirements:template` (via `scripts/create-requirements-template.ts`) is how you create a fresh one with the correct headers, dropdowns for the Priority column, example rows, and an "Instructions" tab baked in.

You already saw the exact column layout under `pipeline/readers/ExcelReader.ts` above, so I won't repeat it — just remember the two things worth remembering: column G (Test Cases) blank means "let AI handle this row," and column F (Priority) is currently just a label you fill in for your own reference, it doesn't drive `@smoke` tagging.

This file is 100% human-owned. Nothing in the pipeline overwrites Sheet 1 (the one you fill in) — the pipeline only ever appends a fresh "Generated Test Cases" Sheet 2 to the same file. If you delete a row from Sheet 1 and re-run, `ArtifactManifest` notices it's gone and cleans it out of its own cache too.

---

### `ai-metadata/` — the cache that remembers what's already been generated

This folder holds exactly one file, `artifacts.json`, written and read by `ArtifactManifest.ts` (covered in detail above). If you `cat` it right now on a fresh clone it's just `{}` — empty, because nothing has been generated yet. After you run `npm run ai:run` a few times, it fills up with content hashes for every requirement row and every page's KB/POM state.

Two things worth remembering: first, this is what makes re-running the Excel pipeline fast after small edits — don't delete this folder casually, you'll lose all your caching and the next run will regenerate everything from scratch (which isn't dangerous, just slow and uses more AI calls than necessary). Second — and this is the gotcha we already flagged — this folder is listed in `.gitignore`, so it stays local to your machine even though the code comment inside `ArtifactManifest.ts` describes it as something the team shares via git. `npm run project:reset` deletes this file deliberately as part of giving you a clean slate.

---

### `reports/` — all test output, organized by run

```
reports/
├── .current-run-id              ← which run is active
├── latest → 2026-07-08_15-49-07 ← symlink, always points to most recent run
├── 2026-07-08_15-49-07/
│   ├── playwright/
│   │   ├── index.html           ← Playwright HTML report
│   │   └── results.json         ← what ai:heal and ai:rootcause read
│   ├── allure/
│   │   └── results/             ← always empty — see the Allure gotcha above
│   └── ai-reports/
├── latest-ai-analysis/          ← written by ReportingService (currently unreachable — see below)
├── healing/
│   └── healing-report-*.{json,html} ← written by `npm run ai:heal`
└── analysis/
    ├── rootcause-report-*.{json,html}
    ├── flaky-report-*.{json,html}
    ├── coverage-report-*.{json,html}
    └── regression-report-*.{json,html}
```

Note the actual Allure data (what `ai:flaky` reads, and what `allure:generate` builds the HTML report from) lives at the project root in `allure-results/`, **not** under `reports/<runId>/allure/`. That top-level folder is outside `reports/` entirely and keeps accumulating across every run — see the Allure gotcha a few sections up for why.

The whole `reports/` folder is gitignored. `reports/latest/` is always there as a symlink so `npm run report:latest` always works — you never have to remember the run ID.

---

## The complete flow — from an Excel sheet to a final report

This is the section to use if someone asks "walk me through the whole thing, start to finish." This is the real `npm run ai:run` flow — the one most teams will actually use day to day — traced through every stage, telling you which command triggers it, which file does the work, what happens inside, what comes out, and where it lands.

**Stage 1 — You write requirements in Excel**

- **You do:** Open `requirements/requirements.xlsx` (or create one with `npm run requirements:template`) and fill rows: Page, URL, Feature, Scenario, Description, Priority, and leave Test Cases blank if you want AI to handle it.
- **Nothing runs yet.** This is pure human input. Nobody reviews or validates it until you actually run the pipeline.

**Stage 2 — The framework reads your Excel file**

- **Command:** `npm run ai:run` (wraps `scripts/run-pipeline.ts`, which does pre-flight checks — is the Excel file there, is your `.env` set up correctly — then hands off to `scripts/generate-from-excel.ts`)
- **File that does the work:** `pipeline/readers/ExcelReader.ts`
- **What happens inside:** `ExcelReader.read()` opens the `.xlsx` with the `exceljs` library, walks every row, skips rows with no `Page` or `Description`, and builds a `Requirement` object per valid row. It also builds a map of `pageKey → first URL seen` for the next stage.
- **Output:** An in-memory array of `Requirement[]`, plus counts (how many need AI, how many are manual, how many were skipped) printed straight to your terminal.
- **Where it's stored:** Nowhere yet — this is all in memory for this run.

**Stage 3 — Requirements are processed and grouped**

- **File:** Still `ExcelReader.ts`, method `groupByPage()`.
- **What happens:** All the individual rows get grouped by their `Page` value, because everything downstream (KB generation, POM generation, spec generation) works one page at a time, not one row at a time.
- **Output:** A `Map<pageKey, Requirement[]>`.

**Stage 4 — Knowledge Base generation happens**

- **File:** `pipeline/kb/KnowledgeBaseGenerator.ts`
- **What happens inside:** For every page key that doesn't already have a KB JSON file (or whose URL changed since the last run — `ArtifactManifest` tracks this), it launches a real headless Chromium browser via Playwright, opens the URL, waits for the page to hydrate, scrolls it to force lazy-loaded content to render, and extracts real selectors, labels, and messages from the live DOM. It then sends that DOM snapshot to the AI and asks it to structure it into a KB JSON shape.
- **Output:** A new file, `pipeline/kb/pages/<pageKey>.json` — the same KB format we walked through earlier in this document, with real selectors and messages.
- **Where it's stored:** `pipeline/kb/pages/`. If the KB already exists and the URL hasn't changed, this step is skipped entirely (you'll see `⏭ KB unchanged` in the terminal) — no browser launch, no AI call.

**Stage 5 — AI discovers extra test scenarios you didn't think to write**

This is the step most people don't know exists, and it's genuinely one of the more useful ones.

- **File:** `pipeline/generators/discovery/PageAnalyzer.ts` (pure DOM crawling, no AI) feeds `pipeline/generators/discovery/ScenarioInferenceEngine.ts` (the AI call).
- **What happens inside:** `PageAnalyzer` opens the same live page again with its own headless browser and extracts a richer structural summary than the KB generator does — every form field with its label and whether it's required, every button's visible text, every nav link, every validation message it can find. `ScenarioInferenceEngine` is then told: "here is everything already covered in the Excel sheet for this page — now suggest 5 to 8 *additional* scenarios grounded only in these real elements, don't invent fields that don't exist." This is exactly the same "constrain the input" philosophy as everywhere else in this framework.
- **Output:** A list of `{ scenario, description, priority }` objects — these get folded straight into the same `Requirement[]` list from Stage 2/3, marked `source: "ai-discovered"` so you can tell them apart from what your QA team actually typed.
- **Where it's stored:** Cached to `pipeline/kb/pages/<pageKey>-scenarios.json` so a re-run doesn't re-crawl the page and re-call the AI for scenarios it already found — it just reads this file back. Delete this file if you want fresh scenario discovery next run.

**Stage 6 — Page Object Model files get generated**

- **File:** `pipeline/generators/pom/POMGenerator.ts` (and `DataFileGenerator.ts` for the companion data file)
- **What happens inside:** For any page that doesn't have a POM yet (or whose KB changed since the POM was last built), this reads the KB's selectors, and — importantly — needs the eventual test case titles first, because the POM's method names have to match exactly what the generated spec file will call. That's why this runs after Stage 4 but the actual generated method *bodies* only make sense once you've also seen Stage 7 below; the ordering in code is POM-before-spec, but the naming contract flows the other way.
- **Output:** `support/pages/<pageName>.page.ts` and `support/data/<pageName>Data.json`.
- **Where it's stored:** `support/pages/` and `support/data/`. Once a POM file exists on disk, it is never silently overwritten again — you own it from that point on.

**Stage 7 — Test cases are generated (this is also where "AI analyzes requirements" really happens)**

- **File:** `pipeline/readers/RequirementExpander.ts`, which calls `pipeline/generators/test-cases/TestCaseGenerator.ts` underneath.
- **What happens inside:** For every requirement row marked `aiGenerate: true` (both the ones your QA team wrote and the ones AI discovered in Stage 5), `RequirementExpander` first checks `ArtifactManifest` — has this exact row's content been seen before, unchanged? If yes, it returns the cached test cases with **zero AI calls**. If it's new or edited, it calls `TestCaseGenerator`, which sends the description (plus only the relevant slice of the KB, fetched via `SelectorRetriever`) to the AI and asks for 6–8 test cases: positive, negative, validation, boundary, edge-case, security — each with an `id`, `title`, `type`, `priority`, `steps`, `expectedResult`, and exactly one `isSmoke: true` per requirement (enforced in code, covered earlier).
- **Output:** `TestCase[]` per requirement row.
- **Where it's stored:** Written to `reports/<runId>/generated/test-cases/requirements-test-cases.json` for this run's record, cached inside `ai-metadata/artifacts.json` for next run's cache-hit check, and also written back into `requirements.xlsx` itself as a new "Generated Test Cases" worksheet via `ExcelTestCaseWriter.ts` — so your QA lead can review every AI-generated test case without opening a single code file.

**Stage 8 — "Test data is prepared" — here's the honest answer**

If you're looking for a distinct "test data" JSON artifact in this flow the way `generate:all` produces one via `TestDataGenerator`, it isn't here — `generate-from-excel.ts` doesn't call `TestDataGenerator` at all. In the Excel-driven flow, test data isn't a separate file; it's baked directly into the POM's method bodies as literal values (the AI writing the POM in Stage 6 picks realistic values like `'john'` / `'demo'` / an SQL-injection string directly into the `fill()` calls). So "test data preparation" here happens as part of POM generation, not as its own stage — worth knowing so you don't go hunting for a `testData.json` that this particular flow never creates.

**Stage 9 — Playwright spec files are generated**

- **File:** `pipeline/generators/playwright/PlaywrightGenerator.ts`
- **What happens inside:** Exactly what we covered in detail earlier — for each test case, derive a method name from the title, write the steps as comments, emit one call into the POM. Test cases get batched (`SPEC_BATCH_SIZE`, default 20 per file) so a page with a lot of test cases doesn't produce one giant spec file or blow past a local model's context window.
- **Output:** `tests/UI/<pageKey>-excel.spec.ts` (or `-excel-1.spec.ts`, `-excel-2.spec.ts`, ... for multiple batches).
- **Where it's stored:** `tests/UI/`, with a copy archived to `reports/<runId>/generated/test-scripts/` for this run's record. A spec-level cache (`.llm-cache/spec-manifest.json`) skips regeneration entirely if the test cases for that page haven't changed since last time.

**Stage 10 — Fixtures, helpers, and utilities get used (not generated — used)**

This isn't really its own "step" so much as something that's already sitting there ready, from Stage 9 onward every generated spec depends on:
- `support/fixtures/visitFixture.ts` for `testDesktop` / `testMobile`
- `support/helper/loginHelper.ts`, `interceptHelper.ts`, `apiHelper.ts` for shared logic
- `support/utils/constants.ts` for the two viewport sizes

None of these get regenerated by the Excel flow — they're framework-level, already scaffolded by `ensureScaffoldFiles()` if they don't exist, and you maintain them by hand.

**Stage 11 — Tests are executed**

- **Command:** `npm test` (or `npm run test:qa`, `test:ui`, `test:smoke`, `test:regression`, `test:mobile`, etc.)
- **File:** Playwright itself, configured by `playwright.config.ts`, which calls `resolveRunContext()` to figure out which run folder to write into.
- **What happens inside:** Playwright launches real browsers (chromium/firefox/webkit per the `projects` array), runs every matching spec, and retries failed tests automatically in CI (`retries: 2`).
- **Output:** Pass/fail results per test.
- **Where it's stored:** `reports/<runId>/playwright/results.json` (and `index.html`, `junit.xml`).

**Stage 12 — Screenshots, videos, and traces get captured**

- **Configured in:** `playwright.config.ts` — `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, `trace: 'on-first-retry'`. Nothing is captured for passing tests, on purpose, to keep the reports folder small.
- **Where it's stored:** `reports/<runId>/test-artifacts/<test-name>-<browser>/` — you'll see files like `test-failed-1.png` and `error-context.md` in there. We hit this ourselves earlier while debugging a real failure: `reports/2026-07-08_15-49-07/test-artifacts/UI-parabank-transfer-...-webkit/test-failed-1.png` is a real example, not a made-up path.
- **How you actually look at it:** You don't usually go digging through that folder by hand — `npm run report:latest` opens the Playwright HTML report, and clicking a failed test shows you the screenshot and trace inline.

**Stage 13 — Allure reports get generated**

- **Command:** `npm run allure:generate` (or `allure:serve` to build and open in one go).
- **Where the raw data actually is:** This is the gotcha we covered earlier — Allure's raw results live in the top-level `allure-results/` folder at the project root, **not** inside `reports/<runId>/`, because `playwright.config.ts` hardcodes that output folder for the `allure-playwright` reporter. Every test run keeps appending to this one folder.
- **Output:** `allure-report/` (HTML report you open with `allure:open` or `allure:serve`).

**Stage 14 — AI analysis reports get generated**

This is a separate, optional stage you run *after* Stage 11, once you actually have some pass/fail data to analyze:

| Command | Extractor (reads raw data) | Analyzer (calls AI) | Writes |
|---|---|---|---|
| `npm run ai:flaky` | `FlakyTestExtractor.ts` ← `allure-results/` retry history | `FlakyTestAnalyzer.ts` | `reports/analysis/flaky-report-*.{json,html}` |
| `npm run ai:rootcause` | `RootCauseExtractor.ts` ← latest failed Allure results | `BugRootCauseAnalyzer.ts` | `reports/analysis/rootcause-report-*.{json,html}` |
| `npm run ai:coverage` | `CoverageExtractor.ts` ← `requirements/` + `tests/` folders | `CoverageAnalyzer.ts` | `reports/analysis/coverage-report-*.{json,html}` |
| `npm run ai:regression` | `RegressionExtractor.ts` ← `allure-results/` failures | `RegressionSelector.ts` (filtered against `test-catalog.json`) | `reports/analysis/regression-report-*.{json,html}` |
| `npm run ai:heal` | `FailureAnalyzer.ts` ← `reports/<runId>/playwright/results.json` | `SelfHealingLocatorEngine.ts` | patches `support/pages/*.page.ts` directly + `reports/healing/healing-report-*.{json,html}` |

(All four Extractor/Analyzer pairs live under `pipeline/analyzers/extractors/` and `pipeline/analyzers/<category>/` respectively — see the detailed writeup under `pipeline/analyzers/` earlier in this document for why they're split this way.)

**Stage 15 — Final reports are available for review**

Everything from Stages 11–14 lands under `reports/`, and `reports/latest/` always symlinks to the most recent run so you never have to hunt for a run ID. To recap where to look for what:
- Did the tests pass? → `npm run report:latest`
- Do I have a nice shareable HTML report with history? → `npm run allure:serve`
- Is anything flaky, and why? → `reports/analysis/flaky-report-*.html`
- What broke and why, in plain English? → `reports/analysis/rootcause-report-*.html`
- What's my requirement coverage? → `reports/analysis/coverage-report-*.html`
- Did anything get auto-healed? → `reports/healing/healing-report-*.html`

That's the whole loop, start to finish — one Excel sheet in, a fully executed, reported, and analyzed test suite out.

---

## The other flow — `generate:all`, driven by `config/platform.json`

This is the simpler, alternate path we already touched on. It skips Excel, scenario discovery, and the Artifact Manifest caching entirely, and drives everything off `config/platform.json`'s `suites` array instead. Useful for quick demos or when you don't want to maintain an Excel sheet, but it's a narrower flow than Stages 1–15 above. Here it is traced the same way:

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

## Code that exists in the repo but isn't wired up to anything

Every real codebase accumulates a few of these, and it's much better for me to just tell you about them than for you to burn an afternoon tracing an import that goes nowhere. As of today:

- **`pipeline/generators/action-model/AIActionModelGenerator.ts`, `RuleBasedActionModelGenerator.ts`, `pipeline/generators/assertions/AssertionGenerator.ts`, `pipeline/generators/playwright/PlaywrightRenderer.ts`** — the fine-grained "step → action model → rendered line" pipeline described in `docs/WALKTHROUGH.md`. Not called by the current `PlaywrightGenerator` or `POMGenerator`. Covered in detail earlier in this document.
- **`pipeline/execution/` (`ExecutionEngine.ts`, `ResultCollectionEngine.ts`, `TestResultStore.ts`) and `pipeline/execution/PipelineRunner.ts`** — a self-contained "run tests → collect failures → analyze → report" orchestrator with its own `runPipeline()` function. No `scripts/*.ts` file imports it and no npm script calls it. The actual `npm run ai:run` flow (`scripts/run-pipeline.ts`) does the equivalent job by shelling out to `generate-from-excel.ts` and `playwright test` directly, rather than going through this class-based runner.
- **`pipeline/reporting/ReportingService.ts`** — only ever called from the unused `PipelineRunner.ts` above, so it inherits the same "not currently reachable from any npm script" status.
- **`dotenv-flow` and `@faker-js/faker`** in `package.json` dependencies — installed, never imported.

None of this is broken — it's just dormant. If a future task is "wire up a single combined pipeline command" or "add faker-based test data," this is exactly the code you'd pick back up rather than write from scratch.

---

## What is auto-generated vs what you actually own

This is important to understand before you start making changes.

**Do not edit these manually — they get overwritten:**

- `tests/UI/*.spec.ts` — regenerated every time you run `generate:all` (any file) or `generate:from-excel`/`ai:run` (the `*-excel.spec.ts` ones specifically — though its own cache skips regenerating a page whose test cases haven't changed)
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

Say you want to point this at a completely different application. There are two ways to go from here — pick one, don't mix them for the same page:

**Option A — Excel-driven (recommended, this is what `ai:run` is built around):**

```bash
# 1. Set the URL in config/environments/development.env
#    BASE_URL=https://your-new-app.com

# 2. Create your requirements file (or copy the template)
npm run requirements:template

# 3. Fill in requirements/requirements.xlsx — Page, URL, Feature, Scenario,
#    Description. Leave Test Cases blank so AI generates them.

# 4. Run the full pipeline — this alone generates the KB, the POM, the data
#    file, discovers extra scenarios, generates test cases, and writes specs
npm run ai:run

# 5. Open each POM in support/pages/ and review/enrich the method bodies
```

That's it — you don't need to manually run `kb:generate` or `generate:pom` first in this path; `ai:run` (via `generate-from-excel.ts`) does both automatically for any page mentioned in your Excel sheet that doesn't have them yet.

**Option B — `config/platform.json`-driven (simpler for a quick one-off demo, no Excel involved):**

```bash
# 1. Set the URL in config/environments/development.env
#    BASE_URL=https://your-new-app.com

# 2. Generate Knowledge Bases (run once per page)
npm run kb:generate -- --url https://your-new-app.com/login
npm run kb:generate -- --url https://your-new-app.com/register

# 3. Open the generated JSON files, check selectors in browser DevTools, fix anything wrong

# 4. Add pages to config/platform.json's "suites" array

# 5. Generate POM skeletons
npm run generate:pom

# 6. Generate specs
npm run generate:all

# 7. Run the tests
npm run test:ui

# 8. Open each POM in support/pages/ and fill in the method bodies
```

To clean everything and start fresh: `npm run project:reset` — but heads up, if you're on Option B, check `config/platform.json` afterward before running `generate:all` again; there's a known bug where the reset writes a config shape `generate-all.ts` doesn't fully recognize (see the callout under `scripts/` above).

---

## Questions that usually come up

**"A selector broke after a UI update. Do I manually find and fix it?"**  
No. Run `npm run ai:heal`. It reads the test failures, finds the broken locators, heals them in the POM files automatically. Check the healing report it generates.

**"How do I add a new test for an existing page?"**  
Add a row in `requirements.xlsx` under the right page and feature. Fill in the Description like a user story. Run `npm run ai:run` (or `npm run generate:from-excel` if you just want the spec files without executing tests). **Not** `generate:all` — that one reads `config/platform.json`, not Excel, and won't see your new row at all. This mix-up is common enough that it's worth double-checking which command you're reaching for.

**"I filled in 'smoke' in the Priority column — why doesn't my test get the `@smoke` tag?"**  
Because that column isn't wired to tagging today — it's for your own reference only (it does get echoed into the generated "Sheet 2" as `Req. Priority`). The actual `@smoke` tag is decided entirely by AI per requirement, independent of what you type in that column — see the `isSmoke` writeup under `pipeline/readers/ExcelReader.ts` and `pipeline/models/`.

**"I re-ran `ai:run` on the same Excel file and nothing seems to have called the AI — is that a bug?"**  
No, that's the caching working correctly. `ArtifactManifest` (`ai-metadata/artifacts.json`) noticed none of your requirement rows, KBs, or POMs changed since last time, so it returned everything from cache instead of spending LLM calls. You'll see `⏭ unchanged` lines in the terminal output confirming this. Edit a row's Description, or delete `ai-metadata/artifacts.json`, to force fresh generation.

**"The AI calls are slow. How do I speed things up?"**  
`LLM_CACHE=true` should already be set — check your `.env`. The cache stores responses on disk so the same prompt never calls the LLM twice. If you cleared the cache recently, the first run will be slow but subsequent runs will be fast. Separately, if you're re-running the Excel flow, `ArtifactManifest` caching (above) is what skips already-generated requirements entirely — the two caches work at different levels and both matter for speed.

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
| Add a new test to an existing page | `requirements/requirements.xlsx` → `npm run ai:run` (not `generate:all`) |
| Add a whole new page to the framework | `kb:generate` → `generate:pom` → either add a row to `requirements.xlsx` or a suite to `config/platform.json` |
| Understand the spec file format | `pipeline/generators/playwright/PlaywrightGenerator.ts` |
| Change how test cases are generated | `pipeline/generators/test-cases/TestCaseGenerator.ts` |
| Understand the full Excel-to-report flow | "The complete flow — from an Excel sheet to a final report" section above |
| Force fresh AI generation instead of cached | Delete `ai-metadata/artifacts.json` (or the relevant row/page's entry in it) |
| Change viewport sizes | `support/utils/constants.ts` |
| Change the beforeEach navigation | `support/fixtures/visitFixture.ts` |
| Understand where reports go | `pipeline/reporting/RunContext.ts` |
| Understand the AI analysis reports (flaky/rootcause/coverage/regression) | `pipeline/analyzers/extractors/` (data) + `pipeline/analyzers/<category>/` (AI) |
| Add a new AI analyzer | `pipeline/analyzers/<category>/` + a matching file in `pipeline/analyzers/extractors/` |
| See every npm command | `package.json` → `scripts` section |

---

That is the whole framework. Every file has one job. Every module talks to the next through typed interfaces. The AI is always given real data, and its output is always validated before being used. Once you have understood one generator or one analyzer, you have understood the pattern — the other nine work the same way.
