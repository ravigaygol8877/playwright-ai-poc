/**
 * DataFileGenerator — generates src/data/{ClassName}.data.ts from a KB JSON.
 *
 * Uses LLM to produce meaningful typed test data (valid/invalid values, error strings,
 * URL patterns) appropriate for the page described by the KB.
 */

import type { LLMProvider } from "../../providers/interfaces/LLMProvider.js";
import { AIJsonParser } from "../../utils/AIJsonParser.js";
import { kbKeyToClassName } from "./POMGenerator.js";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DataField {
  name:    string;
  type:    string;
  value:   string;
  comment: string;
}

export interface DataFileResult {
  interfaceName: string;
  fileName:      string;
  code:          string;
}

// ─── DataFileGenerator ─────────────────────────────────────────────────────────

export class DataFileGenerator {
  constructor(private llmProvider: LLMProvider) {}

  async generate(
    kb: import("../../models/KnowledgeBase.js").KnowledgeBase,
    kbKey: string,
  ): Promise<DataFileResult> {

    const pageName  = kb.pageName ?? kbKey;
    const url       = kb.url      ?? '/';
    const messages  = kb.messages  ?? {};
    const success   = kb.success   ?? {};
    const selectors = kb.selectors ?? {};

    const className    = kbKeyToClassName(kbKey);
    const interfaceName = `${className}Data`;
    const fileName      = `${className.charAt(0).toLowerCase()}${className.slice(1)}.data.ts`;

    const fields = await this.generateFields(
      pageName, url, selectors, messages, success
    );

    const code = this.buildCode(interfaceName, fields);
    return { interfaceName, fileName, code };
  }

  private async generateFields(
    pageName:  string,
    url:       string,
    selectors: Record<string, string>,
    messages:  Record<string, string>,
    success:   Record<string, string>,
  ): Promise<DataField[]> {

    const selectorList = Object.keys(selectors).map(k => `  - ${k}`).join('\n');
    const messageList  = Object.entries(messages).map(([k, v]) => `  - ${k}: "${v}"`).join('\n');
    const successList  = Object.entries(success).map(([k, v]) => `  - ${k}: "${v}"`).join('\n');

    const prompt = `
You are a Senior QA Engineer generating typed test data for a Playwright Page Object.

Page: ${pageName}
URL:  ${url}

Available form elements:
${selectorList || '  (none)'}

Known validation messages:
${messageList || '  (none)'}

Success indicators:
${successList || '  (none)'}

Generate test data fields. Rules:
- Include "valid" and "invalid" variants for key inputs (drug names, usernames, zip codes, amounts).
- Include exact error message strings from the Known validation messages list (copy verbatim).
- Include URL pattern strings for success checks (e.g. "/prescription/").
- Use TypeScript types: "string", "RegExp", "number".
- For RegExp values use: "/pattern/" format (no quotes) — these become RegExp literals in code.
- Provide realistic default values (not "example" or "test123").
- Return ONLY JSON. No markdown.

JSON format:
[
  {
    "name": "validDrugName",
    "type": "string",
    "value": "'atorvastatin'",
    "comment": "Common cholesterol medication"
  },
  {
    "name": "successUrlPattern",
    "type": "RegExp",
    "value": "/\\/prescription\\//",
    "comment": "URL after successful drug search"
  }
]
`;

    try {
      const response = await this.llmProvider.generateResponse(prompt);
      const fields   = AIJsonParser.parse<DataField[]>(response);
      return Array.isArray(fields) ? fields : this.fallbackFields(messages, success);
    } catch {
      return this.fallbackFields(messages, success);
    }
  }

  private fallbackFields(
    messages: Record<string, string>,
    success:  Record<string, string>,
  ): DataField[] {
    const fields: DataField[] = [];

    for (const [key, val] of Object.entries(messages)) {
      fields.push({
        name:    key,
        type:    'string',
        value:   `'${val}'`,
        comment: 'Exact error message — copy verbatim',
      });
    }

    if (success['redirectUrl']) {
      fields.push({
        name:    'successUrlPattern',
        type:    'RegExp',
        value:   `/${success['redirectUrl']?.replace(/\//g, '\\/')}/`,
        comment: 'URL after successful action',
      });
    }

    return fields;
  }

  private buildCode(interfaceName: string, fields: DataField[]): string {
    const interfaceFields = fields
      .map(f => `  ${f.name}: ${f.type};`)
      .join('\n');

    const dataFields = fields
      .map(f => {
        const comment = f.comment ? `  // ${f.comment}` : '';
        // Defensive: if the model returned a bare string value (no surrounding quotes/slashes),
        // wrap it so the generated TypeScript is always valid.
        let valueStr = f.value;
        if (f.type === 'string') {
          const trimmed = valueStr.trim();
          const isQuoted = (trimmed.startsWith("'") && trimmed.endsWith("'"))
                        || (trimmed.startsWith('"') && trimmed.endsWith('"'));
          if (!isQuoted) valueStr = `'${trimmed.replace(/'/g, "\\'")}'`;
        } else if (f.type === 'RegExp') {
          const trimmed = valueStr.trim();
          if (!trimmed.startsWith('/')) valueStr = `/${trimmed}/`;
        }
        return `${comment}\n  ${f.name}: ${valueStr},`;
      })
      .join('\n');

    const varName =
      interfaceName.charAt(0).toLowerCase() + interfaceName.slice(1);

    return `export interface ${interfaceName} {
${interfaceFields}
}

export const ${varName}: ${interfaceName} = {
${dataFields}
};
`;
  }
}
