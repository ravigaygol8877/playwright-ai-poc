import { describe, it, expect, vi } from "vitest";
import { TestCaseGenerator } from "./TestCaseGenerator.js";
import type { LLMProvider } from "../../providers/interfaces/LLMProvider.js";
import type { KnowledgeBase } from "../../models/KnowledgeBase.js";

function makeMockProvider(responseJson: string): LLMProvider {
  return { generateResponse: vi.fn().mockResolvedValue(responseJson) };
}

function makeTestCase(id: string) {
  return {
    id,
    title:          `Test case ${id}`,
    type:           "positive" as const,
    priority:       "High" as const,
    preconditions:  [],
    steps:          ["Step 1", "Step 2"],
    expectedResult: "Expected result",
  };
}

const VALID_KB: KnowledgeBase = {
  url:      "https://example.com/login",
  pageName: "Login Page",
  selectors: {
    usernameField: "#username",
    passwordField: "#password",
    loginButton:   "#login",
  },
  messages: { invalidCredentials: "Your username or password is incorrect." },
};

describe("TestCaseGenerator", () => {
  const requirement = "User can log in with valid credentials";

  // ── Happy path ─────────────────────────────────────────────────────────────
  it("returns test cases from valid LLM JSON response", async () => {
    const cases = Array.from({ length: 6 }, (_, i) => makeTestCase(`TC_00${i + 1}`));
    const provider  = makeMockProvider(JSON.stringify(cases));
    const generator = new TestCaseGenerator(provider);

    const result = await generator.generate(requirement, VALID_KB);
    expect(result).toHaveLength(6);
    expect(result[0]?.id).toBe("TC_001");
  });

  it("works without a knowledge base argument", async () => {
    const cases    = Array.from({ length: 5 }, (_, i) => makeTestCase(`TC_00${i + 1}`));
    const provider = makeMockProvider(JSON.stringify(cases));
    const gen      = new TestCaseGenerator(provider);
    const result   = await gen.generate(requirement);
    expect(result).toHaveLength(5);
  });

  // ── Count enforcement ──────────────────────────────────────────────────────
  it("throws when LLM returns fewer than 4 test cases", async () => {
    const cases    = Array.from({ length: 3 }, (_, i) => makeTestCase(`TC_00${i + 1}`));
    const provider = makeMockProvider(JSON.stringify(cases));
    const gen      = new TestCaseGenerator(provider);

    await expect(gen.generate(requirement, VALID_KB)).rejects.toThrow(/at least 4 test cases/);
  });

  it("truncates to 10 when LLM returns more than 10 test cases", async () => {
    const cases    = Array.from({ length: 12 }, (_, i) => makeTestCase(`TC_0${i + 1}`));
    const provider = makeMockProvider(JSON.stringify(cases));
    const gen      = new TestCaseGenerator(provider);

    const result = await gen.generate(requirement, VALID_KB);
    expect(result).toHaveLength(10);
  });

  it("accepts exactly 4 test cases (minimum boundary)", async () => {
    const cases    = Array.from({ length: 4 }, (_, i) => makeTestCase(`TC_00${i + 1}`));
    const provider = makeMockProvider(JSON.stringify(cases));
    const gen      = new TestCaseGenerator(provider);

    await expect(gen.generate(requirement, VALID_KB)).resolves.toHaveLength(4);
  });

  it("accepts exactly 10 test cases (maximum boundary)", async () => {
    const cases    = Array.from({ length: 10 }, (_, i) => makeTestCase(`TC_0${i + 1}`));
    const provider = makeMockProvider(JSON.stringify(cases));
    const gen      = new TestCaseGenerator(provider);

    await expect(gen.generate(requirement, VALID_KB)).resolves.toHaveLength(10);
  });

  // ── Prompt includes KB context ─────────────────────────────────────────────
  it("includes selector names in the prompt when KB is provided", async () => {
    const cases    = Array.from({ length: 6 }, (_, i) => makeTestCase(`TC_00${i + 1}`));
    const provider = makeMockProvider(JSON.stringify(cases));
    const gen      = new TestCaseGenerator(provider);

    await gen.generate(requirement, VALID_KB);

    const capturedPrompt = (provider.generateResponse as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(capturedPrompt).toContain("usernameField");
    expect(capturedPrompt).toContain("passwordField");
    expect(capturedPrompt).toContain("Your username or password is incorrect.");
  });

  it("does not include selector names in prompt when KB is absent", async () => {
    const cases    = Array.from({ length: 5 }, (_, i) => makeTestCase(`TC_00${i + 1}`));
    const provider = makeMockProvider(JSON.stringify(cases));
    const gen      = new TestCaseGenerator(provider);

    await gen.generate(requirement);

    const capturedPrompt = (provider.generateResponse as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    // Selector names from VALID_KB must not appear — there is no KB to include them from
    expect(capturedPrompt).not.toContain("usernameField");
    expect(capturedPrompt).not.toContain("passwordField");
  });

  // ── Repair: markdown fences from LLM ──────────────────────────────────────
  it("handles markdown-fenced JSON from LLM", async () => {
    const cases = Array.from({ length: 6 }, (_, i) => makeTestCase(`TC_00${i + 1}`));
    const fenced = "```json\n" + JSON.stringify(cases) + "\n```";
    const gen    = new TestCaseGenerator(makeMockProvider(fenced));

    await expect(gen.generate(requirement, VALID_KB)).resolves.toHaveLength(6);
  });
});
