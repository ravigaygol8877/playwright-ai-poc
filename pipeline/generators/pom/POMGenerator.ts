/**
 * POMGenerator — generates a TypeScript Page Object Model from a KB JSON.
 *
 * Follows the enterprise pattern:
 * - default export class
 * - no goto/navigate methods (navigation handled externally)
 * - inline assertions inside action methods (no assertions object)
 * - console.info() logging at end of each method
 * - message strings as private readonly class properties (not Locators)
 */

import type { LLMProvider } from "../../providers/interfaces/LLMProvider.js";
import { AIJsonParser } from "../../utils/AIJsonParser.js";
import { toMethodName } from "../playwright/PlaywrightGenerator.js";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ActionMethod {
  name:   string;
  params: Array<{ name: string; type: string }>;
  body:   string;
}

export interface POMResult {
  className: string;
  fileName:  string;
  code:      string;
}

// ─── Naming helpers ────────────────────────────────────────────────────────────

const APP_PREFIXES = new Set([
  'parabank', 'parasoft', 'sauce', 'saucedemo', 'demo', 'app', 'web',
]);

export function kbKeyToClassName(kbKey: string): string {
  const parts    = kbKey.split('-');
  const filtered = parts[0] && APP_PREFIXES.has(parts[0]) ? parts.slice(1) : parts;

  const pascal = filtered
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

  const lower = pascal.toLowerCase();
  if (lower.endsWith('page')) {
    const stem = pascal.slice(0, pascal.length - 4);
    return stem + 'Page';
  }

  return pascal + 'Page';
}

// Returns camelCase.page.ts  e.g. LoginPage → login.page.ts
function kbKeyToFileName(className: string): string {
  const camel = className.charAt(0).toLowerCase() + className.slice(1);
  return `${camel}.page.ts`;
}

// ─── Locator builder ───────────────────────────────────────────────────────────

function isCollection(key: string): boolean {
  return /cards|items|rows|list|results|elements$/i.test(key);
}

function quoteSelector(s: string): string {
  if (!s.includes("'")) return `'${s}'`;
  if (!s.includes('"')) return `"${s}"`;
  return `'${s.replace(/'/g, "\\'")}'`;
}

function buildLocatorExpr(selectorStr: string, key: string): string {
  const parts = selectorStr
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return `page.locator('')`;

  const first  = `page.locator(${quoteSelector(parts[0]!)})`;
  const chains = parts.slice(1).map(s => `.or(page.locator(${quoteSelector(s)}))`).join('');
  const suffix = isCollection(key) ? '' : '.first()';

  return `${first}${chains}${suffix}`;
}

// ─── POMGenerator class ────────────────────────────────────────────────────────

export class POMGenerator {
  constructor(private llmProvider: LLMProvider) {}

  async generate(
    kb:               import("../../models/KnowledgeBase.js").KnowledgeBase,
    kbKey:            string,
    testCaseTitles?:  string[],
  ): Promise<POMResult> {
    const pageName  = kb.pageName ?? kbKey;
    const url       = kb.url      ?? '/';
    const selectors = kb.selectors ?? {};
    const messages  = kb.messages  ?? {};

    const className    = kbKeyToClassName(kbKey);
    const fileName     = kbKeyToFileName(className);
    const selectorKeys = Object.keys(selectors);
    const messageKeys  = Object.keys(messages);

    const methodNames  = testCaseTitles?.map(t => toMethodName(t));

    const actionMethods = await this.generateActionMethods(
      pageName, url, selectors, messages, methodNames
    );

    const code = this.buildCode(
      className, selectors, messages,
      selectorKeys, messageKeys, actionMethods
    );

    return { className, fileName, code };
  }

  private async generateActionMethods(
    pageName:     string,
    url:          string,
    selectors:    Record<string, string>,
    messages:     Record<string, string>,
    methodNames?: string[],
  ): Promise<ActionMethod[]> {

    const selectorList = Object.entries(selectors)
      .map(([k]) => `  - ${k}`)
      .join('\n');

    const messageList = Object.entries(messages)
      .map(([k, v]) => `  - ${k}: "${v}"  (access via this.${k} as a string)`)
      .join('\n');

    const methodConstraint = methodNames && methodNames.length > 0
      ? `You MUST generate exactly these methods (one per entry, in this order):\n${methodNames.map(n => `  - ${n}`).join('\n')}\n\nDo NOT add extra methods or rename them.`
      : `Generate methods for meaningful user actions on this page.`;

    const prompt = `
You are a Senior Playwright Automation Engineer.

Generate TypeScript action methods for a Playwright Page Object Model class.

Page: ${pageName}
URL:  ${url}

Available locator properties (use "this.propertyName" in method bodies):
${selectorList || '  (none)'}

Known validation message string properties (use "this.propertyName" as a string in toHaveText/toContainText):
${messageList || '  (none)'}

${methodConstraint}

Rules:
- Do NOT generate a goto method.
- Methods must have NO parameters — use locator properties directly.
- Each method body uses "this.propertyName" — NOT page.locator(selector).
- Use "await" for every locator interaction.
- Inline assertions using expect(...).toBeVisible(), expect(...).toContainText(this.msgProp), etc.
- Each method must end with: console.info('Verified [brief description].');
- Return ONLY a JSON array. No markdown, no explanation.

JSON format:
[
  {
    "name": "loginWithValidData",
    "params": [],
    "body": "await this.usernameField.fill('testuser');\nawait this.passwordField.fill('secret');\nawait this.loginButton.click();\nconsole.info('Verified login with valid data.');"
  }
]
`;

    try {
      const response = await this.llmProvider.generateResponse(prompt);
      const methods  = AIJsonParser.parse<ActionMethod[]>(response);
      return Array.isArray(methods) ? methods : this.fallbackMethods();
    } catch {
      return this.fallbackMethods();
    }
  }

  private fallbackMethods(): ActionMethod[] {
    return [];
  }

  private buildCode(
    className:    string,
    selectors:    Record<string, string>,
    messages:     Record<string, string>,
    selectorKeys: string[],
    messageKeys:  string[],
    actionMethods: ActionMethod[],
  ): string {

    // Locator property declarations
    const locatorDecls = selectorKeys
      .map(k => `    private readonly ${k}: Locator;`)
      .join('\n');

    // Message string property declarations (private readonly strings, not Locators)
    const msgConstDecls = messageKeys
      .map(k => `    private readonly ${k} = '${(messages[k] ?? '').replace(/'/g, "\\'")}';`)
      .join('\n');

    // Constructor locator wiring
    const locatorInits = selectorKeys
      .map(k => `        this.${k} = ${buildLocatorExpr(selectors[k] ?? '', k)};`)
      .join('\n');

    // Action methods
    const methodBlocks = actionMethods.map(m => {
      const paramStr   = m.params.map(p => `${p.name}: ${p.type}`).join(', ');
      const bodyLines  = m.body.split('\n').map(l => `        ${l}`).join('\n');
      return `    async ${m.name}(${paramStr}): Promise<void> {\n${bodyLines}\n    }`;
    }).join('\n\n');

    const locatorSection  = locatorDecls  ? `\n${locatorDecls}\n`  : '';
    const msgSection      = msgConstDecls ? `\n${msgConstDecls}\n` : '';
    const initSection     = locatorInits  ? `\n${locatorInits}\n`  : '';
    const methodSection   = methodBlocks  ? `\n${methodBlocks}\n`  : '';

    return `import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export default class ${className} {
    private readonly page: Page;
${locatorSection}${msgSection}
    constructor(page: Page) {
        this.page = page;
${initSection}    }
${methodSection}}
`;
  }
}
