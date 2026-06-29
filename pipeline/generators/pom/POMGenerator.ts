/**
 * POMGenerator — generates a TypeScript Page Object Model from a KB JSON.
 *
 * Structure generation is fully template-based (reliable, zero compilation risk).
 * Action method generation uses the LLM (requires semantic understanding of
 * which element combinations form meaningful user actions).
 */

import type { LLMProvider } from "../../providers/interfaces/LLMProvider.js";
import { AIJsonParser } from "../../utils/AIJsonParser.js";

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

// Common app-prefix words that should be stripped when deriving class names.
// e.g. "parabank-login" → "LoginPage",  "my-app-dashboard" → "DashboardPage"
// Add your own app prefix here or in platform.config.json (prefix key).
const APP_PREFIXES = new Set([
  'parabank', 'parasoft', 'sauce', 'saucedemo', 'demo', 'app', 'web',
]);

export function kbKeyToClassName(kbKey: string): string {
  const parts    = kbKey.split('-');
  const filtered = parts[0] && APP_PREFIXES.has(parts[0]) ? parts.slice(1) : parts;

  const pascal = filtered
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

  // "Homepage" → "HomePage",  "LoginPage" → "LoginPage"
  const lower = pascal.toLowerCase();
  if (lower.endsWith('page')) {
    const stem = pascal.slice(0, pascal.length - 4); // strip trailing "page" (any case)
    return stem + 'Page';
  }

  return pascal + 'Page';
}

function kbKeyToFileName(className: string): string {
  return className + '.ts';
}

// ─── Locator builder ───────────────────────────────────────────────────────────

function isCollection(key: string): boolean {
  return /cards|items|rows|list|results|elements$/i.test(key);
}

function buildLocatorExpr(selectorStr: string, key: string): string {
  const parts = selectorStr
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return `page.locator('')`;

  // Use single-quoted outer string so attribute selectors like [attr="val"] don't break
  const first  = `page.locator('${parts[0]}')`;
  const chains = parts.slice(1).map(s => `.or(page.locator('${s}'))`).join('');
  const suffix = isCollection(key) ? '' : '.first()';

  return `${first}${chains}${suffix}`;
}

// ─── Assertion builder ─────────────────────────────────────────────────────────

function buildAssertionType(
  selectorKeys: string[],
  messageKeys:  string[],
): string {
  const methods: string[] = [];

  for (const key of selectorKeys) {
    methods.push(`    ${key}Visible:   () => Promise<void>;`);
    if (/input|select|textarea|field/i.test(key)) {
      methods.push(`    ${key}Enabled:   () => Promise<void>;`);
    }
  }

  for (const key of messageKeys) {
    methods.push(`    ${key}Visible:   () => Promise<void>;`);
  }

  methods.push(`    urlMatches:        (pattern: RegExp | string) => Promise<void>;`);

  return methods.join('\n');
}

function buildAssertionImpl(
  selectorKeys: string[],
  messageKeys:  string[],
): string {
  const methods: string[] = [];

  for (const key of selectorKeys) {
    methods.push(`      ${key}Visible:   () => expect(this.${key}).toBeVisible(),`);
    if (/input|select|textarea|field/i.test(key)) {
      methods.push(`      ${key}Enabled:   () => expect(this.${key}).toBeEnabled(),`);
    }
  }

  for (const key of messageKeys) {
    methods.push(`      ${key}Visible:   () => expect(this.${key}).toBeVisible(),`);
  }

  methods.push(`      urlMatches:        (pattern: RegExp | string) => expect(this.page).toHaveURL(pattern),`);

  return methods.join('\n');
}

// ─── POMGenerator class ────────────────────────────────────────────────────────

export class POMGenerator {
  constructor(private llmProvider: LLMProvider) {}

  async generate(kb: import("../../models/KnowledgeBase.js").KnowledgeBase, kbKey: string): Promise<POMResult> {
    const pageName  = kb.pageName ?? kbKey;
    const url       = kb.url      ?? '/';
    const selectors = kb.selectors ?? {};
    const messages  = kb.messages  ?? {};

    const className    = kbKeyToClassName(kbKey);
    const fileName     = kbKeyToFileName(className);
    const selectorKeys = Object.keys(selectors);
    const messageKeys  = Object.keys(messages);

    const actionMethods = await this.generateActionMethods(
      pageName, url, selectors, messages
    );

    const code = this.buildCode(
      className, url, selectors, messages,
      selectorKeys, messageKeys, actionMethods
    );

    return { className, fileName, code };
  }

  private async generateActionMethods(
    pageName:  string,
    url:       string,
    selectors: Record<string, string>,
    messages:  Record<string, string>,
  ): Promise<ActionMethod[]> {

    const selectorList = Object.entries(selectors)
      .map(([k]) => `  - ${k}`)
      .join('\n');

    const messageList = Object.entries(messages)
      .map(([k, v]) => `  - ${k}: "${v}"`)
      .join('\n');

    let promptPathname = url;
    try { promptPathname = new URL(url).pathname; } catch { /* relative path — use as-is */ }

    const prompt = `
You are a Senior Playwright Automation Engineer.

Given this Page Object Model context, generate TypeScript action methods for the class.

Page: ${pageName}
URL:  ${url}

Available locator properties (use "this.propertyName" in the body):
${selectorList || '  (none)'}

Known validation messages:
${messageList || '  (none)'}

Rules:
- Always include "goto" as the first method.
- Only generate methods for meaningful user actions (e.g., login, search, fill form, submit).
- Each method body uses "this.propertyName" — NOT page.locator(selector).
- Use "await" for every locator interaction.
- For goto: await this.navigate('${promptPathname}'); await this.waitForPageReady();
- Return ONLY JSON. No markdown. No explanation.

JSON format:
[
  {
    "name": "goto",
    "params": [],
    "body": "await this.navigate('/path');\nawait this.waitForPageReady();"
  },
  {
    "name": "submitForm",
    "params": [{"name": "value", "type": "string"}],
    "body": "await this.submitInput.fill(value);\nawait this.submitButton.click();"
  }
]
`;

    try {
      const response = await this.llmProvider.generateResponse(prompt);
      const methods  = AIJsonParser.parse<ActionMethod[]>(response);
      return Array.isArray(methods) ? methods : this.fallbackMethods(url);
    } catch {
      return this.fallbackMethods(url);
    }
  }

  private fallbackMethods(url: string): ActionMethod[] {
    let pathname = '/';
    try { pathname = new URL(url).pathname; } catch { /* use default */ }

    return [{
      name:   'goto',
      params: [],
      body:   `await this.navigate('${pathname}');\nawait this.waitForPageReady();`,
    }];
  }

  private buildCode(
    className:    string,
    url:          string,
    selectors:    Record<string, string>,
    messages:     Record<string, string>,
    selectorKeys: string[],
    messageKeys:  string[],
    actionMethods: ActionMethod[],
  ): string {

    // Locator property declarations
    const locatorDecls = selectorKeys
      .map(k => `  private readonly ${k}: Locator;`)
      .join('\n');

    const msgDecls = messageKeys
      .map(k => `  private readonly ${k}: Locator;`)
      .join('\n');

    // Constructor wiring
    const locatorInits = selectorKeys
      .map(k => `    this.${k} = ${buildLocatorExpr(selectors[k] ?? '', k)};`)
      .join('\n');

    const msgInits = messageKeys
      .map(k => `    this.${k} = page.getByText('${messages[k]}');`)
      .join('\n');

    // Assertions
    const assertionType = buildAssertionType(selectorKeys, messageKeys);
    const assertionImpl = buildAssertionImpl(selectorKeys, messageKeys);

    // Action methods
    const methodBlocks = actionMethods.map(m => {
      const paramStr = m.params.map(p => `${p.name}: ${p.type}`).join(', ');
      const bodyLines = m.body.split('\n').map(l => `    ${l}`).join('\n');
      return `  async ${m.name}(${paramStr}): Promise<void> {\n${bodyLines}\n  }`;
    }).join('\n\n');

    return `import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class ${className} {
  private readonly page: Page;

  // Selectors (auto-generated from KB — validate each in Chrome DevTools)
${locatorDecls}

  // Validation messages
${msgDecls}

  // Assertion helpers
  readonly assertions: {
${assertionType}
  };

  constructor(page: Page) {
    this.page = page;

${locatorInits}

${msgInits}

    this.assertions = {
${assertionImpl}
    };
  }

${methodBlocks}

  private async navigate(path: string): Promise<void> {
    await this.page.goto(path);
  }

  private async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('load');
  }
}
`;
  }
}
