import type { LLMProvider }    from "../../providers/interfaces/LLMProvider.js";
import type { TestCase }       from "../../models/TestCase.js";
import { AIJsonParser }        from "../../utils/AIJsonParser.js";
import type { KnowledgeBase }  from "../../models/KnowledgeBase.js";
import { SelectorRetriever }   from "../../kb/SelectorRetriever.js";

const MIN_TEST_CASES = 4;
const MAX_TEST_CASES = 10;

/**
 * Generates a structured test-case suite from a single natural-language requirement.
 *
 * Enforces a count range of 4–10 test cases per call. If the LLM returns fewer than 4,
 * the call throws so callers can retry; if it returns more than 10, excess cases are
 * silently truncated to keep per-spec file size manageable.
 */
export class TestCaseGenerator {
  private readonly retriever = new SelectorRetriever();

  constructor(private llmProvider: LLMProvider) {}

  /**
   * Generate 4–10 test cases for the given requirement.
   *
   * @param requirement  - The requirement or user story to generate tests for.
   * @param knowledgeBase - Optional page KB. When provided, element names and messages are
   *                        injected into the prompt so test steps reference real selectors.
   * @throws {Error} When the LLM returns fewer than 4 test cases.
   */
  async generate(
    requirement: string,
    knowledgeBase?: KnowledgeBase,
  ): Promise<TestCase[]> {

    const kbContext = this.buildKbContext(requirement, knowledgeBase);

    const prompt = `
You are a Senior QA Engineer writing a comprehensive regression suite.

${kbContext}

REQUIREMENT:
${requirement}

Rules:
- Generate between 6 and 8 meaningful test cases.
- Every test case must exercise a DISTINCT scenario — no duplicates.
- Cover: positive paths, negative paths, validation errors, boundary values, edge cases, security.
- Each test case must use different data or trigger a different code path than every other.
- Steps must reference the EXACT element names listed in AVAILABLE ELEMENTS above (if provided).
- Do NOT invent elements that are not in the list.
- expectedResult must be a specific, observable outcome — not vague like "it works".
- Assign a "type" from: positive | negative | validation | edge-case | security | boundary
- Assign a "priority" using these rules:
    Critical → authentication bypass, security vulnerabilities, data loss scenarios
    High     → core happy-path flows, main business functionality
    Medium   → negative paths, invalid input handling, error messages
    Low      → edge cases, boundary values, cosmetic validation
- Return ONLY valid JSON. No markdown. No explanation.

JSON structure:

[
  {
    "id": "TC_001",
    "title": "",
    "type": "positive",
    "priority": "High",
    "preconditions": [],
    "steps": [],
    "expectedResult": ""
  }
]

Requirement:
${requirement}
`;

    const response  = await this.llmProvider.generateResponse(prompt);
    const testCases = AIJsonParser.parse<TestCase[]>(response);

    if (!Array.isArray(testCases) || testCases.length < MIN_TEST_CASES) {
      throw new Error(
        `TestCaseGenerator: expected at least ${MIN_TEST_CASES} test cases, got ${Array.isArray(testCases) ? testCases.length : 0}. ` +
        `The LLM response may be truncated or malformed.`
      );
    }

    return testCases.slice(0, MAX_TEST_CASES);
  }

  private buildKbContext(requirement: string, kb: KnowledgeBase | undefined): string {
    if (!kb) return "";

    // Retrieve only selectors relevant to this specific requirement
    const ctx = this.retriever.retrieve(requirement, kb, 12);

    const lines: string[] = [];

    lines.push(`PAGE: ${kb.pageName}`);
    lines.push(`URL : ${kb.url}`);

    if (Object.keys(ctx.selectors).length > 0) {
      lines.push(`\nAVAILABLE ELEMENTS (${ctx.stats.retrievedSelectors}/${ctx.stats.totalSelectors} relevant — use these exact names in test steps):`);
      for (const key of Object.keys(ctx.selectors)) {
        lines.push(`  - ${key}`);
      }
    }

    if (Object.keys(ctx.messages).length > 0) {
      lines.push("\nKNOWN VALIDATION MESSAGES (use these exact strings in expectedResult):");
      for (const value of Object.values(ctx.messages)) {
        lines.push(`  - "${value}"`);
      }
    }

    if (kb.notes) {
      lines.push(`\nPAGE NOTES:\n  ${kb.notes}`);
    }

    return lines.length > 0 ? lines.join("\n") + "\n" : "";
  }
}
