# Adding a New Target Application

A step-by-step guide for onboarding the framework to test a new web application. By the end you'll have a knowledge base, a Page Object Model, and AI-generated specs running against your app.

---

## Overview

The framework is parameterised per page, not per project. Each page of your app gets:

1. A **knowledge-base JSON** (`pipeline/kb/pages/<page-name>.json`) — selectors, URLs, messages
2. A **Page Object Model** (`support/pages/<pageName>.page.ts`) — typed wrappers around those selectors
3. A **requirements row** in `requirements/requirements.xlsx` — what to test
4. **Generated spec files** (`tests/UI/<page-name>-*.spec.ts`) — the actual Playwright tests

---

## Step 1 — Generate the Knowledge Base

Run the KB generator against your page's live URL:

```bash
npm run kb:generate <url> <page-name>
```

For example:
```bash
npm run kb:generate https://myapp.com/login myapp-login
```

The generator will:
1. Open the URL in a headless browser
2. Extract all interactive elements (inputs, buttons, links, forms)
3. Use AI to assign meaningful selector keys
4. Write `pipeline/kb/pages/myapp-login.json`

**Review the output.** The AI is good but not perfect. Open the JSON and:
- Remove selectors for elements that aren't relevant to testing
- Fix any CSS selectors that look fragile (prefer `data-testid` over positional selectors)
- Add a `"messages"` block with the exact error/success text your app shows
- Add a `"success"` block if there's a post-action redirect or landmark text

---

## Step 2 — Generate the Page Object Model

```bash
npm run generate:pom
```

This reads `pipeline/kb/pages/myapp-login.json` and produces `support/pages/myappLoginPage.page.ts` with:
- A constructor taking `page: Page`
- One getter per selector key
- A `goto()` method

Review the generated file and add any custom helper methods your tests will need.

---

## Step 3 — Fixture Registration (automatic)

The fixture is registered automatically when you run `npm run generate:pom`. The `FixtureUpdater` reads `pipeline/kb/pages/` and updates `tests/fixtures/base.ts` to import and expose each new POM — no manual edits needed.

If you need to run it standalone:

```bash
npm run generate:pom
```

---

## Step 4 — Add Requirements

Open `requirements/requirements.xlsx` and add a new row for each scenario you want to test. The required columns are:

| Column | Example |
|---|---|
| Page | `myapp-login` |
| Feature | `Login` |
| Scenario | `Valid credentials` |
| Description | `User should be able to log in with a valid email and password. Invalid credentials should show an error. Empty fields should be validated.` |

The **Description** column is the most important — write it as you would a user story. The richer and more specific it is, the better the AI-generated test cases will be.

---

## Step 5 — Run the Pipeline

```bash
npm run ai:run
```

The pipeline will:
1. Pick up your new requirements row
2. Call your KB JSON for selectors
3. Generate 4–10 test cases per scenario
4. Write spec files to `tests/UI/`
5. Execute them and report

---

## Step 6 — Review and Tune

Generated specs are a starting point, not the final word. After the first run:

- Open the spec files and check that selector names resolve correctly
- Add `@smoke` tags to the 2–3 most important tests per page
- Add `@regression` tags to everything that should run on every PR
- If a test flaps, run `npm run demo:healing` to let the AI suggest a more stable selector

---

## Knowledge Base JSON Schema

```json
{
  "pageName": "My App Login",
  "url": "https://myapp.com/login",
  "selectors": {
    "emailInput": "#email",
    "passwordInput": "#password",
    "loginButton": "button[type='submit']",
    "errorMessage": ".error-alert"
  },
  "messages": {
    "invalidCredentials": "Invalid email or password",
    "emailRequired": "Email is required"
  },
  "success": {
    "redirectUrl": "/dashboard",
    "landmarkText": "Welcome back"
  },
  "notes": "The login form uses client-side validation before the API call."
}
```

**Fields:**
- `pageName` — human-readable name used in `describe()` blocks
- `url` — the full URL of the page
- `selectors` — camelCase key → CSS/Playwright selector
- `messages` _(optional)_ — key → exact text the app displays (used verbatim in assertions)
- `success` _(optional)_ — `redirectUrl` and/or `landmarkText` shown after success
- `notes` _(optional)_ — free text injected into prompts as context
- `describeName` _(optional)_ — overrides `pageName` in `describe()` blocks
- `skipGoto` _(optional, boolean)_ — set `true` if the test fixture already navigates
- `beforeEachPrefix` _(optional, string[])_ — lines to inject before `page.goto()` in `beforeEach`

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| KB generator produces weak selectors | Edit the JSON manually. Prefer `[data-testid="..."]` or `[name="..."]` over `.class-name`. |
| Pipeline skips my new requirement | Check the `Page` column matches the KB filename exactly (case-sensitive, no `.json`). |
| Generated assertions reference wrong messages | Add exact message strings to `"messages"` in KB JSON and re-run. |
| Tests fail with `locator not found` | App changed since KB was generated. Run `npm run kb:generate` to refresh selectors. |
| `quota/auth exhausted — trying next provider` | Check API keys in `.env`. Switch `LLM_PROVIDER` or wait for rate limit to reset. |

---

## Where to get help

- [GETTING-STARTED.md](GETTING-STARTED.md) — first-time setup from clone
- [COMMANDS.md](COMMANDS.md) — every npm script explained
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to add a new LLM provider or extend the pipeline
