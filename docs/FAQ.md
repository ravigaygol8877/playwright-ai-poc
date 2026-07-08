# Framework FAQ — Everything People Usually Ask

> Read this like someone is sitting across the table answering your questions one by one, not like a spec document. If you want deep technical detail with real code, real file paths, and every gotcha we've found — go to [`FRAMEWORK_OVERVIEW.md`](./FRAMEWORK_OVERVIEW.md), it's the full KT guide. This file is for when someone just has a question and wants a straight, honest answer without opening five files to find it.

This is the first document to share whenever someone — a new QA joining the team, a developer curious about it, a lead evaluating it, or an architect doing a review — has questions about this framework. Beginner questions and senior-level questions both live here, side by side, because in practice that's how these conversations actually go.

---

## Table of Contents

1. [Framework Overview](#1-framework-overview)
2. [Architecture Questions](#2-architecture-questions)
3. [End-to-End Flow Questions](#3-end-to-end-flow-questions)
4. [Excel Requirement → Automation Flow](#4-excel-requirement--automation-flow)
5. [Playwright Framework Questions](#5-playwright-framework-questions)
6. [AI Feature Questions](#6-ai-feature-questions)
7. [Self-Healing Questions](#7-self-healing-questions)
8. [Reporting Questions](#8-reporting-questions)
9. [Execution & Commands](#9-execution--commands)
10. [CI/CD Questions](#10-cicd-questions)
11. [Secrets & Environment Security](#11-secrets--environment-security)
12. [Real Team Questions](#12-real-team-questions)
13. [Advanced Architect Questions](#13-advanced-architect-questions)

---

## 1. Framework Overview

**What is this framework?**

It's a Playwright-based UI and API automation framework, but with an AI layer sitting on top of the usual test-writing work. So instead of a QA engineer sitting down and typing out every test case, every selector, and every assertion by hand, you write your requirement in plain English (or fill a row in an Excel sheet), and the framework uses AI to generate the test cases, the Page Object Model, and the final Playwright spec file for you. After tests run, it also has a set of AI modules that look at the results and tell you things like which tests are flaky, why something failed, what's not covered, and it can even fix a broken selector on its own.

**Why did we build this framework?**

Because the normal QA cycle is repetitive in a very specific, very time-consuming way. A developer finishes a feature, and then someone has to sit and think through every scenario — happy path, wrong input, empty fields, edge cases — write all of that as test cases, translate each one into Playwright code, come up with test data, and six months later when a developer renames one button, ten tests break and someone spends half a day just fixing selectors. None of that thinking work is actually hard, it's just slow and repetitive. We built this to take that repetitive part off your plate.

**What problem does this framework solve?**

Three problems, really: (1) writing test cases and automation code from scratch takes hours per feature, (2) UI changes silently break tests and somebody has to go hunting for what broke, and (3) after a test run, figuring out "is this a real bug or just a flaky test" or "what should I even test next" takes manual digging through logs. This framework speeds up all three — generation, healing, and analysis.

**How is it different from a normal Playwright framework?**

A normal Playwright framework gives you the structure — fixtures, POM pattern, config — but you still write every test case and every locator by hand. This framework has that same structure underneath (so if you've used Playwright before, none of it looks unfamiliar), but it adds an AI generation layer on top that writes the test cases and the Page Object Model for you, grounded in real data from your actual application (not the AI's guesses), plus a set of AI analysis modules that run after your tests to catch flaky tests, explain failures, and heal broken locators automatically.

**Can we use this framework for real projects?**

Yes, and that's actually the intent — this isn't a toy demo. The architecture (provider abstraction, KB-grounding, validated AI output, POM pattern) is production-grade. That said, be honest with yourself about where it stands today: this specific repo is wired up against one demo app (ParaBank), a couple of things are half-wired (see the CI/CD and Architect sections below), and any AI-generated code should still go through a quick human review before you trust it blindly — same as you'd review a junior engineer's PR.

**Can multiple teams use this framework?**

Yes, that's actually how it's designed to work — each team just needs its own Knowledge Base JSON files (one per page, containing their app's real selectors and URLs) and its own `requirements.xlsx`. The pipeline code itself (`pipeline/`, `scripts/`) doesn't change per team; only the KB and the requirements file are project-specific. So one shared framework, many teams' worth of KBs and requirements sitting on top of it.

**Is this framework project-specific or reusable?**

The core (`pipeline/`, `scripts/`, the fixture and POM pattern in `support/`) is fully reusable — none of it hardcodes ParaBank. What's project-specific is the Knowledge Base (`pipeline/kb/pages/*.json`) and the requirements Excel file. Point those at a new app and the rest of the machinery works the same way. `npm run project:reset` exists specifically to wipe out all the project-specific bits and hand you a clean slate.

**How scalable is this framework?**

On the test-writing side, it scales the same way normal Playwright does — thousands of tests, multiple browsers, sharded CI, no problem, because at the end of the day the output is just plain `.spec.ts` files. On the generation side, the batching logic (`SPEC_BATCH_SIZE`, default 20 test cases per spec file) exists specifically so a page with a lot of test cases doesn't produce one giant unmanageable file or blow past a model's context window. On the AI-analysis side, `AI-ANALYTICS.md` documents these modules comfortably handling 1000+ tests with pagination built in. The one thing that doesn't scale automatically is picking a strong LLM provider for production use — a local model or a free tier is great for demos but you'd want a properly provisioned provider for a large team hammering it daily.

---

## 2. Architecture Questions

**Why this folder structure?**

Because it mirrors the actual flow of information: `pipeline/` is the AI brain, `tests/` and `support/` are the actual Playwright body, `scripts/` are the doors you walk through to run anything, and `config/` + `requirements/` are what you as a human own and edit. Once you know that split, you can usually guess which folder a file lives in just from what it does.

**How is the framework designed?**

As a layered pipeline. Bottom layer is the LLM connection (`pipeline/providers/`) — the only place that talks to an actual AI model. Above that is the Knowledge Base (`pipeline/kb/`) — real data about your application, which exists specifically to stop the AI from hallucinating selectors. Above that are the generators and analyzers (`pipeline/generators/`, `pipeline/analyzers/`) — the actual intelligence. And on top are the scripts (`scripts/`) that wire it all together into an `npm run` command. Nobody skips a layer — a generator never calls an AI SDK directly, it always goes through the provider interface.

**Why did we use layered architecture?**

Mainly for one reason: so you can change one layer without breaking the others. Want to switch from Gemini to a local model? Change one line in `.env` — no generator or analyzer even notices. Want to fix a broken selector? Edit the KB JSON — no code change needed anywhere. Want to add a new AI capability? Drop a new file into `pipeline/analyzers/` following the same pattern as the other four — nothing else has to change. That's the whole point of the layering: isolate the parts that change often (selectors, providers) from the parts that don't (the pipeline logic).

**How does execution flow from one layer to another?**

Always through a typed interface, never by reaching into another layer's internals. A generator asks `LLMProvider.generateResponse(prompt)` — it has no idea if that's Gemini, GitHub Models, or a local model underneath. `TestCaseGenerator` returns `TestCase[]` — a clean array of objects — and `PlaywrightGenerator` just consumes that array, it doesn't know or care how those objects were produced. This is why "one module talks to the next through typed interfaces" is basically the one sentence that describes this whole codebase.

**How are responsibilities separated?**

Cleanly enough that you can usually explain any file's job in one sentence. AI never reads or writes files directly — a script does that and then hands data to the AI module. An AI module never decides file paths or formatting — that's the script's or the renderer's job. An "Extractor" (in `pipeline/analyzers/extractors/`) never calls the AI — it only reads raw data (Allure results, requirements folders) into a clean shape; the matching "Analyzer" then takes that clean shape and makes the one AI call. That extractor/analyzer split specifically exists so you can test the messy "read real-world data" part without ever touching the LLM.

**How easy is it to extend?**

Genuinely easy, and this is one of the framework's better qualities. Adding a new LLM provider is one new file implementing one method, plus one line in `ProviderFactory`. Adding a new AI analyzer means following the same Extractor + Analyzer pattern the other four already use. Adding a new page to test means one KB JSON file and a row in Excel — no code change. The one place it's *not* trivially easy is if you want a completely new kind of output (say, generating mobile-native tests instead of Playwright) — that would mean writing a new renderer, but even then the AI-generation layers above it wouldn't need to change.

---

## 3. End-to-End Flow Questions

**What happens when I run the framework?**

Depends which command, but the flagship one is `npm run ai:run`. That one reads your Excel requirements file, auto-generates any missing Knowledge Base files by crawling your live app, discovers a few extra test scenarios you might not have thought of, generates Page Object Models, generates test cases via AI, writes the Playwright spec files, runs them, and gives you a report at the end. One command, one sentence of setup (fill the Excel), a full test suite comes out.

**How does execution start?**

At the npm script level. `package.json`'s `scripts` section maps every command to a file in `scripts/`. For `ai:run`, that's `scripts/run-pipeline.ts`, which does a few sanity checks (is your Excel file there, is your `.env` set up) and then hands off to `scripts/generate-from-excel.ts`, which is where the real work happens.

**Which file runs first?**

For the Excel flow: `scripts/run-pipeline.ts` → `scripts/generate-from-excel.ts` → `pipeline/readers/ExcelReader.ts`. Every single script, no matter which one, calls `ensureScaffoldFiles()` (from `scripts/ensureScaffold.ts`) as its very first line — that's the function that makes sure `support/`, `tests/UI/`, etc. exist even on a totally fresh clone, so nothing crashes for lack of a folder.

**How does data move between different layers?**

As plain typed objects, passed in memory, not through files (except where we deliberately persist something for caching or review). Excel row → `Requirement` object → `TestCase[]` → into `PlaywrightGenerator` → a spec file string → written to disk. At no point does one layer serialize something to disk just so the next layer can read it back — the objects flow directly from function to function within a single script run.

**How does the framework go from requirement input to report generation?**

This is exactly what the "complete flow" section in `FRAMEWORK_OVERVIEW.md` walks through stage by stage — Excel gets read, Knowledge Bases get generated, extra scenarios get discovered, POMs get generated, test cases get generated by AI, Playwright specs get written, tests get executed, screenshots/videos/traces get captured on failure, and then Allure and the AI analyzers produce the final reports. Fifteen stages, one command. If you want the full detail with real file paths for each stage, that's the section to open.

**How can I debug the flow?**

A few practical habits: read the terminal output carefully — every step prints what it's doing and whether it hit cache or called the AI (`⏭ unchanged` means cache hit, no AI call). If generation seems to skip something, check `ai-metadata/artifacts.json` — that's the cache remembering what it already generated. If a test fails, `npm run report:latest` shows you the screenshot and trace inline. If you're not sure which command actually did what, `package.json`'s scripts section is the map — every command is a thin wrapper around one file in `scripts/`, so you can always go read that file directly to see exactly what ran.

---

## 4. Excel Requirement → Automation Flow

**How does Excel input work?**

You (or your QA team) open `requirements/requirements.xlsx` and fill in rows — one row per test scenario. Each row has a Page, a URL, a Feature, a Scenario name, a Description (this is the important one, this is what the AI reads), a Priority, and a Test Cases column. Run `npm run ai:run`, and the framework reads every row, generates whatever's needed, and writes the test files.

**What format should requirements follow?**

Seven columns, in this order: Page (the KB key, e.g. `parabank-login`), URL (only needs to be filled once per page), Feature, Scenario name, Description (write this like an actual acceptance criterion — "User should be able to log in with valid credentials and land on the account overview page" — not a vague one-liner), Priority (smoke or regression — heads up, this is currently just a label for your own reference, it doesn't drive the `@smoke` tag automatically), and Test Cases (leave blank to let AI handle it, or type your own steps if you want to skip AI for that row).

**Who updates this file?**

Your QA team, business analysts, or whoever owns the requirements — this is meant to be a completely non-technical, spreadsheet-level task. Nobody needs to touch code to add a new test; they just add a row.

**What happens after updating Excel?**

You run `npm run ai:run`. The framework reads the new row, checks if that page already has a Knowledge Base and POM (generates them if not), generates the test case(s) for that row via AI, writes them into the spec file, and — this surprises people the first time — writes the generated test cases back into the *same* Excel file as a new "Generated Test Cases" tab, so whoever wrote the requirement can review exactly what the AI produced without opening a single code file.

**How does AI understand requirements?**

By reading your Description text plus a filtered slice of the page's Knowledge Base — real selectors, real messages relevant to that specific requirement, not the whole KB dumped in. That's deliberate: it keeps the AI grounded in what's actually on the page instead of guessing, without wasting tokens on selectors that have nothing to do with this particular requirement.

**How are scenarios generated?**

There are two distinct sources, and this trips people up if they don't know it exists. First, the ones you wrote yourself in Excel. Second — and this is the part most people don't know about — the framework also crawls your live page and asks the AI to suggest 5–8 *additional* scenarios you might not have thought of, grounded strictly in the real form fields, buttons, and messages it found on the page. Those get cached to a `<page>-scenarios.json` file so it doesn't re-crawl and re-call the AI every single run.

**How are test cases generated?**

`TestCaseGenerator` takes a scenario's description and asks the AI for 6–8 test cases covering positive, negative, validation, boundary, edge-case, and security angles — each with an ID, a title, a type, a priority, steps, an expected result, and (this is one of ours — a genuinely automatic feature) exactly one of them per requirement gets marked as the smoke test, decided by AI, not by a human.

**How are Playwright scripts generated?**

Once test cases exist, `PlaywrightGenerator` takes each one, derives a method name from its title, writes the original steps as comments for readability, and emits one call into the matching Page Object Model method. The POM itself — the actual fills, clicks, and assertions — is written separately by `POMGenerator`, in a way where its method names are guaranteed to line up exactly with what the spec file will call.

---

## 5. Playwright Framework Questions

**Why Playwright?**

Cross-browser out of the box (chromium/firefox/webkit), built-in auto-waiting so you're not sprinkling `sleep()` everywhere, a genuinely good trace viewer for debugging failures, and first-class TypeScript support — which matters a lot here because the whole framework is written in strict TypeScript and the generated code needs to type-check cleanly too.

**How is POM implemented?**

One class per page, in `support/pages/<pageName>.page.ts`. Locators are `private readonly` properties built in the constructor straight from the Knowledge Base's selector strings. And here's the specific convention this codebase uses that's a little different from textbook POM: each method does the *action and the assertion together* — `successfulLoginWithValidCredentials()` fills the fields, clicks login, and checks the result all in one method. There's no separate "do it" method and "verify it" method.

**Where are locators stored?**

Two places, and they should always agree. The real source of truth is the Knowledge Base JSON (`pipeline/kb/pages/<page>.json`), and the POM's constructor builds `Locator` objects straight from those selector strings when it's generated. If a selector breaks, you're supposed to fix it in the KB and regenerate (or use `npm run ai:heal`) rather than hand-patching the POM and letting the two drift apart.

**Where are assertions handled?**

Inside the POM method itself, right after the action, using Playwright's own `expect()` — nothing custom. There's no separate "assertion layer" in the live pipeline (an earlier design had one, `AssertionGenerator.ts`, but it's not wired in anymore — see the Architect section below for why that matters).

**Where should new tests be added?**

You don't add them directly as code, normally — you add a row to `requirements/requirements.xlsx` and run `npm run ai:run`, and the spec file gets the new test case added automatically. If you genuinely want to hand-write a Playwright test without going through AI at all, nothing stops you — just follow the same `testDesktop`/`testMobile` pattern the generated files use, so it stays consistent.

**How are fixtures used?**

`support/fixtures/visitFixture.ts` exports `testDesktop` and `testMobile` — both are Playwright's `test` extended so that `page` comes pre-configured with the right viewport and already navigated to `BASE_URL` before your test body even starts. Every generated spec imports one of these instead of the plain `test` from `@playwright/test`.

**How is test data managed?**

Honestly, it depends which generation path you use, and it's worth knowing the difference. In the `config/platform.json`-driven flow, `TestDataGenerator` produces a separate data JSON, though it's not actually imported into the spec file. In the real day-to-day Excel flow, there's no separate test-data file at all — the AI bakes realistic values (valid/invalid usernames, SQL-injection strings, boundary values) directly into the POM method bodies as literals when it writes the POM.

**How are utilities organized?**

`support/helper/` has the shared, mostly-generic stuff — login helpers, API config helpers, a file reader. `support/utils/constants.ts` has just the viewport sizes. `pipeline/utils/` is a different thing entirely — that's pipeline-internal utilities (JSON parsing, concurrency control, the artifact cache), not test-runtime utilities.

**How do we support multiple environments?**

Through `config/environments/<name>.env` — one file per environment (development, qa, uat, production), each with its own `BASE_URL` and credentials. You pick one with `ENVIRONMENT=qa npm run test:ui` or one of the pre-wired shortcuts like `npm run test:qa`. `playwright.config.ts` loads the right file automatically based on that variable.

---

## 6. AI Feature Questions

**How does AI integrate with this framework?**

Through exactly one interface, `LLMProvider`, with exactly one method: `generateResponse(prompt): Promise<string>`. Every single AI module in the framework — generators and analyzers alike — depends only on that interface, never on a specific AI SDK. That's what makes provider-switching a one-line `.env` change instead of a code change.

**Which AI providers are supported?**

Google Gemini, GitHub Models, OpenRouter (a gateway to GPT/Claude/many others), and LM Studio for running a fully local model with zero API cost. There's also a `fallback` mode that chains several of these together.

**How does provider switching work?**

You set `LLM_PROVIDER` in `.env` to whichever one you want — `ProviderFactory.create()` reads that and hands back the right implementation. Nothing else in the codebase changes; no generator or analyzer knows or cares which provider is actually running underneath.

**What happens if one AI provider fails?**

If you're running `LLM_PROVIDER=fallback`, the `FallbackProvider` tries providers in order from your configured `FALLBACK_CHAIN` (default: lm-studio, gemini, openrouter, github-models), and if one fails or times out, it silently moves to the next one and keeps going — no manual `.env` change needed mid-run. Providers whose API keys aren't set are automatically skipped rather than causing a hard failure.

**How does caching work?**

Two separate caches, at two different levels, and it's worth knowing both exist. `CachingLLMProvider` wraps whichever provider you're using and caches every raw LLM response to disk (`.llm-cache/`), keyed by a hash of the prompt — same prompt twice, second time is instant and free. Separately, `ArtifactManifest` (`ai-metadata/artifacts.json`) caches at a much coarser level — it remembers whether a requirement row, a KB, or a POM has changed at all, so an unchanged row skips generation entirely without even constructing a new prompt.

**How do we reduce token usage?**

A few things already built in: `SelectorRetriever` only pulls the KB selectors actually relevant to a given requirement instead of dumping the whole KB into every prompt. The two caches above mean unchanged content never triggers a fresh call at all. And the AI-analysis commands (flaky/rootcause/coverage/regression) do all their raw data reading in plain code via Extractor classes — zero tokens — and only spend tokens on the actual judgment call.

Here's the roster of every AI-driven module, in one place:

| Module | What it does |
|---|---|
| **Test Case Generator** | `TestCaseGenerator.ts` — requirement description → 6–8 structured test cases |
| **Test Data Generator** | `TestDataGenerator.ts` — requirement → valid/invalid field values (used in the `config/platform.json` flow) |
| **Requirement Analyzer / Expander** | `RequirementExpander.ts` — orchestrates calling `TestCaseGenerator` per Excel row, with caching |
| **Scenario Generator** | `ScenarioInferenceEngine.ts` (+ `PageAnalyzer.ts` for the DOM crawl) — discovers extra scenarios from the live page |
| **Script Generator** | `PlaywrightGenerator.ts` + `POMGenerator.ts` — test cases → spec file + Page Object Model |
| **Self-Healing** | `SelfHealingLocatorEngine.ts` (+ the rest of the healing pipeline) — broken locator → healed selector |
| **Flaky Test Analyzer** | `FlakyTestExtractor.ts` + `FlakyTestAnalyzer.ts` — retry history → flakiness score |
| **Root Cause Analyzer** | `RootCauseExtractor.ts` + `BugRootCauseAnalyzer.ts` — failure → plain-English diagnosis |
| **Regression Selector** | `RegressionExtractor.ts` + `RegressionSelector.ts` — recent failures → which suites to re-run |
| **Coverage Analyzer** | `CoverageExtractor.ts` + `CoverageAnalyzer.ts` — requirements vs tests → gap report |

---

## 7. Self-Healing Questions

**How does self-healing work?**

When a test fails because of a broken locator, `npm run ai:heal` reads the last run's failures, figures out which ones are actually locator problems (as opposed to timeouts or real assertion failures), looks up the Knowledge Base for that page, and asks the AI to find the best matching replacement selector — along with a confidence score. If confidence is high enough, it patches the POM file directly.

**Can it fix all failures?**

No, and it's not supposed to. It only targets locator-type failures — a selector that no longer matches anything on the page. A genuine assertion failure (the app now redirects somewhere different, say) or a timeout from a slow network isn't something self-healing tries to auto-fix; those get flagged for you to look at, not silently patched.

**When does AI get triggered?**

Only after the classification step decides a specific failure looks like a locator issue. Everything else — deciding which POM file to touch, applying the patch, caching the result — is plain code, not AI. So the AI is used narrowly, only where actual judgment ("which selector best matches the KB") is needed.

**How does locator healing work?**

`SelfHealingLocatorEngine` sends the broken selector plus the full Knowledge Base for that page to the AI, with a strict instruction: only suggest a selector that's actually in the KB, don't invent one. The AI comes back with a healed selector, a confidence score, and a short reasoning string. Above a confidence threshold, it gets applied automatically; below it, it's flagged for manual review instead of being silently trusted.

**What gets stored in cache?**

`HealingCache` remembers "this exact broken locator on this exact page was healed to this selector" — so if the same thing breaks again later, healing is instant and doesn't spend another AI call re-deriving the same answer.

**How do we avoid repeated AI calls?**

That healing cache above is the main mechanism specific to self-healing. More generally across the whole framework, the disk-level `CachingLLMProvider` cache and the `ArtifactManifest` content-hash cache both work the same way everywhere — don't call the AI again for something it's already answered and nothing has changed.

**What still requires manual review?**

Anything below the confidence threshold gets flagged, not auto-applied — that's a manual call. And more broadly, even successful auto-heals are worth a quick glance before you fully trust them in a critical flow (login, payment) — the AI is grounded in real KB data, but "grounded" doesn't mean "never wrong," and a quick human check costs you seconds compared to the manual selector hunt this replaces.

---

## 8. Reporting Questions

**How does Allure reporting work?**

`playwright.config.ts` has the `allure-playwright` reporter wired in, and every test run appends its results to a top-level `allure-results/` folder (not per-run — this one folder accumulates across every run). `npm run allure:generate` turns that into an HTML report, `allure:serve` builds and opens it in one step.

**What details are available in reports?**

Test names with full tags (`@regression`, `@smoke`, `@mobile`), pass/fail status, duration, retry history, and for failures — the error message, a screenshot, and (on retry) a trace. The Playwright HTML report (`npm run report:latest`) shows all of this per test, clickable.

**How are screenshots attached?**

`playwright.config.ts` sets `screenshot: 'only-on-failure'` — nothing is captured for a passing test, on purpose, to keep the reports folder from ballooning. On failure, it lands in `reports/<runId>/test-artifacts/<test-name>-<browser>/test-failed-1.png`, and the HTML report shows it inline when you click that test.

**How are videos attached?**

Same idea, `video: 'retain-on-failure'` — a video only survives if the test actually failed, sitting in that same `test-artifacts` folder next to the screenshot.

**How does trace viewer work?**

`trace: 'on-first-retry'` — a trace only gets recorded starting from a test's first retry, not every run. Open it either through the HTML report (click the test, click "trace") or with `npx playwright show-trace <path>` directly — it gives you a full timeline replay of exactly what the browser did, DOM snapshots included.

**How does history/trend work?**

Honestly — it doesn't, today, and it's worth being upfront about that rather than letting you discover it later. Allure supports trend graphs across runs, but that needs the previous report's `history/` folder copied back in before regenerating, and nothing in this project does that; `npm run clean:allure` actually wipes `allure-results/` and `allure-report/` clean each time. If you need trend graphs, that's additional wiring someone would need to add, not a bug in what exists.

**How can reports be shared?**

The Playwright HTML report and the Allure report are both static HTML you can zip up and send, or host on any static file server / CI artifact storage. `.github/workflows/playwright.yml` already uploads the Playwright report as a CI artifact with `actions/upload-artifact`, downloadable straight from the GitHub Actions run.

**How are failures analyzed?**

Two ways. Immediately, by hand, via the HTML report's screenshot/trace. And separately, by AI — `npm run ai:rootcause` reads the latest run's failures and gives you a plain-English diagnosis (failure type, probable cause, impacted component, a specific fix) for each one, with a confidence score attached.

---

## 9. Execution & Commands

**How do I run tests?**

`npm test` runs everything in `tests/UI` and `tests/API` against the QA environment. For something narrower: `npm run test:ui` (a specific UI spec), `npm run test:smoke`, `npm run test:regression`, `npm run test:mobile`, or environment-specific ones like `npm run test:qa` / `test:uat` / `test:prod`.

**How do I run smoke/regression?**

`npm run test:smoke` and `npm run test:regression` — both grep by tag (`@smoke` / `@regression`) and both are wired to `ENVIRONMENT=qa` so they actually have valid credentials to log in with. The `@smoke` tag itself is fully AI-decided, one per requirement — see the AI Feature and Excel sections above.

**How do I execute environment-specific tests?**

Set `ENVIRONMENT` — either via one of the pre-built scripts (`npm run test:qa`, `test:uat`, `test:prod`) or manually: `ENVIRONMENT=uat npx playwright test`. `playwright.config.ts` loads the matching `config/environments/<name>.env` file automatically based on that variable.

**What does each npm command do?**

Genuinely, the most reliable answer is: open `package.json` and read the `scripts` section — every command is a one-line wrapper around a file in `scripts/`, so the command name usually tells you exactly what it does. `docs/COMMANDS.md` also has a fuller reference if you want it laid out with examples.

**Which command should new users start with?**

`npm run ai:run` — that's the one command that does everything, from reading the pre-filled example `requirements.xlsx` (already set up against a free public demo banking site) through to opening a report at the end. `docs/GETTING-STARTED.md` walks through this in about 10 minutes including setup.

**What happens internally when commands execute?**

Depends on the command, but they all follow the same shape: `ensureScaffoldFiles()` runs first (guarantee the support folders exist), then the command's specific logic runs (generation, execution, or analysis), and results get written somewhere predictable under `reports/` or directly into `tests/UI/` / `support/pages/`. The "End-to-End Flow" and "Excel Requirement" sections above go through this in more detail per command.

---

## 10. CI/CD Questions

**How can this run in pipelines?**

There's already a working GitHub Actions workflow at `.github/workflows/playwright.yml`, and it's a genuinely useful example to look at directly rather than take my word for it. It runs on every push and PR to `main`/`master`, with four jobs: TypeScript typecheck, ESLint, unit tests (`npm run test:unit`, no real AI calls — these use `MockLLMProvider`), and a smoke-test job on Chromium that greps `@smoke`.

**How are reports generated in CI?**

The smoke job uploads the Playwright HTML report (`playwright-report/`) as a build artifact via `actions/upload-artifact`, kept for 7 days, downloadable from the Actions run page. That's the only report currently wired into CI — Allure and the AI-analysis reports aren't part of this workflow today.

**How are secrets handled?**

Here's something worth knowing plainly: today's CI workflow doesn't call any real AI provider at all — typecheck, lint, and unit tests don't touch an LLM (mocked), and the smoke job only *executes* already-generated tests, it doesn't generate anything. So there are currently no LLM API keys configured as CI secrets, because nothing in this pipeline needs one yet. If you wired AI generation into CI later, you'd add the provider's key (e.g. `GOOGLE_API_KEY`) as a GitHub Actions repository secret and reference it as an `env:` var in the workflow, the same way `BASE_URL` is passed today.

**How are environments selected?**

In the current workflow, the smoke job hardcodes `BASE_URL: https://automationexercise.com` directly as a step-level environment variable — and this is a real thing worth flagging, not glossed over: that URL doesn't match ParaBank, which is what every KB file, POM, and generated test in this repo is actually built against (`config/environments/*.env` all point at `parabank.parasoft.com`). So as it stands, that CI smoke job is very likely pointed at the wrong site and would fail against real selectors. If you're picking this up, the fix is simple — set `ENVIRONMENT: qa` in that step instead (or point `BASE_URL` at the right app) so it loads the same config your local `test:smoke` uses.

**How does scheduled execution work?**

It doesn't exist yet in this repo — the current workflow only triggers on `push` and `pull_request`, there's no `schedule:` cron trigger. Adding a nightly regression run would just mean adding a `schedule` block to the workflow YAML and pointing it at `npm run test:regression` or similar; that's a small addition, not a redesign.

---

## 11. Secrets & Environment Security

**Why are environment files encrypted?**

They're not — and this is worth being completely upfront about, because it's a fair question to ask during a security review. This framework does **not** use GPG, Vault, SOPS, or any encrypted-secrets mechanism. Real credentials live in plain-text `.env` (for LLM provider keys) and are read as plain environment variables. If you came in expecting a GPG-based decrypt step somewhere in the pipeline, it isn't there.

**How does encryption work?**

There isn't one to explain — see above. What actually protects secrets today is simpler: `.env` and `.env.*` are listed in `.gitignore`, so real keys never get committed, and `config/environments/*.env` (which *are* committed) intentionally hold no real secrets — just `BASE_URL` and, where needed, credential variable names left blank for you to fill locally, plus non-sensitive QA demo credentials for the public ParaBank test site.

**How does decryption work?**

Same answer — nothing to decrypt. `dotenv` just reads the plain-text file into `process.env` at startup, nothing more.

**What should new developers do after cloning?**

Copy `.env.example` to `.env` and fill in your own LLM provider key (Gemini's free tier is the easiest to start with) — `docs/GETTING-STARTED.md` walks through this in about two minutes. Never commit the resulting `.env` file (it's gitignored by default, so this should happen automatically, but it's still worth knowing).

**How do we add new secrets?**

Add the variable to `.env.example` with a placeholder value (so the next person knows it exists and roughly what it should look like), then set the real value in your own local `.env`. If it's something environment-specific rather than provider-specific (like a new app's HTTP basic-auth credentials), it goes in `config/environments/<env>.env` instead, left blank in the committed file and filled locally or via your CI's secret store. If your organization needs actual encrypted-secrets handling — GPG, Vault, or otherwise — that would be new infrastructure to design and add; it's a legitimate gap today, not a hidden feature.

---

## 12. Real Team Questions

**How much manual effort does this reduce?**

The mechanical, repetitive part — typing out test cases, translating each step into Playwright code, hunting for a broken selector after a UI change — that's what gets absorbed by the AI. The judgment part — deciding what actually needs testing, reviewing whether the generated test cases make sense, deciding if an edge case genuinely matters for this business — still needs a human. Think of it as removing the typing, not the thinking.

**Does AI write everything automatically?**

No, and it shouldn't be trusted to. AI generates the first draft — test cases, POM methods, healed selectors — but every one of those is meant to be reviewed, same as you'd review a colleague's PR. The framework goes out of its way to constrain what the AI can invent (it can only reference selectors that actually exist in your Knowledge Base, for instance) precisely because "write everything with zero review" is not the goal here.

**Do we still need automation engineers?**

Yes, just doing different work. Instead of typing out every selector and every fill/click by hand, an automation engineer here is reviewing AI-generated POMs, deciding which requirements actually deserve test coverage, tuning the Knowledge Base for accuracy, and handling the cases the AI genuinely can't — a payment gateway redirect flow, a multi-step wizard with complex conditional logic, that sort of thing. The skill shifts from "typing" to "reviewing and architecting," which, honestly, is a more interesting job.

**How much time does generation take?**

From `docs/GETTING-STARTED.md`, running the whole pipeline cold (no cache) takes roughly 12–18 minutes depending on your provider and network — that's crawling live pages, calling the AI repeatedly, generating everything from scratch. Once the caches are warm, a repeat run comes back in about 2–4 minutes, because unchanged requirements, KBs, and POMs are served straight from cache with zero AI calls.

**How much token usage happens?**

For the AI-analysis commands specifically, `docs/AI-ANALYTICS.md` has real numbers: roughly 100–200 tokens per analyzed item, 500–1000 tokens for a typical full run, and caching cuts repeat-analysis cost by 70%+. For the generation side (test cases, POMs, scenario discovery), it depends heavily on your KB size and how many test cases you're generating per page — but the same caching principle applies: nothing gets regenerated (and no tokens get spent) for content that hasn't changed since last run.

**What happens when UI changes?**

If a selector changes, tests fail with a locator error, and `npm run ai:heal` can very likely fix it automatically by matching against the Knowledge Base — no manual selector hunting. If the change is bigger than a selector (a whole new flow, a redesigned page), you'd re-run `npm run kb:generate` to refresh the Knowledge Base and let the pipeline pick up the new structure from there.

**Can we trust AI-generated tests?**

Trust them the way you'd trust a solid first draft, not the way you'd trust a senior engineer's finished, reviewed code. The framework does real work to keep the AI honest — it's only ever allowed to reference selectors and messages that genuinely exist in the Knowledge Base, and several places validate the AI's output in code afterward (confidence scores checked, suite names checked against a real catalog, exactly-one-smoke-test enforced) rather than blindly accepting whatever comes back. But "constrained" isn't the same as "infallible" — a quick human review before merging generated tests is still the right habit.

**How do we maintain quality?**

A few concrete habits, not just a general principle: review generated POMs and test cases before merging (they're normal git-tracked files, review them like any other PR). Keep the Knowledge Base accurate — it's the single point that grounds everything downstream, so a wrong selector there propagates everywhere. Run `npm run ai:heal:dry` to preview healing before letting it auto-patch anything. And keep an eye on the flaky-test and coverage reports periodically rather than only looking at them when something's already gone wrong.

**How do we onboard a new project?**

Two ways, both covered in detail in `FRAMEWORK_OVERVIEW.md`'s "Onboarding a new application" section — the short version: set your new app's `BASE_URL`, either fill in `requirements/requirements.xlsx` and run `npm run ai:run` (recommended, does everything automatically), or manually run `kb:generate` → `generate:pom` → add suites to `config/platform.json` → `generate:all` if you'd rather skip Excel for a quick one-off. Either way, you're not touching `pipeline/` or `scripts/` at all — just your project's own KB and requirements.

---

## 13. Advanced Architect Questions

**Why did we choose this design?**

The two ideas that drive every other decision are: never let the AI invent facts about the application (hence the Knowledge Base and the "constrain input" discipline throughout every prompt), and never blindly trust what comes back from the AI (hence the validation — confidence-score checks, output filtered against real catalogs, `enforceExactlyOneSmoke()` correcting the AI's count if it gets it wrong). Everything else — the provider abstraction, the layered folders, the Extractor/Analyzer split — exists in service of keeping those two rules easy to follow consistently.

**How does it scale for thousands of tests?**

Structurally fine, because the actual output is plain Playwright spec files — Playwright itself scales to thousands of tests the normal way (sharding, parallel workers, multiple browsers). On the generation side, `SPEC_BATCH_SIZE` caps how many test cases go into one spec file so generation doesn't produce one unmanageable file or overload a local model's context window. On the analysis side, the Extractor classes already cap how many recent Allure results they process (the last ~50–100) rather than reading unbounded history.

**How do we avoid duplicate code?**

Mostly successfully, with two known exceptions worth naming honestly rather than hiding: `getUserCredentials()` is duplicated between `apiHelper.ts` and `interceptHelper.ts` (identical logic, two copies), and `KnowledgeBaseGenerator` and `PageAnalyzer` both independently launch their own headless browser to crawl a page rather than sharing one crawler. Neither causes a bug today, both are legitimate small refactors if someone wants to tidy the codebase further.

**How do we maintain generated code?**

The framework draws a clear, deliberate line: spec files (`tests/UI/*.spec.ts`) are meant to be freely regenerated — don't hand-edit them, your edits will be lost next generation. Page Object Models are the opposite — generated exactly once, and from that point on they're yours to enrich, they're never silently overwritten. That split exists specifically so you don't lose real engineering work (POM logic you've hand-tuned) to a regeneration, while still letting the test-case layer stay fully AI-refreshable.

**How do we control AI output quality?**

Layered defenses, not one single check: the prompt itself constrains what's allowed (only real KB selectors, only specific allowed field values, exact method-name lists for POM generation); explicit business rules are spelled out in the prompt (priority-assignment rules, exactly-one-smoke-test rule); and after the response comes back, code re-validates it — confidence scores checked against a 0–100 range, hallucinated suite names filtered against `test-catalog.json`, the smoke-test count corrected if the AI got it wrong. If the AI's response fails validation, the code throws rather than silently accepting a bad result.

**How do we review AI-generated tests?**

Same as reviewing any other code change — they're plain git-tracked `.ts` files, open in a normal diff. What's specifically worth checking: does the generated POM method's assertion actually verify the right thing (not just "did the button get clicked"), are the test data values realistic for your business rules, and does the AI's chosen smoke test genuinely represent the fastest, most critical path (it usually does, but it's a one-glance check, not blind trust).

**How do we handle framework upgrades?**

Because the layering is strict (generators never touch the AI SDK directly, always through `LLMProvider`), upgrading a provider's SDK version only touches that one provider file. Because generated output (spec files, POMs) is plain readable TypeScript rather than some opaque binary format, upgrading Playwright itself is a normal Playwright upgrade — nothing framework-specific complicates it. The pipeline logic itself (`pipeline/`, `scripts/`) is the part you'd version and upgrade like any other internal library.

**What are current limitations?**

Worth being direct about these rather than glossing over them, since a good architect review will find them anyway: the fine-grained Action-Model/Renderer/Assertion-Generator pipeline described in some older docs isn't actually wired into the live code anymore (the current `PlaywrightGenerator` is simpler than that — see `FRAMEWORK_OVERVIEW.md` for the full story); `config/platform.json`'s reset template writes a field name (`testOutputPath`) that doesn't match what `generate-all.ts` actually expects, which will crash if you don't catch it; the CI workflow's smoke job currently points at the wrong demo site; Allure trend/history graphs aren't wired up; and there's no GPG/Vault-style encrypted-secrets story if your organization needs one. None of these are hard to fix, but they're real, and worth knowing about rather than discovering mid-demo.

**What future improvements are possible?**

A few natural next steps, in rough order of effort: fix the CI smoke job's target URL (quick), wire the AI-generation steps into a scheduled/nightly CI run with proper provider secrets, decide whether to delete or properly re-wire the orphaned Action-Model/Renderer/Assertion-Generator files, add Allure history so trend graphs actually work, and if there's real appetite for API test generation, extend the same POM-generation pattern to a request-based "API Object Model" instead of a page object — the AI-generation layers underneath wouldn't need to change at all for that.

---

## Where to go next

- Full technical KT walkthrough, file by file, with real code: [`FRAMEWORK_OVERVIEW.md`](./FRAMEWORK_OVERVIEW.md)
- First-time setup, 10-minute quickstart: [`GETTING-STARTED.md`](./GETTING-STARTED.md)
- Every npm command with examples: [`COMMANDS.md`](./COMMANDS.md)
- Deeper detail on the AI-analysis commands specifically: [`AI-ANALYTICS.md`](./AI-ANALYTICS.md)

If a question comes up that isn't answered here, the honest next step is usually to just go read the one file responsible for it — this framework is small enough, and consistent enough in its patterns, that once you've read two or three modules the rest genuinely do explain themselves.
