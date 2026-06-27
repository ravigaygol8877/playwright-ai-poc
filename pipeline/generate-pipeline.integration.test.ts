/**
 * generate-pipeline.integration.test.ts
 *
 * Integration tests for the AI spec-generation pipeline.
 * The LLM is fully mocked — no real network calls are made.
 *
 * Coverage:
 *   - TestCaseGenerator: output shape, MIN/MAX enforcement
 *   - PlaywrightGenerator: testDesktop template with pomOptions
 *   - PlaywrightGenerator: legacy fixture template (pomOptions without pageClassName)
 *   - PlaywrightRenderer: method-registry vs. fallback rendering
 */

import { describe, it, expect, vi } from "vitest";
import { TestCaseGenerator }    from "./generators/test-cases/TestCaseGenerator.js";
import { PlaywrightGenerator }  from "./generators/playwright/PlaywrightGenerator.js";
import { PlaywrightRenderer }   from "./generators/playwright/PlaywrightRenderer.js";
import { AIActionModelGenerator } from "./generators/action-model/AIActionModelGenerator.js";
import { AssertionGenerator }   from "./generators/assertions/AssertionGenerator.js";
import type { LLMProvider }     from "./providers/interfaces/LLMProvider.js";
import type { KnowledgeBase }   from "./models/KnowledgeBase.js";
import type { TestCase }        from "./models/TestCase.js";
import type { TestData }        from "./models/TestData.js";
import type { PomOptions }      from "./generators/playwright/PlaywrightGenerator.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockProvider(responseJson: string): LLMProvider {
  return { generateResponse: vi.fn().mockResolvedValue(responseJson) };
}

function makeTestCase(id: string, override?: Partial<TestCase>): TestCase {
  return {
    id,
    title:          `Test case ${id}`,
    type:           "positive",
    priority:       "High",
    preconditions:  [],
    steps:          ["Click the loginButton"],
    expectedResult: "User is logged in",
    ...override,
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FIXTURE_KB: KnowledgeBase = {
  url:      "https://automationexercise.com/",
  pageName: "AE Home Page",
  selectors: {
    navHomeLink:       ".nav-home",
    navSignupLoginLink: ".nav-login",
    loginButton:       "#login-btn",
  },
  messages: { loginError: "Your email or password is incorrect!" },
};

const FIXTURE_TEST_DATA: TestData = {
  validUsername:         "user@example.com",
  validPassword:         "Secret123!",
  invalidUsername:       "bad@example.com",
  invalidPassword:       "wrong",
  overMaxLengthUsername: "a".repeat(256),
  uppercaseUsername:     "USER@EXAMPLE.COM",
  firstName:             "Jane",
  lastName:              "Doe",
  postalCode:            "10001",
  invalidPostalCode:     "00000",
  lockedOutUsername:     "locked@example.com",
};

const FIXTURE_POM_OPTIONS: PomOptions = {
  fixtureKey:         "aeHomePage",
  fixtureImportPath:  "../../support/fixtures/base.js",
  testDataImportPath: "./ae-home.data.js",
  pageClassName:      "AeHomePage",
  pageImportPath:     "../../support/pages/AeHomePage.js",
  methodRegistry: {
    navSignupLoginLink: { click: "navigateToLogin" },
    loginButton:        { click: "submitLogin" },
  },
};

// ─── TestCaseGenerator integration ───────────────────────────────────────────

describe("Pipeline — TestCaseGenerator integration", () => {

  it("returns an array of test cases with the correct shape", async () => {
    const cases    = Array.from({ length: 5 }, (_, i) => makeTestCase(`TC_00${i + 1}`));
    const provider = makeMockProvider(JSON.stringify(cases));
    const gen      = new TestCaseGenerator(provider);

    const result = await gen.generate("User can view the home page", FIXTURE_KB);

    expect(Array.isArray(result)).toBe(true);
    for (const tc of result) {
      expect(tc).toHaveProperty("title");
      expect(Array.isArray(tc.steps)).toBe(true);
      expect(tc).toHaveProperty("expectedResult");
    }
  });

  it("each test case has a non-empty title, at least one step, and an expectedResult", async () => {
    const cases    = Array.from({ length: 6 }, (_, i) => makeTestCase(`TC_00${i + 1}`));
    const provider = makeMockProvider(JSON.stringify(cases));
    const gen      = new TestCaseGenerator(provider);

    const result = await gen.generate("User can log in with valid credentials", FIXTURE_KB);

    for (const tc of result) {
      expect(tc.title.length).toBeGreaterThan(0);
      expect(tc.steps.length).toBeGreaterThanOrEqual(1);
      expect(tc.expectedResult.length).toBeGreaterThan(0);
    }
  });

  it("enforces MIN: throws when LLM returns fewer than 4 test cases", async () => {
    const cases    = Array.from({ length: 3 }, (_, i) => makeTestCase(`TC_00${i + 1}`));
    const provider = makeMockProvider(JSON.stringify(cases));
    const gen      = new TestCaseGenerator(provider);

    await expect(gen.generate("User can log in", FIXTURE_KB)).rejects.toThrow(/at least 4 test cases/);
  });

  it("enforces MAX: truncates to 10 when LLM returns more than 10 test cases", async () => {
    const cases    = Array.from({ length: 14 }, (_, i) => makeTestCase(`TC_0${i + 1}`));
    const provider = makeMockProvider(JSON.stringify(cases));
    const gen      = new TestCaseGenerator(provider);

    const result = await gen.generate("User can browse products", FIXTURE_KB);

    expect(result.length).toBeLessThanOrEqual(10);
  });

  it("returns at least 4 test cases when LLM returns exactly 4", async () => {
    const cases    = Array.from({ length: 4 }, (_, i) => makeTestCase(`TC_00${i + 1}`));
    const provider = makeMockProvider(JSON.stringify(cases));
    const gen      = new TestCaseGenerator(provider);

    const result = await gen.generate("User can view product list", FIXTURE_KB);

    expect(result.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── PlaywrightGenerator integration ─────────────────────────────────────────

describe("Pipeline — PlaywrightGenerator integration (testDesktop template)", () => {

  const CLICK_ACTION_JSON = JSON.stringify({ action: "click", target: "loginButton" });
  const ASSERTION_CODE    = "await expect(page).toHaveURL(/home/);";

  it("output contains 'testDesktop.describe' when pageClassName is provided", async () => {
    // LLM is called for: action model (1 call per step) + assertion (1 call per test case)
    // Both return the same mock; action model gets click, assertion gets the assertion line.
    const provider  = makeMockProvider(CLICK_ACTION_JSON);
    const assertProv = makeMockProvider(ASSERTION_CODE);
    const actionGen = new AIActionModelGenerator(provider);
    const renderer  = new PlaywrightRenderer();
    const assertGen = new AssertionGenerator(assertProv);
    const pwGen     = new PlaywrightGenerator(actionGen, renderer, assertGen);

    const testCases = Array.from({ length: 1 }, (_, i) => makeTestCase(`TC_00${i + 1}`));
    const output    = await pwGen.generate(testCases, FIXTURE_TEST_DATA, FIXTURE_KB, FIXTURE_POM_OPTIONS);

    expect(output).toContain("testDesktop.describe");
  });

  it("output contains 'import { testDesktop' when pageClassName is provided", async () => {
    const provider  = makeMockProvider(CLICK_ACTION_JSON);
    const assertProv = makeMockProvider(ASSERTION_CODE);
    const pwGen     = new PlaywrightGenerator(
      new AIActionModelGenerator(provider),
      new PlaywrightRenderer(),
      new AssertionGenerator(assertProv),
    );

    const testCases = [makeTestCase("TC_001")];
    const output    = await pwGen.generate(testCases, FIXTURE_TEST_DATA, FIXTURE_KB, FIXTURE_POM_OPTIONS);

    expect(output).toContain("import { testDesktop");
  });

  it("output contains the pageClassName (AeHomePage)", async () => {
    const provider  = makeMockProvider(CLICK_ACTION_JSON);
    const assertProv = makeMockProvider(ASSERTION_CODE);
    const pwGen     = new PlaywrightGenerator(
      new AIActionModelGenerator(provider),
      new PlaywrightRenderer(),
      new AssertionGenerator(assertProv),
    );

    const testCases = [makeTestCase("TC_001")];
    const output    = await pwGen.generate(testCases, FIXTURE_TEST_DATA, FIXTURE_KB, FIXTURE_POM_OPTIONS);

    expect(output).toContain("AeHomePage");
  });

  it("output contains the fixtureKey as a variable name", async () => {
    const provider  = makeMockProvider(CLICK_ACTION_JSON);
    const assertProv = makeMockProvider(ASSERTION_CODE);
    const pwGen     = new PlaywrightGenerator(
      new AIActionModelGenerator(provider),
      new PlaywrightRenderer(),
      new AssertionGenerator(assertProv),
    );

    const testCases = [makeTestCase("TC_001")];
    const output    = await pwGen.generate(testCases, FIXTURE_TEST_DATA, FIXTURE_KB, FIXTURE_POM_OPTIONS);

    // The fixture key "aeHomePage" appears as the let variable declaration
    expect(output).toContain("aeHomePage");
  });
});

describe("Pipeline — PlaywrightGenerator integration (pomOptions without pageClassName)", () => {

  it("uses legacy test.describe template when pageClassName is omitted", async () => {
    const provider   = makeMockProvider(JSON.stringify({ action: "click", target: "loginButton" }));
    const assertProv = makeMockProvider("await expect(page).toHaveURL(/login/);");
    const pwGen      = new PlaywrightGenerator(
      new AIActionModelGenerator(provider),
      new PlaywrightRenderer(),
      new AssertionGenerator(assertProv),
    );

    const legacyOptions: PomOptions = {
      fixtureKey:         "aeHomePage",
      fixtureImportPath:  "../../support/fixtures/base.js",
      testDataImportPath: "./ae-home.data.js",
      // pageClassName intentionally omitted
    };

    const testCases = [makeTestCase("TC_001")];
    const output    = await pwGen.generate(testCases, FIXTURE_TEST_DATA, FIXTURE_KB, legacyOptions);

    expect(output).toContain("test.describe");
    expect(output).toContain("import { test, expect }");
    expect(output).not.toContain("testDesktop.describe");
  });

  it("emits the correct fixture import path in legacy template", async () => {
    const provider   = makeMockProvider(JSON.stringify({ action: "noop" }));
    const assertProv = makeMockProvider("await expect(page.getByText('Home')).toBeVisible();");
    const pwGen      = new PlaywrightGenerator(
      new AIActionModelGenerator(provider),
      new PlaywrightRenderer(),
      new AssertionGenerator(assertProv),
    );

    const legacyOptions: PomOptions = {
      fixtureKey:         "aeHomePage",
      fixtureImportPath:  "../../support/fixtures/base.js",
      testDataImportPath: "./ae-home.data.js",
    };

    const testCases = [makeTestCase("TC_001")];
    const output    = await pwGen.generate(testCases, FIXTURE_TEST_DATA, FIXTURE_KB, legacyOptions);

    expect(output).toContain("../../support/fixtures/base.js");
  });
});

// ─── PlaywrightRenderer unit ──────────────────────────────────────────────────

describe("PlaywrightRenderer — renderAction", () => {
  const renderer = new PlaywrightRenderer();

  const KB_WITH_SELECTORS: KnowledgeBase = {
    url:      "https://example.com/",
    pageName: "Example Page",
    selectors: {
      loginButton: "#login-btn",
      emailInput:  "#email",
    },
  };

  const METHOD_REGISTRY: Record<string, { click?: string; fill?: string }> = {
    loginButton: { click: "submitLogin" },
    emailInput:  { fill: "fillEmail" },
  };

  // ── click with methodRegistry entry ────────────────────────────────────────

  it("click WITH registry entry emits the POM method call", () => {
    const output = renderer.renderAction(
      { action: "click", target: "loginButton" },
      KB_WITH_SELECTORS,
      "aeHomePage",
      { methodRegistry: METHOD_REGISTRY },
    );

    expect(output).toBe("await aeHomePage.submitLogin();");
  });

  // ── click WITHOUT registry entry (fallback) ────────────────────────────────

  it("click WITHOUT registry entry falls back to direct property access", () => {
    const output = renderer.renderAction(
      { action: "click", target: "loginButton" },
      KB_WITH_SELECTORS,
      "aeHomePage",
      { methodRegistry: {} },  // empty registry — no entry for loginButton
    );

    // Fallback: <fixture>.<target>.click()
    expect(output).toBe("await aeHomePage.loginButton.click();");
  });

  // ── fill with methodRegistry entry ─────────────────────────────────────────

  it("fill WITH registry entry emits the POM method call", () => {
    const output = renderer.renderAction(
      { action: "fill", target: "emailInput", dataKey: "validUsername" },
      KB_WITH_SELECTORS,
      "aeHomePage",
      { methodRegistry: METHOD_REGISTRY },
    );

    expect(output).toBe("await aeHomePage.fillEmail(testData.validUsername);");
  });

  // ── fill WITHOUT registry entry (fallback) ─────────────────────────────────

  it("fill WITHOUT registry entry falls back to page.locator().fill()", () => {
    const output = renderer.renderAction(
      { action: "fill", target: "emailInput", dataKey: "validPassword" },
      KB_WITH_SELECTORS,
      "aeHomePage",
      { methodRegistry: {} },  // empty registry — no entry for emailInput
    );

    // Fallback: raw locator using selector from KB
    expect(output).toBe(`await page.locator("#email").fill(testData.validPassword);`);
  });

  // ── no pomFixtureKey (raw mode) ────────────────────────────────────────────

  it("emits raw page.locator().click() when pomFixtureKey is absent", () => {
    const output = renderer.renderAction(
      { action: "click", target: "loginButton" },
      KB_WITH_SELECTORS,
    );

    expect(output).toBe(`await page.locator("#login-btn").click();`);
  });

  it("emits goto statement for goto action", () => {
    const output = renderer.renderAction(
      { action: "goto" },
      KB_WITH_SELECTORS,
    );

    expect(output).toBe(`await page.goto('${KB_WITH_SELECTORS.url}');`);
  });

  it("returns empty string for noop action", () => {
    const output = renderer.renderAction(
      { action: "noop" },
      KB_WITH_SELECTORS,
    );

    expect(output).toBe("");
  });
});
