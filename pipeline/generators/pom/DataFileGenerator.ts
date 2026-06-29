/**
 * DataFileGenerator — generates support/data/{className}Data.json from a KB JSON.
 *
 * Produces a plain JSON file (not TypeScript) following the enterprise pattern
 * where test data lives in support/data/ as .json files.
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

    const className     = kbKeyToClassName(kbKey);
    const interfaceName = `${className}Data`;
    const camelName     = className.charAt(0).toLowerCase() + className.slice(1);
    const fileName      = `${camelName}Data.json`;

    const fields = await this.generateFields(
      pageName, url, selectors, messages, success
    );

    const code = this.buildCode(fields);
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
You are a Senior QA Engineer generating test data for a Playwright Page Object.

Page: ${pageName}
URL:  ${url}

Available form elements:
${selectorList || '  (none)'}

Known validation messages:
${messageList || '  (none)'}

Success indicators:
${successList || '  (none)'}

Generate test data fields. Rules:
- Include "valid" and "invalid" variants for key inputs.
- Include exact error message strings from the Known validation messages list (copy verbatim).
- Include URL pattern strings for success checks.
- All values must be plain strings (no TypeScript types, no RegExp syntax, no quotes around values).
- Provide realistic default values.
- Return ONLY JSON. No markdown.

JSON format:
[
  {
    "name": "validEmail",
    "type": "string",
    "value": "user@example.com",
    "comment": "Valid email for login"
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
        value:   val,
        comment: 'Exact error message',
      });
    }

    if (success['redirectUrl']) {
      fields.push({
        name:    'successUrlPattern',
        type:    'string',
        value:   success['redirectUrl'] ?? '',
        comment: 'URL after successful action',
      });
    }

    return fields;
  }

  private buildCode(fields: DataField[]): string {
    const obj: Record<string, string> = {};

    for (const f of fields) {
      let val = f.value.trim();
      // Strip TypeScript-specific wrappers
      if ((val.startsWith("'") && val.endsWith("'")) ||
          (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1);
      } else if (val.startsWith('/') && val.lastIndexOf('/') > 0) {
        // RegExp literal — store as plain string pattern
        val = val.slice(1, val.lastIndexOf('/'));
      }
      obj[f.name] = val;
    }

    return JSON.stringify(obj, null, 2);
  }
}
