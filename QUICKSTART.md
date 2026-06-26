# Quick Start — Run the Framework in 5 Minutes

> New member setup, demo guide, and command reference — all in one place.  
> The 15-minute manager demo script is at the bottom of this file.

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/ravigaygol8877/playwright-ai-poc.git
cd playwright-ai-poc
```

---

## Step 2 — Install Dependencies

```bash
npm install
```

---

## Step 3 — Install Playwright Browsers

```bash
npx playwright install
```

> This downloads Chrome, Firefox, and Safari browser binaries.  
> Only needed once after cloning.

---

## Step 4 — Add Your API Key

```bash
cp .env.example .env
```

Open `.env` and set:

```
OPENROUTER_API_KEY=your_key_here
```

> Get a free API key at https://openrouter.ai  
> No credit card required to start.

---

## Step 5 — Run the AI Pipeline

```bash
npm run generate
```

> This is the main command. It:
> - Reads the requirement from `ai/src/index.ts`
> - Calls the AI to generate test cases and test data
> - Converts every test step into Playwright code
> - Writes the output to `tests/generated/login.spec.ts`

**Expected output in terminal:**
```
Raw AI Response: [ { "id": "TC_001", "title": "Login with valid credentials" ... } ]
Generated: tests/generated/login.spec.ts
```

---

## Step 6 — Run the Generated Tests

```bash
npm test
```

> Runs the generated Playwright test file across Chrome, Firefox, and Safari.

**Run on a single browser instead:**

```bash
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

---

## Step 7 — Open the HTML Report

```bash
npm run report
```

> Opens the Playwright HTML report in your browser.  
> Shows pass/fail results, screenshots, traces, and timing.

---

## That's It — Full Flow Done

```
Requirement (1 sentence)
      ↓
npm run generate        ← AI generates login.spec.ts
      ↓
npm test                ← Playwright runs the tests
      ↓
npm run report          ← View results in browser
```

---

---

# All Commands — Reference Card

| Command | What It Does |
|---|---|
| `npm install` | Install all dependencies |
| `npx playwright install` | Download browser binaries (once) |
| `npm run demo` | **Full demo** — runs all 9 ParaBank scenarios end-to-end |
| `npm run generate` | Original login pipeline → `tests/generated/login.spec.ts` |
| `npm test` | Run all generated tests (Chrome + Firefox + Safari) |
| `npm run test:chromium` | Run tests on Chrome only |
| `npm run test:firefox` | Run tests on Firefox only |
| `npm run test:webkit` | Run tests on Safari only |
| `npm run report` | Open HTML test report in browser |
| **ParaBank Scenarios** | |
| `npm run demo:login` | Generate ParaBank login test suite |
| `npm run demo:register` | Generate ParaBank registration test suite |
| `npm run demo:transfer` | Generate ParaBank transfer funds test suite |
| `npm run demo:billpay` | Generate ParaBank bill pay test suite |
| **Intelligence Modules** | |
| `npm run demo:healing` | Demo the Self-Healing Locator Engine |
| `npm run demo:rootcause` | Demo the Bug Root Cause Analyzer |
| `npm run demo:flaky` | Demo the Flaky Test Analyzer |
| `npm run demo:coverage` | Demo the Coverage Gap Analyzer |
| `npm run demo:regression` | Demo the Regression Selector |

---

---

# 15-Minute Manager Demo Script

> Use this exactly as written. Each block has a time estimate and what to say.

---

### Minute 0–2 — Open With the Problem

**Say:**
> "I want to show you something I built that solves a problem that slows down every QA team — writing and maintaining automation tests manually. Today that takes hours per feature and breaks every time the UI changes. Let me show you what this looks like instead."

---

### Minute 2–4 — Show the Input

Open `ai/src/index.ts` and point to this line:

```typescript
const requirement =
  "User should be able to login using valid username and password";
```

**Say:**
> "This is the only input. One plain English sentence. No test cases written. No selectors. No code. Just the requirement. Watch what the platform does with it."

---

### Minute 4–7 — Run the Full Demo Live

```bash
npm run demo
```

**While it runs, say:**
> "The AI is now generating test cases — positive login, invalid username, invalid password, empty fields, edge cases. Then it generates test data with realistic credentials. Then for each step in every test case it calls the AI to convert natural language like 'Enter a valid username' into actual Playwright code. Then it generates the assertions."

**When it finishes, open** `tests/generated/login.spec.ts`

**Say:**
> "Eight test cases. Real selectors. Real test data. Real Playwright assertions. All from that one sentence. This took about 30 seconds. Writing this manually would take 2–3 hours."

---

### Minute 7–10 — Run the Tests Live

```bash
npm run test:chromium
```

**Say:**
> "Now I am actually running these tests. Real browser. Real Playwright execution."

```bash
npm run report
```

**Say:**
> "Full HTML report. Pass/fail per test case, per browser. This is what a QA engineer would hand to a developer or a manager after a test run."

---

### Minute 10–12 — Show the Intelligent Modules

**Say:**
> "Test generation is just one of nine AI modules in this platform. Let me show you two more that are relevant to your day-to-day."

```bash
npm run demo:rootcause
```

**Say:**
> "This is the Root Cause Analyzer. When a test fails in CI, instead of a developer or QA engineer reading stack traces for 30 minutes, you feed the failure to this module and get back: failure type, probable cause, impacted component, and a concrete fix recommendation with a confidence score."

```bash
npm run demo:healing
```

**Say:**
> "This is the Self-Healing Locator. When a developer renames a button and a selector breaks, this module looks up the correct selector from the application's knowledge base and returns the fix automatically — with a confidence score and its reasoning."

---

### Minute 12–14 — Show the Architecture in 60 Seconds

Open the folder structure in your IDE or just describe it:

**Say:**
> "The platform has four layers. At the bottom, the LLM layer — this is just the connection to the AI model. We are using GPT-4.1-mini through OpenRouter today, but swapping to Claude or Gemini is one line of code because every module talks to an interface, not a specific provider."

> "Above that, the Knowledge Base — JSON files with real selectors, URLs, and error messages. This is how we prevent the AI from hallucinating fake selectors."

> "Above that, nine independent AI modules — each one solves a specific QA problem."

> "At the top, the code generation layer that converts AI output into runnable Playwright files."

---

### Minute 14–15 — Close Strong

**Say:**
> "To summarize what you just saw: one sentence of requirement went in, eight ready-to-run Playwright tests came out, the tests ran in a real browser, and we got a full HTML report — in about 10 minutes total, most of which was the live AI calls."

> "The platform also handles the ongoing maintenance problems: broken selectors heal themselves, flaky tests get analyzed automatically, and CI can be told exactly which tests to run based on what changed in the pull request — no more running the full suite on every commit."

> "This is running today on this machine. It is ready to be integrated into any project."

---

### Backup — If Something Goes Wrong During Demo

| Problem | Quick Fix |
|---|---|
| `OPENROUTER_API_KEY not found` | Check `.env` file exists and has the key |
| AI response appears truncated | Re-run `npm run generate` — it is an occasional LLM issue |
| Playwright tests fail | The tests point to `https://example.com` — they will fail on navigation but the generated code is correct. Point this out: *"The selectors and assertions are correct — the demo app is not running locally"* |
| Browser won't open for report | Run `npx playwright show-report` directly |

---

*Keep this file open during your demo. Everything you need is on this page.*
