import { describe, it, expect, vi } from "vitest";
import { RuleBasedActionModelGenerator } from "./RuleBasedActionModelGenerator.js";
import type { AIActionModelGenerator }    from "./AIActionModelGenerator.js";
import type { ActionModel }               from "./ActionModel.js";

// Minimal mock for the AI fallback — only used when rules fail to classify
function makeMockFallback(response: ActionModel = { action: "click", target: "submitButton" }): AIActionModelGenerator {
  return {
    generate: vi.fn().mockResolvedValue(response),
  } as unknown as AIActionModelGenerator;
}

describe("RuleBasedActionModelGenerator", () => {
  const targets = ["usernameField", "passwordField", "loginButton", "emailInput"];

  // ── Noop classification ────────────────────────────────────────────────────
  describe("noop", () => {
    const cases = [
      "Verify the error message is visible",
      "Check that the login button is enabled",
      "Observe the page title",
      "Confirm the URL has changed",
      "Ensure the form is displayed",
      "Validate that the field is required",
      "Assert the modal is open",
    ];
    it.each(cases)('classifies "%s" as noop', async (step) => {
      const gen = new RuleBasedActionModelGenerator(makeMockFallback());
      const result = await gen.generate(step, targets);
      expect(result.action).toBe("noop");
    });
  });

  // ── Goto classification ────────────────────────────────────────────────────
  describe("goto", () => {
    const cases = [
      "Navigate to the login page",
      "Go to the homepage",
      "Open the registration form",
      "Launch the application",
      "Visit the settings page",
      "Load the dashboard",
      "Access the admin panel",
    ];
    it.each(cases)('classifies "%s" as goto', async (step) => {
      const gen = new RuleBasedActionModelGenerator(makeMockFallback());
      const result = await gen.generate(step, targets);
      expect(result.action).toBe("goto");
    });
  });

  // ── Fill classification ────────────────────────────────────────────────────
  describe("fill", () => {
    it("classifies 'Enter username in the field' as fill", async () => {
      const gen = new RuleBasedActionModelGenerator(makeMockFallback());
      const result = await gen.generate("Enter username in the field", targets);
      expect(result.action).toBe("fill");
    });

    it("classifies 'Type password into password field' as fill", async () => {
      const gen = new RuleBasedActionModelGenerator(makeMockFallback());
      const result = await gen.generate("Type password into password field", targets);
      expect(result.action).toBe("fill");
    });

    it("classifies 'Input email address' as fill", async () => {
      const gen = new RuleBasedActionModelGenerator(makeMockFallback());
      const result = await gen.generate("Input email address", targets);
      expect(result.action).toBe("fill");
    });
  });

  // ── Click classification ───────────────────────────────────────────────────
  describe("click", () => {
    const cases = [
      "Click the login button",
      "Press the submit button",
      "Tap the register link",
      "Select the remember me checkbox",
    ];
    it.each(cases)('classifies "%s" as click', async (step) => {
      const gen = new RuleBasedActionModelGenerator(makeMockFallback());
      const result = await gen.generate(step, targets);
      expect(result.action).toBe("click");
    });
  });

  // ── Data key inference ─────────────────────────────────────────────────────
  describe("dataKey inference", () => {
    it("infers invalidPassword for 'Enter invalid password'", async () => {
      const gen = new RuleBasedActionModelGenerator(makeMockFallback());
      const result = await gen.generate("Enter invalid password", targets);
      expect(result.dataKey).toBe("invalidPassword");
    });

    it("infers validUsername for 'Enter valid username'", async () => {
      const gen = new RuleBasedActionModelGenerator(makeMockFallback());
      const result = await gen.generate("Enter valid username", targets);
      expect(result.dataKey).toBe("validUsername");
    });

    it("infers lockedOutUsername for 'Enter locked out user credentials'", async () => {
      const gen = new RuleBasedActionModelGenerator(makeMockFallback());
      const result = await gen.generate("Enter locked out user credentials", targets);
      expect(result.dataKey).toBe("lockedOutUsername");
    });

    it("infers validPassword for generic 'Enter password'", async () => {
      const gen = new RuleBasedActionModelGenerator(makeMockFallback());
      const result = await gen.generate("Enter password", targets);
      expect(result.dataKey).toBe("validPassword");
    });
  });

  // ── Target inference ───────────────────────────────────────────────────────
  describe("target inference", () => {
    it("matches 'loginButton' from step containing 'login button'", async () => {
      const gen = new RuleBasedActionModelGenerator(makeMockFallback());
      const result = await gen.generate("Click login button", targets);
      expect(result.target).toBe("loginButton");
    });

    it("matches 'usernameField' from step containing 'username'", async () => {
      const gen = new RuleBasedActionModelGenerator(makeMockFallback());
      const result = await gen.generate("Enter username", targets);
      expect(result.target).toBe("usernameField");
    });

    it("matches 'emailInput' from step containing 'email'", async () => {
      const gen = new RuleBasedActionModelGenerator(makeMockFallback());
      const result = await gen.generate("Fill in email address", ["emailInput", "submitButton"]);
      expect(result.target).toBe("emailInput");
    });
  });

  // ── AI fallback ────────────────────────────────────────────────────────────
  describe("AI fallback", () => {
    it("delegates to AI when no rule matches", async () => {
      const fallback = makeMockFallback({ action: "click", target: "customElement" });
      const gen = new RuleBasedActionModelGenerator(fallback);
      const result = await gen.generate("Perform a completely unrecognised operation", targets);
      expect(fallback.generate).toHaveBeenCalledOnce();
      expect(result.target).toBe("customElement");
    });

    it("does NOT call AI for classified steps", async () => {
      const fallback = makeMockFallback();
      const gen = new RuleBasedActionModelGenerator(fallback);
      await gen.generate("Click the login button", targets);
      expect(fallback.generate).not.toHaveBeenCalled();
    });
  });
});
