/**
 * ScenarioInferenceEngine
 *
 * Takes a PageContext (real DOM analysis) + a list of scenarios already in the
 * Excel, then asks the LLM to generate ADDITIONAL scenarios not yet covered.
 *
 * Grounding principle: the prompt includes verbatim element labels, button text,
 * nav link names, and validation messages from the live page — the LLM cannot
 * invent elements that don't exist.
 */

import type { LLMProvider } from "../../../llm/src/interfaces/LLMProvider.js";
import type { PageContext }  from "./PageAnalyzer.js";

export interface InferredScenario {
  scenario:    string;
  description: string;
  priority:    "smoke" | "regression";
}

export class ScenarioInferenceEngine {

  constructor(private llm: LLMProvider) {}

  async infer(
    pageContext:        PageContext,
    featureName:        string,
    existingScenarios:  string[],
  ): Promise<InferredScenario[]> {

    const contextStr  = this.buildContextString(pageContext);
    const existingStr = existingScenarios.length > 0
      ? `\nALREADY COVERED IN EXCEL (do NOT generate duplicates of these):\n${
          existingScenarios.map(s => `  - ${s}`).join("\n")
        }\n`
      : "";

    const prompt = `You are a Senior QA Engineer discovering test scenarios for a web page.

PAGE ANALYSIS (real DOM — ground every scenario in the elements below):
${contextStr}

FEATURE: ${featureName}
${existingStr}
Generate 5-8 ADDITIONAL test scenarios not already covered above.
Prioritise:
  - Positive happy paths and main business flows
  - Negative paths and invalid input handling
  - Boundary values (empty, max-length, special characters)
  - Security cases (XSS, SQL injection, authentication bypass)
  - Edge cases (network errors, duplicate submission, back-navigation)

Rules:
  - Every scenario MUST reference only elements visible in the PAGE ANALYSIS above.
  - Do NOT invent form fields, buttons, or messages that are not listed.
  - "description" must be specific acceptance criteria — what action, what expected result.
  - "priority": smoke = core user journey; regression = everything else.

Return ONLY valid JSON. No markdown. No explanation.

[
  {
    "scenario": "short scenario name",
    "description": "specific acceptance criteria with expected outcome",
    "priority": "smoke"
  }
]`;

    const response = await this.llm.generateResponse(prompt);
    const cleaned  = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned) as InferredScenario[];
  }

  private buildContextString(ctx: PageContext): string {
    const lines: string[] = [];

    lines.push(`URL  : ${ctx.url}`);
    lines.push(`Title: ${ctx.title}`);

    if (ctx.headings.length > 0) {
      lines.push(`\nPage Headings:\n${ctx.headings.map(h => `  - ${h}`).join("\n")}`);
    }

    if (ctx.forms.length > 0) {
      lines.push(`\nForms (${ctx.forms.length}):`);
      for (const form of ctx.forms) {
        lines.push(`  Submit button: "${form.submitText}"`);
        for (const f of form.fields) {
          const req = f.required ? " (required)" : "";
          const ph  = f.placeholder ? `, placeholder: "${f.placeholder}"` : "";
          lines.push(`    Field: "${f.label}" [${f.inputType}${req}${ph}]`);
        }
      }
    }

    if (ctx.buttons.length > 0) {
      lines.push(`\nButtons: ${ctx.buttons.map(b => `"${b}"`).join(", ")}`);
    }

    if (ctx.navLinks.length > 0) {
      lines.push(`\nNavigation links: ${ctx.navLinks.map(l => `"${l}"`).join(", ")}`);
    }

    if (ctx.validationMessages.length > 0) {
      lines.push(
        `\nKnown Validation Messages:\n${
          ctx.validationMessages.map(m => `  - "${m}"`).join("\n")
        }`,
      );
    }

    return lines.join("\n");
  }
}
