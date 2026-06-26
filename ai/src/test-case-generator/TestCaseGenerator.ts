import type { LLMProvider }    from "../../../llm/src/interfaces/LLMProvider.js";
import type { TestCase }       from "../models/TestCase.js";
import { AIJsonParser }        from "../utils/AIJsonParser.js";
import type { KnowledgeBase }  from "../models/KnowledgeBase.js";

const MIN_TEST_CASES = 4;
const MAX_TEST_CASES = 10;

export class TestCaseGenerator {
  constructor(private llmProvider: LLMProvider) {}

  async generate(
    requirement: string,
    knowledgeBase?: KnowledgeBase,
  ): Promise<TestCase[]> {

    const kbContext = this.buildKbContext(knowledgeBase);

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

  private buildKbContext(kb: KnowledgeBase | undefined): string {
    if (!kb) return "";

    const lines: string[] = [];

    lines.push(`PAGE: ${kb.pageName}`);
    lines.push(`URL : ${kb.url}`);

    if (Object.keys(kb.selectors).length > 0) {
      lines.push("\nAVAILABLE ELEMENTS (use these exact names in test steps):");
      for (const key of Object.keys(kb.selectors)) {
        lines.push(`  - ${key}`);
      }
    }

    if (kb.messages && Object.keys(kb.messages).length > 0) {
      lines.push("\nKNOWN VALIDATION MESSAGES (use these exact strings in expectedResult):");
      for (const value of Object.values(kb.messages)) {
        lines.push(`  - "${value}"`);
      }
    }

    if (kb.notes) {
      lines.push(`\nPAGE NOTES:\n  ${kb.notes}`);
    }

    return lines.length > 0 ? lines.join("\n") + "\n" : "";
  }
}
