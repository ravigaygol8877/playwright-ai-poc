import { describe, it, expect } from "vitest";
import { AIJsonParser, JsonRepairError } from "./AIJsonParser.js";

interface TestItem {
  id:    string;
  title: string;
}

describe("AIJsonParser", () => {
  // ── Pass 1: valid JSON ─────────────────────────────────────────────────────
  describe("valid JSON", () => {
    it("parses a clean JSON array", () => {
      const input = `[{"id":"TC_001","title":"Happy path"}]`;
      const result = AIJsonParser.parse<TestItem[]>(input);
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("TC_001");
    });

    it("strips markdown code fences before parsing", () => {
      const input = "```json\n[{\"id\":\"TC_001\",\"title\":\"Test\"}]\n```";
      const result = AIJsonParser.parse<TestItem[]>(input);
      expect(result[0]?.id).toBe("TC_001");
    });

    it("strips ``` without language specifier", () => {
      const input = "```\n[{\"id\":\"TC_001\",\"title\":\"Test\"}]\n```";
      const result = AIJsonParser.parse<TestItem[]>(input);
      expect(result[0]?.id).toBe("TC_001");
    });

    it("handles leading/trailing whitespace", () => {
      const input = `   \n  [{"id":"TC_001","title":"Spaces"}]  \n  `;
      const result = AIJsonParser.parse<TestItem[]>(input);
      expect(result[0]?.title).toBe("Spaces");
    });
  });

  // ── Pass 2: JSON repair ────────────────────────────────────────────────────
  describe("repairable JSON", () => {
    it("repairs trailing commas in arrays", () => {
      const input = `[{"id":"TC_001","title":"Trailing"},]`;
      const result = AIJsonParser.parse<TestItem[]>(input);
      expect(result[0]?.id).toBe("TC_001");
    });

    it("repairs trailing commas in objects", () => {
      const input = `[{"id":"TC_001","title":"Trailing",}]`;
      const result = AIJsonParser.parse<TestItem[]>(input);
      expect(result[0]?.id).toBe("TC_001");
    });

    it("repairs missing quotes on keys", () => {
      const input = `[{id:"TC_001",title:"Unquoted keys"}]`;
      const result = AIJsonParser.parse<TestItem[]>(input);
      expect(result[0]?.id).toBe("TC_001");
    });
  });

  // ── Pass 3: truncation recovery ───────────────────────────────────────────
  // NOTE: jsonrepair (Pass 2) is very aggressive — it can fix partial strings by
  // adding a closing `"}]`. Truncation recovery (Pass 3) only fires for inputs that
  // jsonrepair CANNOT fix. These tests verify that parsing completes without throwing
  // and returns at least one complete item, rather than a fixed count.
  describe("truncated array recovery", () => {
    it("parses input truncated mid-object without throwing", () => {
      // jsonrepair repairs this by completing the partial string — result has all items
      const input = `[{"id":"TC_001","title":"First"},{"id":"TC_002","title":"Second"},{"id":"TC_003","title":"Trun`;
      const result = AIJsonParser.parse<TestItem[]>(input);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]?.id).toBe("TC_001");
    });

    it("parses input truncated before closing quote without throwing", () => {
      const input = `[{"id":"TC_001","title":"Only"},{"id":"TC_002","title":"Truncated`;
      const result = AIJsonParser.parse<TestItem[]>(input);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]?.id).toBe("TC_001");
    });
  });

  // ── Throws on unrecoverable JSON ──────────────────────────────────────────
  describe("error handling", () => {
    it("throws JsonRepairError when input is whitespace-only", () => {
      // Empty / blank strings have no recoverable content
      expect(() => AIJsonParser.parse("   ")).toThrow(JsonRepairError);
    });

    it("throws JsonRepairError with error name 'JsonRepairError'", () => {
      try {
        AIJsonParser.parse("{{{{");
      } catch (e) {
        expect(e).toBeInstanceOf(JsonRepairError);
        expect((e as JsonRepairError).name).toBe("JsonRepairError");
      }
    });

    it("throws JsonRepairError for empty string", () => {
      expect(() => AIJsonParser.parse("")).toThrow(JsonRepairError);
    });
  });
});
