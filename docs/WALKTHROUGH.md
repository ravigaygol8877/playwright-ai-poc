# Project Walkthrough — Conversational Script

> This is a step-by-step talking guide.  
> Read it like you are speaking to a colleague, a hiring manager, or your team.  
> Every section flows into the next. Real code examples are included exactly where you would show them.

---

## How to Use This Guide

- Use it for **live demos**, **KT sessions**, **interviews**, or **team presentations**
- Each section has a **what you say** part and a **what you show** part
- Pause after each section and ask "any questions before I move on?"
- The whole walkthrough takes about **45–60 minutes** at a comfortable pace

---

## Part 1 — Opening: Set the Stage

---

### What You Say

> "Before I show you any code, let me tell you what problem we are solving — because the architecture will make a lot more sense once you understand why each piece exists."

> "Imagine you are a QA engineer. A developer finishes a new login feature and asks you to write automation tests for it. What do you actually have to do?"

*Pause and let them think.*

> "You have to sit down and think through every possible scenario — valid login, invalid username, wrong password, empty fields, maybe SQL injection, maybe case sensitivity. That is just the test cases. Then you have to come up with realistic test data — actual usernames and passwords that make sense. Then for each test case, you have to translate every step into Playwright code — navigate here, type this, click that, assert this. Then you have to write the assertions — what exactly should happen when the user clicks login? And then — and this is the part nobody talks about — six months later a developer renames a button from `loginBtn` to `login`, and now every single test that touches that button breaks. And you're back to manually fixing selectors."

> "That whole process, from requirement to running test, takes hours for one feature. Multiply that across a product with dozens of features, and QA becomes a bottleneck. Every release waits on test automation."

> "That is the problem. And this project is my answer to it."

---

## Part 2 — What This Project Does (The One-Sentence Version)

---

### What You Say

> "Here is the simplest way I can describe this: You give the system a plain English sentence describing what a user should be able to do. The system uses AI to generate test cases, test data, and a complete ready-to-run Playwright test file — automatically."

> "Let me show you what I mean. Here is the input."

### What You Show

```
"User should be able to login using valid username and password"
```

> "That is it. One sentence. Now let me show you what comes out the other end."

### What You Show

Open `tests/e2e/login.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('Login with valid username and password', async ({ page }) => {

  const testData = {
    "validUsername": "user123",
    "validPassword": "Passw0rd!",
    "invalidUsername": "user!@#",
    "invalidPassword": "123"
  };

  await page.goto('https://example.com/login');
  await page.fill('#username', testData.validUsername);
  await page.fill('#password', testData.validPassword);
  await page.click('#login');

  await expect(page).toHaveURL(/dashboard/);

});

test('Login with invalid username and valid password', async ({ page }) => {

  // ... same testData ...

  await page.goto('https://example.com/login');
  await page.fill('#username', testData.invalidUsername);
  await page.fill('#password', testData.validPassword);
  await page.click('#login');

  await expect(page.locator('text=Invalid username or password')).toBeVisible();

});

// ... 6 more test cases covering empty fields, SQL injection, case sensitivity ...
```

### What You Say

> "That file has eight test cases — positive, negative, validation, edge cases — all generated from one sentence. The selectors are real. The test data is realistic. The assertions are correct. And it runs."

---

## Part 3 — Live Demo (Run It Right Now)

---

### What You Say

> "Let me actually run this so you can see it is not just a static file."

### What You Show

```bash
npm run ai:run
```

> "Watch the terminal. You will see the AI generating test cases, then test data, then each step is being converted to Playwright code one by one."

*While it runs, narrate what is happening:*

> "Right now it is calling the LLM to generate test cases from the requirement... Now it is generating test data... Now for each test step it is calling the AI again to figure out what Playwright action that step maps to... And now it is generating the assertion for each expected result."

*When it finishes:*

> "Done. The files are written to `tests/e2e/`. Let me run the tests."

```bash
npx playwright test tests/e2e/ --project=chromium
```

```bash
npx playwright show-report
```

> "Real Playwright execution. HTML report. All from one sentence."

---

## Part 4 — Architecture Overview (The Big Picture)

---

### What You Say

> "Now let me explain how it actually works inside. I want to walk you through the architecture because I made very specific design decisions and I want to explain the thinking behind each one."

> "The project is split into four layers. Think of them as four floors of a building. Each floor has one job and only talks to the floor directly below it."

### What You Draw / Show

```
┌─────────────────────────────────────────────┐
│  LAYER 3: AI Modules                        │  ← The intelligence
│  (pipeline/generators/ + analyzers/)        │
├─────────────────────────────────────────────┤
│  LAYER 4: Automation / Code Generation      │  ← Converts AI output to code
│  (pipeline/generators/playwright/)          │
├─────────────────────────────────────────────┤
│  LAYER 2: Knowledge Base                    │  ← Real application data
│  (pipeline/kb/)                             │
├─────────────────────────────────────────────┤
│  LAYER 1: LLM Provider                      │  ← Connection to the AI model
│  (pipeline/providers/)                      │
└─────────────────────────────────────────────┘
```

### What You Say

> "Layer 1 at the bottom is the LLM layer. This is just the connection to the AI. Every AI module in the project calls this layer — and none of them know or care which actual AI model is running behind it. Could be GPT. Could be Claude. Could be a mock for testing. One interface, one method."

> "Layer 2 is the Knowledge Base. This is where I store real application data — the actual HTML selectors, the real URLs, the actual error messages. The reason this layer exists is to prevent AI hallucination. If I just ask GPT to write a Playwright test for a login page, it will invent selectors that do not exist in my application. By giving the AI the knowledge base and saying 'use only what is in here', I eliminate that problem."

> "Layer 3 is where all the AI intelligence lives. Ten independent modules — test case generation, test data generation, action model generation, assertion generation, requirement expansion, flaky test analysis, root cause analysis, locator healing, coverage analysis, regression selection. Each one is completely independent."

> "Layer 4 is the automation layer. This converts the AI's structured output into actual Playwright code strings. No AI lives here — it is pure deterministic code."

> "Let me walk through each layer in detail."

---

## Part 5 — Layer 1: The LLM Layer

---

### What You Say

> "Start at the bottom. Open `pipeline/providers/interfaces/LLMProvider.ts`."

### What You Show

```typescript
// pipeline/providers/interfaces/LLMProvider.ts
export interface LLMProvider {
  generateResponse(prompt: string): Promise<string>;
}
```

### What You Say

> "That is the entire interface. One method. Takes a prompt string, returns a string. Every AI module in this project depends on this interface — not on OpenAI, not on GPT, not on any specific provider."

> "Now look at the actual implementation. Open `pipeline/providers/OpenRouterProvider.ts`."

### What You Show

```typescript
export class OpenRouterProvider implements LLMProvider {
    constructor(apiKey: string) {
        this.client = new OpenAI({
            apiKey,
            baseURL: "https://openrouter.ai/api/v1",  // OpenRouter proxy
        });
    }

    async generateResponse(prompt: string): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: "openai/gpt-4.1-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 5000,
            temperature: 0.3,    // Low temperature = consistent structured output
        });
        return response.choices[0]?.message?.content || "No response";
    }
}
```

### What You Say

> "I am using OpenRouter — which is a proxy that gives me access to GPT, Claude, Gemini, and dozens of other models through one API. Right now it is routing to `gpt-4.1-mini` which is fast and cheap but produces very clean structured JSON."

> "Notice `temperature: 0.3`. I deliberately set this low. High temperature means more creative, more varied. Low temperature means more deterministic, more consistent. When you are generating JSON that your code will parse, you want consistency, not creativity."

> "Now here is the other provider. Open `pipeline/providers/MockLLMProvider.ts`."

### What You Show

```typescript
export class MockLLMProvider implements LLMProvider {
  async generateResponse(prompt: string): Promise<string> {
    return `Mock AI Response: ${prompt}`;
  }
}
```

### What You Say

> "This is for local development and unit testing. No API call. No cost. No network dependency. Any module can swap in this provider and be tested instantly. The entire AI platform runs without ever touching an LLM — useful for testing your parsing logic, your validation logic, your rendering logic."

> "Why did I design it this way? Because if any AI module directly called `new OpenAI(...)` inside its own code, I could never test it cheaply, and I could never switch providers without touching every module. This design gives me total flexibility."

---

## Part 6 — Layer 2: The Knowledge Base

---

### What You Say

> "Now the knowledge base. This is the most important design decision in the whole project, and I want to spend a minute on it."

> "The core problem with AI-generated test code is hallucination. Ask ChatGPT to write a Playwright test for a login page and it will produce something like `page.fill('#email-input', ...)` — because that is a common selector pattern. But your actual selector might be `#username`. The AI does not know your application. It guesses."

> "My solution: don't let the AI guess. Give it the truth."

### What You Show

Open `pipeline/kb/pages/login-page.json`

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

### What You Say

> "This file contains everything the AI needs to know about the login page. The real URL. The real selectors. The real error messages. When the AI generates an assertion, it is told: use only what is in this file. Do not invent anything."

> "Now look at how this file is loaded. Open `pipeline/kb/KnowledgeBaseService.ts`."

### What You Show

```typescript
export class KnowledgeBaseService {
  load(pageName: string) {
    const filePath = `pipeline/kb/pages/${pageName}.json`;
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  }
}
```

### What You Say

> "Extremely simple. Pass a page name, get back the parsed JSON object. The caller gets `kb.url`, `kb.selectors.username`, `kb.messages.invalidLogin` — real values, not guesses."

> "And here is the maintenance benefit: when a developer renames `#login` to `#login-button`, you change one line in this JSON file. No test code changes. No selector hunting. The AI picks up the correct selector the next time it runs."

> "The Regression Selector is constrained the same way. It receives the list of actually existing test suite names alongside the changed files, so the AI can only recommend suites that exist. If the AI tries to invent a suite name, it gets filtered out in code after the response. The AI is always constrained to reality."

---

## Part 7 — Layer 3: The AI Modules (The Heart of the System)

---

### What You Say

> "Now the interesting part. Let me walk you through each AI module. They all follow exactly the same pattern — and once you understand one, you understand all of them."

> "The pattern is: structured input → carefully engineered prompt → LLM call → parse the response → validate the result → return a typed object."

> "Before I show the modules, let me show you the shared utility they all use."

### What You Show

Open `pipeline/utils/AIJsonParser.ts`

```typescript
export class AIJsonParser {
  static parse<T>(response: string): T {
    const cleaned = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned);
  }
}
```

### What You Say

> "This tiny utility solves a real problem. When you ask an LLM to return JSON, it often wraps it in a markdown code block like this:"

```
```json
{ "key": "value" }
```
```

> "If you call `JSON.parse()` on that directly, it throws. This parser strips those fences before parsing. Every AI module uses this."

---

### Module A — Test Case Generator

### What You Say

> "First module. Open `pipeline/generators/test-cases/TestCaseGenerator.ts`."

> "This module takes a plain English requirement and returns a list of test cases. Let me show you the data model first."

### What You Show

```typescript
// pipeline/models/TestCase.ts
export interface TestCase {
  id: string;           // "TC_001"
  title: string;        // "Login with valid credentials"
  preconditions: string[];
  steps: string[];      // ["Navigate to login page", "Enter valid username", ...]
  expectedResult: string;
}
```

### What You Say

> "Now the generator itself. The key thing to look at is the prompt."

### What You Show

```typescript
async generate(requirement: string): Promise<TestCase[]> {
  const prompt = `
You are a Senior QA Engineer.

Generate a comprehensive regression suite for the requirement.
Avoid duplicate scenarios.

Rules:
- Generate between 5 and 10 meaningful test cases.
- Include positive scenarios.
- Include negative scenarios.
- Include validation scenarios.
- Include edge cases where applicable.
- Return ONLY valid JSON.
- Do NOT return markdown.
- Do NOT return explanations.

Structure:
[
  {
    "id": "TC_001",
    "title": "",
    "preconditions": [],
    "steps": [],
    "expectedResult": ""
  }
]

Requirement:
${requirement}
  `;

  const response = await this.llmProvider.generateResponse(prompt);
  return JSON.parse(cleanedResponse);
}
```

### What You Say

> "A few things I want you to notice about this prompt:"

> "First — I give the AI a persona: 'You are a Senior QA Engineer.' This is not just flavor text. LLMs perform better when they have a clear role. A senior QA engineer thinks differently than a junior developer."

> "Second — I give explicit rules. 'Generate between 5 and 10 meaningful test cases.' 'Include positive, negative, validation, and edge cases.' Without these rules, the AI might return three test cases or twenty, or only positive scenarios."

> "Third — 'Return ONLY valid JSON. Do NOT return markdown. Do NOT return explanations.' This is critical. If you don't say this, the AI will return prose around the JSON and your parser will break."

> "Fourth — I show the exact JSON structure. The AI is much more reliable when you show it the format you expect, not just describe it."

> "This module takes about 3–5 seconds to run and comes back with 8 well-structured test cases covering scenarios you might forget to write manually — SQL injection, case sensitivity, maximum field length."

---

### Module B — Test Data Generator

### What You Say

> "Now the test data generator. Open `pipeline/generators/test-data/TestDataGenerator.ts`."

> "The data model first."

### What You Show

```typescript
export interface TestData {
  validUsername: string;    // "user123"
  validPassword: string;    // "Passw0rd!"
  invalidUsername: string;  // "user!@#"
  invalidPassword: string;  // "123"
}
```

### What You Say

> "Four values — valid and invalid versions of each credential. Simple and sufficient. Now the prompt."

### What You Show

```typescript
const prompt = `
You are a QA Test Data Generator.

Generate ONLY test data.

DO NOT generate test cases.
DO NOT generate explanations.
DO NOT generate arrays.
DO NOT generate descriptions.

Return ONLY valid JSON in this exact format:

{
  "validUsername": "string",
  "validPassword": "string",
  "invalidUsername": "string",
  "invalidPassword": "string"
}

Requirement:
${requirement}
`;
```

### What You Say

> "Notice how many times I say what NOT to do. 'DO NOT generate test cases. DO NOT generate arrays.' This is deliberate. Without these constraints, the AI sometimes returns an array of test data objects, or it mixes in test case descriptions, or it returns the same structure with extra fields I didn't ask for."

> "Prompt engineering is really about boundary setting. The AI is creative by nature. Your job is to box it in to exactly what you need."

---

### Module C — Action Model Generator

### What You Say

> "This is my favorite module in the whole project. Open `pipeline/generators/action-model/AIActionModelGenerator.ts`."

> "The challenge this module solves: a test case has steps written in natural language. Things like 'Navigate to login page' or 'Enter a valid username'. These need to become Playwright code. But Playwright code is precise — it needs exact selectors and exact data references. The Action Model is the intermediate format that bridges natural language and Playwright."

### What You Show

```typescript
// pipeline/generators/action-model/ActionModel.ts
export type TestDataKey =
  | "validUsername"
  | "invalidUsername"
  | "validPassword"
  | "invalidPassword"
  | "empty";

export interface ActionModel {
  action: "goto" | "fill" | "click";  // Only 3 allowed
  target: string;                      // "username", "loginButton", "page"
  dataKey?: TestDataKey;               // Which test data to use
}
```

### What You Say

> "Only three actions — goto, fill, click. Only five data keys. This is intentional constraint. The AI is not allowed to invent actions or data keys. Here is why this matters."

> "If I let the AI freely return whatever it wants, I might get `dataKey: "SQLInjectionString"` or `dataKey: "maxLengthValidUsername"`. Those don't exist in the TestData object. My code would break at runtime. By constraining the allowed values in the prompt and in the TypeScript type, I make that impossible."

### What You Show

A key part of the prompt:

```typescript
const prompt = `
You are a QA automation expert.

Convert the step into JSON.

Allowed actions:
goto
fill
click

Allowed dataKey values ONLY:
validUsername
invalidUsername
validPassword
invalidPassword
empty

Never invent any other value.
Never return:
maxLengthValidUsername
anyPassword
specialCharacterPassword
SQLInjectionString

Only use one of the allowed values.

Examples:

Step: Navigate to login page
Output: { "action": "goto", "target": "page" }

Step: Enter a valid username
Output: { "action": "fill", "target": "username", "dataKey": "validUsername" }

Step: Click login button
Output: { "action": "click", "target": "loginButton" }

Return ONLY JSON.
Step: ${step}
`;
```

### What You Say

> "Two things make this prompt work. First, the explicit list of what is and is not allowed — I literally show the AI examples of wrong answers it should never produce. Second, the examples. The AI learns from examples much better than from descriptions. Show don't tell."

> "Let me show you the conversion in action."

### What You Show

| Step (Natural Language) | ActionModel |
|---|---|
| `"Navigate to login page"` | `{ action: "goto", target: "page" }` |
| `"Enter a valid username"` | `{ action: "fill", target: "username", dataKey: "validUsername" }` |
| `"Enter an invalid password"` | `{ action: "fill", target: "password", dataKey: "invalidPassword" }` |
| `"Leave username empty"` | `{ action: "fill", target: "username", dataKey: "empty" }` |
| `"Click login button"` | `{ action: "click", target: "loginButton" }` |

### What You Say

> "Natural language in, structured object out. Every field is typed, every value is constrained. Now the renderer can take this object and produce reliable Playwright code — no guessing required."

---

### Module D — Playwright Renderer

### What You Say

> "Now the renderer. Open `pipeline/generators/playwright/PlaywrightRenderer.ts`."

> "This is the only module in the whole project that has zero AI in it. It is a pure deterministic function. It takes an ActionModel and a knowledge base, and it returns a Playwright code string."

### What You Show

```typescript
renderAction(action: ActionModel, knowledgeBase: any): string {
  switch (action.action) {

    case "goto":
      return `await page.goto('${knowledgeBase.url}');`;
      // Output: await page.goto('https://example.com/login');

    case "fill":
      if (action.dataKey === "empty") {
        return `await page.fill('${knowledgeBase.selectors[action.target]}', '');`;
        // Output: await page.fill('#username', '');
      }
      return `await page.fill('${knowledgeBase.selectors[action.target]}', testData.${action.dataKey});`;
      // Output: await page.fill('#username', testData.validUsername);

    case "click":
      return `await page.click('${knowledgeBase.selectors[action.target]}');`;
      // Output: await page.click('#login');
  }
}
```

### What You Say

> "Look at what this does with the ActionModel and the knowledge base together."

> "If the ActionModel says `target: 'username'`, the renderer looks up `knowledgeBase.selectors['username']` which is `#username`. It never hardcodes a selector. The selector always comes from the JSON file."

> "If the ActionModel says `dataKey: 'validUsername'`, the renderer writes `testData.validUsername` — a reference to the test data object that will be in scope when the test runs."

> "Why separate this from the AI? Because this code is testable in isolation. I can write unit tests for the renderer with zero LLM calls. And when selectors change, only the JSON file changes — not this code."

---

### Module E — Assertion Generator

### What You Say

> "The assertion generator. Open `pipeline/generators/assertions/AssertionGenerator.ts`."

> "Each test case has an `expectedResult` written in plain English. This module converts that into an actual Playwright assertion line."

### What You Show

The prompt's key rules:

```typescript
const prompt = `
You are a Senior Playwright Automation Engineer.

Application Knowledge:
${JSON.stringify(knowledgeBase, null, 2)}

Convert the expected result into ONE Playwright assertion.

STRICT RULES:
1. Use ONLY values from the knowledge base.
2. If invalid login message is needed use:
   'Invalid username or password'
3. If redirect validation is needed use:
   await expect(page).toHaveURL(/dashboard/);
4. Return ONLY executable Playwright code.
5. Do NOT return markdown.
6. Return a single assertion statement.

Expected Result: ${expectedResult}
`;
```

### What You Say

> "I pass the entire knowledge base to this prompt. The AI can see the real error messages, the real redirect URL. And I give it concrete examples of what the assertions should look like."

> "Without those examples, I have seen AI return things like `await expect(page).toHaveText(messages.invalidLogin)` — which would be a runtime error because `messages` is not a variable in the test scope. The examples prevent that."

### What You Show

Example inputs and outputs:

```
Expected: "User is redirected to dashboard"
Output:   await expect(page).toHaveURL(/dashboard/);

Expected: "Error message is displayed for invalid credentials"
Output:   await expect(page.locator('text=Invalid username or password')).toBeVisible();

Expected: "Username required message is shown"
Output:   await expect(page.locator('text=Username is required')).toBeVisible();
```

---

### Module F — Playwright Generator (The Assembler)

### What You Say

> "Now the orchestrator of the automation layer. Open `pipeline/generators/playwright/PlaywrightGenerator.ts`."

> "This class takes the test cases, test data, and knowledge base, and coordinates everything we just walked through to produce the complete test file."

### What You Show

```typescript
async generate(testCases: TestCase[], testData: TestData, knowledgeBase: any): Promise<string> {

  const testBlocks = await Promise.all(
    testCases.map(async (testCase) => {

      // For each step — call AI to get ActionModel, then render to code
      const actions = await Promise.all(
        testCase.steps.map(async (step) => {
          const actionModel = await this.actionModelGenerator.generate(step);
          return this.renderer.renderAction(actionModel, knowledgeBase);
        })
      );

      // Generate the assertion for the expected result
      const assertion = await this.assertionGenerator.generateAssertion(
        testCase.expectedResult,
        knowledgeBase
      );

      // Assemble the complete test block
      return `
test('${testCase.title}', async ({ page }) => {
  const testData = ${JSON.stringify(testData, null, 2)};
  ${actions.join("\n")}
  ${assertion}
});`;
    })
  );

  return `import { test, expect } from '@playwright/test';\n\n${testBlocks.join("\n")}`;
}
```

### What You Say

> "Notice `Promise.all` at two levels. All test cases are processed in parallel. Within each test case, all steps are also processed in parallel. This matters because each step requires an LLM call. For a test case with five steps, without parallelism I would wait for step 1 to finish before starting step 2 — five calls in sequence. With `Promise.all` all five calls go out simultaneously. The test case finishes in the time of the slowest single call, not the sum of all calls."

> "The output is a complete TypeScript file. Import statement at the top, all test blocks assembled, ready to run."

---

## Part 8 — The Intelligent Modules (Beyond Test Generation)

---

### What You Say

> "So far we have seen the test generation pipeline. But this project goes further. Let me walk you through the diagnostic and maintenance modules — these are what make the platform genuinely useful in a real project."

---

### Module G — Self-Healing Locator Engine

### What You Say

> "This is probably the most practical module for day-to-day QA work. Open `pipeline/analyzers/self-healing/SelfHealingLocatorEngine.ts`."

> "The problem: a developer renames `#loginBtn` to `#login`. Your test breaks. Traditionally, you open the test file, find the broken selector, figure out what the new correct selector is, fix it, commit. Now imagine that happening across 50 tests after a major UI refactor."

> "The self-healing engine automates this. You tell it: this locator failed, here is the page it was on. It consults the knowledge base and uses AI to find the best replacement."

### What You Show

```typescript
// Input
const failure: LocatorFailure = {
  failedLocator: "#loginBtn",
  pageName: "login-page"
};

// The engine loads the knowledge base and asks the AI:
const prompt = `
You are a Playwright locator healing expert.

Application Knowledge:
${JSON.stringify(knowledgeBase, null, 2)}

Failed Locator:
${JSON.stringify(failure, null, 2)}

Rules:
- Use ONLY selectors from the knowledge base
- Do NOT invent selectors
- Return ONLY JSON

Example:
{
  "originalLocator": "#loginBtn",
  "healedLocator": "#login",
  "confidence": 92,
  "reasoning": "Matching login button found in knowledge base."
}
`;

// Output
const result: LocatorHealingResult = {
  originalLocator: "#loginBtn",
  healedLocator: "#login",
  confidence: 92,
  reasoning: "Matching login button found in knowledge base."
};
```

### What You Say

> "The AI compares the failed selector against everything in the knowledge base for that page and returns the best match with a confidence score. If confidence is above a threshold — say, 85 — you auto-apply the fix. Below the threshold, you flag it for human review."

> "This is the kind of thing that can run as a CI step. When tests fail due to locator errors, the pipeline heals them automatically and commits the fix."

---

### Module H — Flaky Test Analyzer

### What You Say

> "Open `pipeline/analyzers/flaky/FlakyTestAnalyzer.ts`."

> "Flaky tests are tests that sometimes pass and sometimes fail for no obvious reason. They are one of the most frustrating problems in automation. When a test fails in CI, you don't know if it is a real bug or just flakiness. Teams start ignoring failures because they assume it is flakiness — and then they miss real bugs."

> "This module takes test execution data — how many times did it retry, how long did it take, what was the failure message — and the AI gives you a probability score plus an explanation."

### What You Show

```typescript
// Input
const executionData: TestExecutionData = {
  testName: "login.spec.ts",
  retryCount: 3,            // Retried 3 times before passing
  duration: 15000,          // 15 seconds — suspiciously slow
  failureMessage: "Timeout: element not found"
};

// Output
const analysis: FlakyTestAnalysis = {
  testName: "login.spec.ts",
  flakyProbability: 85,     // High — this test is probably flaky
  possibleCauses: [
    "Timing issue — element not rendered before selector evaluated",
    "Network latency causing variable page load times"
  ],
  recommendation: "Replace fixed waits with locator assertions: await expect(locator).toBeVisible()"
};
```

### What You Say

> "A probability of 85 means the AI is highly confident this test is flaky, not failing due to a real bug. The recommendation is actionable — exactly what to change in the test."

> "You can integrate this across your entire test suite. Feed in execution data from your last 30 CI runs and get a prioritized list of which tests to fix first."

---

### Module I — Bug Root Cause Analyzer

### What You Say

> "Open `pipeline/analyzers/root-cause/BugRootCauseAnalyzer.ts`."

> "When a test fails in CI, someone has to read the stack trace and figure out why. For experienced engineers this takes minutes. For junior engineers it can take hours. And even experienced engineers sometimes miss the real cause."

> "This module takes the failure message, stack trace, and execution log and returns a structured diagnosis."

### What You Show

```typescript
// Input
const input: FailureAnalysisInput = {
  testName: "checkout.spec.ts",
  failureMessage: "TimeoutError: waiting for selector '#submit-order'",
  stackTrace: "at PWTestRunner.waitForSelector (line 47)...",
  executionLog: "Navigated to /cart, clicked proceed, waited 30s for #submit-order"
};

// Output
const result: RootCauseAnalysisResult = {
  failureType: "Timeout",
  probableCause: "Element loaded after API response from payment service",
  impactedComponent: "Checkout Page",
  recommendation: "Replace hardcoded wait with: await expect(page.locator('#submit-order')).toBeVisible()",
  confidence: 88
};
```

### What You Say

> "Five fields in the output — failure type, probable cause, impacted component, recommendation, and a confidence score."

> "The confidence score is validated in code before it is returned."

### What You Show

```typescript
if (result.confidence < 0 || result.confidence > 100) {
  throw new Error(`Invalid confidence score: ${result.confidence}`);
}

if (!result.failureType || !result.probableCause || !result.impactedComponent || !result.recommendation) {
  throw new Error("Incomplete root cause analysis result");
}
```

### What You Say

> "This is important. I do not blindly trust the AI's response. I validate it. If the AI returns a confidence of 150 or leaves out the recommendation, my code throws an error. The AI must meet the contract, not the other way around."

---

### Module J — Coverage Analyzer

### What You Say

> "Open `pipeline/analyzers/coverage/CoverageAnalyzer.ts`."

> "How do you know which requirements actually have test coverage? Most teams assume. This module makes it explicit."

### What You Show

```typescript
// Input
const input: CoverageAnalysisInput = {
  requirements: [
    "User can login",
    "User can reset password",
    "User can update profile"
  ],
  existingTests: [
    "Login Tests",
    "Registration Tests"
  ]
};

// Output
const result: CoverageAnalysisResult = {
  coveredRequirements: ["User can login"],
  missingCoverage: ["User can reset password", "User can update profile"],
  coveragePercentage: 33,
  recommendation: "Create Password Reset Tests and User Profile Tests"
};
```

### What You Say

> "The AI compares the two lists, infers which requirements the existing tests cover, and reports the gap. You can feed this into a sprint planning session: 'We have 33% coverage, here are the specific requirements that need tests.'"

> "Same validation pattern — coverage percentage is checked to be between 0 and 100."

---

### Module K — Regression Selector

### What You Say

> "Last module. Open `pipeline/analyzers/regression/RegressionSelector.ts`."

> "This solves a real CI/CD problem. Every PR triggers the full regression suite. If your suite takes 45 minutes, every PR takes 45 minutes to validate. That is extremely wasteful when a change only touched one module."

> "The regression selector takes the list of changed files from a pull request and determines which test suites actually need to run."

### What You Show

```typescript
// The AI is given the list of changed files AND the catalog of available test suites
const availableSuites = new TestCatalogService().load();
// ["Login Tests", "Registration Tests", "Password Reset Tests", "User Profile Tests", ...]

// Input to AI
changedFiles: ["src/auth/login.ts", "src/auth/session.ts"]

// AI is told:
// "Recommend ONLY suites from the available list. Do NOT invent new suites."

// Output
const result: RegressionSelection = {
  changedFiles: ["src/auth/login.ts", "src/auth/session.ts"],
  impactedFeatures: ["Authentication", "Session Management"],
  recommendedTests: ["Login Tests", "Password Reset Tests"],
  reasoning: "Changes to auth module affect login flow and session-based features."
};
```

### What You Say

> "And here is the safeguard — after the AI responds, I filter its recommendations against the actual catalog in code."

### What You Show

```typescript
result.recommendedTests = result.recommendedTests.filter(
  (suite: string) => availableSuites.includes(suite)
);
```

### What You Say

> "Even if the AI returns a suite that does not exist, it gets removed. This is a hard constraint enforced by code, not just by the prompt. Defense in depth."

---

## Part 9 — The Orchestrator (Tying It All Together)

---

### What You Say

> "Open `scripts/run-pipeline.ts`. This is the main pipeline runner — it coordinates the full end-to-end generation sequence."

> "The pipeline runner is what you use when you want the full end-to-end flow in one command. It coordinates KB generation, scenario discovery, POM generation, test case expansion, and Playwright spec generation."

### What You Show

```typescript
async generateTests(requirement: string): Promise<TestGenerationResult> {

  // Step 1: Generate test cases from requirement
  const testCases = await this.testCaseGenerator.generate(requirement);

  // Step 2: Generate test data from requirement
  const testData = await this.testDataGenerator.generate(requirement);

  // Step 3: Load the knowledge base
  const knowledgeBase = new KnowledgeBaseService().load("login-page");

  // Step 4: Generate the Playwright script
  const generatedScript = await this.playwrightGenerator.generate(
    testCases, testData, knowledgeBase
  );

  return { testCases, testData, generatedScript };
}
```

### What You Say

> "Three inputs go in — nothing. One sentence of requirement. One output comes out — a `TestGenerationResult` with the test cases, the test data, and the complete Playwright script."

> "The orchestrator is what you would call from a CI pipeline, a CLI tool, or a web interface. It is the single entry point to the whole intelligence system."

---

## Part 10 — The Entry Point (The Main File)

---

### What You Say

> "Now let me open the main file that ties everything together. Open `scripts/run-pipeline.ts`. This is what runs when you type `npm run ai:run`."

### What You Show

```typescript
import "dotenv/config";
import fs from "fs";

async function main() {
  // 1. Load the API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not found");

  // 2. Create the LLM provider
  const llmProvider = new OpenRouterProvider(apiKey);

  // 3. Define the requirement
  const requirement =
    "User should be able to login using valid username and password";

  // 4. Wire up all components
  const testCaseGenerator  = new TestCaseGenerator(llmProvider);
  const testDataGenerator  = new TestDataGenerator(llmProvider);
  const actionModelGen     = new AIActionModelGenerator(llmProvider);
  const renderer           = new PlaywrightRenderer();
  const assertionGenerator = new AssertionGenerator(llmProvider);
  const playwrightGen      = new PlaywrightGenerator(actionModelGen, renderer, assertionGenerator);

  // 5. Load the knowledge base
  const knowledgeBase = new KnowledgeBaseService().load("login-page");

  // 6. Run the pipeline
  const testCases = await testCaseGenerator.generate(requirement);
  const testData  = await testDataGenerator.generate(requirement);
  const script    = await playwrightGen.generate(testCases, testData, knowledgeBase);

  // 7. Write the output file
  fs.writeFileSync("tests/e2e/login.spec.ts", script);

  console.log("Generated: tests/e2e/login.spec.ts");
}

main();
```

### What You Say

> "This is dependency injection done manually. Each module receives the LLM provider through its constructor. Nobody creates an LLM provider internally. This is what makes the whole system testable and swappable."

> "Notice the flow: create provider → create components → inject provider into each → run pipeline → write file. Clean, linear, easy to follow."

---

## Part 11 — How to Extend This

---

### What You Say

> "One of the questions I get asked a lot is: what if I want to add a new page, or a new AI module, or a different LLM? Let me walk through each one because the answers are simpler than people expect."

---

### Adding a New Page

### What You Say

> "Say you want to generate tests for the checkout page. Here is all you do."

### What You Show

Create `pipeline/kb/pages/checkout-page.json`:

```json
{
  "pageName": "Checkout Page",
  "url": "https://example.com/checkout",
  "selectors": {
    "cardNumber": "#card-number",
    "expiryDate": "#expiry",
    "cvv": "#cvv",
    "submitOrder": "#submit-order"
  },
  "messages": {
    "invalidCard": "Invalid card number",
    "orderSuccess": "Your order has been placed"
  },
  "success": {
    "redirectUrl": "/order-confirmation"
  }
}
```

Then in `index.ts`:

```typescript
const knowledgeBase = new KnowledgeBaseService().load("checkout-page");
const requirement = "User should be able to complete a checkout with a valid card";
```

### What You Say

> "That is the only change. One JSON file. One line in the entry point. The AI pipeline automatically adapts."

---

### Swapping the LLM Provider

### What You Say

> "Say the team decides to use Claude instead of GPT. Here is the change."

### What You Show

```typescript
// pipeline/providers/ClaudeProvider.ts
import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider } from "./interfaces/LLMProvider.js";

export class ClaudeProvider implements LLMProvider {
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  async generateResponse(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      messages: [{ role: "user", content: prompt }]
    });
    return message.content[0].type === "text" ? message.content[0].text : "";
  }
}
```

In `index.ts`:
```typescript
// Before:
const llmProvider = new OpenRouterProvider(apiKey);

// After:
const llmProvider = new ClaudeProvider();
```

### What You Say

> "One new file. One changed line. Nothing else in the project changes. Not a single AI module. Not the renderer. Not the orchestrator. This is why the LLM abstraction layer exists."

---

### Adding a New AI Module

### What You Say

> "Say you want to add a 'Test Priority Scorer' — given a list of test cases, return them ranked by risk level. Here is the pattern to follow."

### What You Show

Step 1 — Define the interfaces:
```typescript
// pipeline/analyzers/test-priority-scorer/PriorityScoringInput.ts
export interface PriorityScoringInput {
  testCases: TestCase[];
  changedFiles: string[];
}

// pipeline/analyzers/test-priority-scorer/PriorityScoredResult.ts
export interface PriorityScoredResult {
  testCaseId: string;
  riskScore: number;       // 0-100
  priorityReason: string;
}
```

Step 2 — Create the module:
```typescript
// pipeline/analyzers/test-priority-scorer/TestPriorityScorer.ts
export class TestPriorityScorer {
  constructor(private llmProvider: LLMProvider) {}

  async score(input: PriorityScoringInput): Promise<PriorityScoredResult[]> {
    const prompt = `
      You are a QA risk analysis expert.
      Score each test case by risk level given the changed files.
      Return ONLY JSON array. Each item: { testCaseId, riskScore, priorityReason }
      riskScore must be 0-100.
      Input: ${JSON.stringify(input)}
    `;
    const response = await this.llmProvider.generateResponse(prompt);
    return AIJsonParser.parse(response);
  }
}
```

### What You Say

> "Two interface files, one class file. The module follows the exact same pattern as every other AI module. It takes the LLM provider in the constructor. It has a structured input and output. It validates the output. You drop it in and it works."

---

## Part 12 — Wrap Up and Q&A Preparation

---

### What You Say

> "Let me step back and summarize what we have built and why the design decisions matter."

> "We have a four-layer architecture. The LLM layer gives us provider independence. The knowledge base layer grounds the AI in reality and prevents hallucination. The AI layer gives us ten independent, composable intelligence modules. The automation layer converts AI output to executable code."

> "Every module follows the same pattern: structured input, engineered prompt, LLM call, parse, validate, typed output. Once you understand one module, you can write another in 30 minutes."

> "The platform solves real problems: slow test authoring, locator rot after UI changes, flaky test investigation, root cause analysis, coverage gaps, and wasted CI time from running unnecessary tests."

> "It is written in TypeScript with strict mode throughout. Every contract between modules is type-checked. The MockLLMProvider means the entire platform runs in local tests without API calls. Individual modules can be tested in isolation."

---

### Common Questions and How to Answer Them

---

**Q: "Is the generated code good enough to actually use?"**

> "The code follows Playwright best practices — locator-based selectors, proper assertions, no hardcoded waits. It is production-quality for the cases the knowledge base covers. For edge cases outside the knowledge base, you review and extend it. Think of it as a first draft written by a senior QA engineer in seconds rather than you writing it from scratch in hours."

---

**Q: "What happens when the AI returns bad JSON?"**

> "Two defenses. First, the prompt explicitly says 'Return ONLY valid JSON. Do NOT return markdown.' with format examples — this reduces bad responses significantly. Second, the `AIJsonParser` strips markdown fences before parsing. Third, every module validates the parsed result against type constraints and business rules before returning. If the AI returns nonsense, an error is thrown and you know immediately."

---

**Q: "How do you prevent the AI from inventing selectors?"**

> "The knowledge base. Every prompt that needs selectors receives the knowledge base as context and is told 'use ONLY values from the knowledge base.' For the Action Model generator, the `target` values map to keys in the knowledge base — if a key doesn't exist, the renderer throws. For assertions, the AI is shown the exact strings it should use. Defense in layers."

---

**Q: "Can this work for APIs, not just UI?"**

> "Absolutely. The architecture is UI-agnostic. You would create a knowledge base for your API endpoints — base URL, paths, request schemas, response schemas. The AI modules generate API test cases. Instead of a `PlaywrightRenderer` you write an `AxiosRenderer` or a `SupertestRenderer`. The LLM layer and AI modules stay exactly the same."

---

**Q: "What does this cost to run?"**

> "GPT-4.1-mini through OpenRouter costs roughly $0.40 per million input tokens and $1.60 per million output tokens. Generating a full test suite from one requirement — about 20–30 LLM calls for 8 test cases with 4 steps each — costs somewhere between 1 and 5 cents. The flaky analyzer, root cause analyzer, and regression selector are single calls each — fractions of a cent. For a team running this on every feature, we are talking dollars per month, not hundreds."

---

**Q: "Is this production-ready or a proof of concept?"**

> "The architecture is production-grade. The design patterns — provider abstraction, knowledge base grounding, typed contracts, output validation — are all patterns you would use in any serious TypeScript project. The current implementation uses a simple JSON knowledge base and a sequential orchestrator which are appropriate for a PoC but would be upgraded for production. A real deployment would use a vector database for the knowledge base and a workflow orchestration framework like LangGraph for complex multi-step flows."

---

### Final Closing Line

### What You Say

> "The core idea I want you to take away is this: AI in testing is not about replacing QA engineers. It is about eliminating the mechanical, repetitive work — writing boilerplate test cases, typing out selectors, chasing flaky tests — so engineers can focus on what actually needs human judgment: understanding requirements, designing test strategies, finding edge cases the AI missed."

> "This platform is my demonstration that a well-designed AI integration, with proper constraints and validation, produces reliable, professional-grade automation output. Not eventually. Right now."

> "Any questions?"

---

*End of Walkthrough*
