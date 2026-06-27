import type { LLMProvider }    from "../../providers/interfaces/LLMProvider.js";
import type { KnowledgeBase } from "../../models/KnowledgeBase.js";

export class RequirementGenerator {
  constructor(private llmProvider: LLMProvider) {}

  async generate(knowledgeBase: KnowledgeBase): Promise<string> {
    const pageName = knowledgeBase.pageName ?? "Unknown Page";
    const url      = knowledgeBase.url      ?? "";

    const selectorList = Object.entries(knowledgeBase.selectors)
      .map(([k, v]) => `  ${k}: ${v}`).join("\n") || "  (none)";

    const messageList = knowledgeBase.messages
      ? Object.entries(knowledgeBase.messages).map(([k, v]) => `  ${k}: "${v}"`).join("\n")
      : "  (none)";

    const prompt = `
You are a Senior QA Engineer writing test requirements for a web page.

PAGE NAME : ${pageName}
PAGE URL  : ${url}

INTERACTIVE ELEMENTS AVAILABLE ON THIS PAGE:
${selectorList}

KNOWN MESSAGES / VALIDATIONS:
${messageList}

${knowledgeBase.notes ? `NOTES:\n${knowledgeBase.notes}\n` : ""}

Based ONLY on what is actually present on this page, write a single comprehensive test requirement paragraph.

Rules:
- Cover every meaningful user action (filling inputs, clicking buttons, navigating)
- Cover validation scenarios (empty fields, invalid formats, boundary values)
- Cover success scenarios (what happens when an action completes successfully)
- Cover error scenarios using the actual message text listed above
- Be specific — mention the actual element names and actions
- Write as ONE paragraph of plain English (not a list, not bullet points)
- Do NOT invent features not supported by the listed elements
- Return ONLY the requirement text — no labels, no headings, no markdown

Requirement:
`;

    const response = await this.llmProvider.generateResponse(prompt);
    return response.trim();
  }
}
