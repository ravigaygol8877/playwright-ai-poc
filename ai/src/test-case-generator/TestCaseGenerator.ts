import type { LLMProvider } from "../../../llm/src/interfaces/LLMProvider.js";
import type { TestCase } from "../models/TestCase.js";
import { AIJsonParser } from "../utils/AIJsonParser.js";

export class TestCaseGenerator {
  constructor(private llmProvider: LLMProvider) {}

  async generate(
    requirement: string,
    knowledgeBase?: Record<string, unknown>
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

    const response = await this.llmProvider.generateResponse(prompt);
    return AIJsonParser.parse<TestCase[]>(response);
  }

  private buildKbContext(kb: Record<string, unknown> | undefined): string {
    if (!kb) return "";

    const pageName  = kb.pageName  as string | undefined;
    const url       = kb.url       as string | undefined;
    const selectors = kb.selectors as Record<string, string> | undefined;
    const messages  = kb.messages  as Record<string, string> | undefined;
    const notes     = kb.notes     as string | undefined;

    const lines: string[] = [];

    if (pageName) lines.push(`PAGE: ${pageName}`);
    if (url)      lines.push(`URL : ${url}`);

    if (selectors && Object.keys(selectors).length > 0) {
      lines.push("\nAVAILABLE ELEMENTS (use these exact names in test steps):");
      for (const [key] of Object.entries(selectors)) {
        lines.push(`  - ${key}`);
      }
    }

    if (messages && Object.keys(messages).length > 0) {
      lines.push("\nKNOWN VALIDATION MESSAGES (use these exact strings in expectedResult):");
      for (const [, value] of Object.entries(messages)) {
        lines.push(`  - "${value}"`);
      }
    }

    if (notes) {
      lines.push(`\nPAGE NOTES:\n  ${notes}`);
    }

    return lines.length > 0 ? lines.join("\n") + "\n" : "";
  }
}
