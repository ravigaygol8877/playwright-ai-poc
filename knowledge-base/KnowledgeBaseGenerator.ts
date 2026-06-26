/**
 * KnowledgeBaseGenerator
 *
 * Give it a URL. It opens the page using Playwright, inspects the DOM,
 * sends what it finds to the AI, and writes a ready-to-use KB JSON file.
 *
 * No manual selector hunting. No HTML reading.
 *
 * Usage:
 *   const generator = new KnowledgeBaseGenerator(llmProvider);
 *   await generator.generate("https://yourapp.com/login", "login-page");
 *   // → knowledge-base/login-page.json created automatically
 */

import { chromium } from "@playwright/test";
import fs from "fs";
import type { LLMProvider } from "../llm/src/interfaces/LLMProvider.js";
import { AIJsonParser } from "../ai/src/utils/AIJsonParser.js";

interface GeneratedKnowledgeBase {
  pageName: string;
  url: string;
  selectors: Record<string, string>;
  messages: Record<string, string>;
  success: {
    redirectUrl?: string;
    landmarkText?: string;
  };
}

export class KnowledgeBaseGenerator {

  constructor(private llmProvider: LLMProvider) {}

  async generate(
    url: string,
    outputName: string,
    httpCredentials?: { username: string; password: string }
  ): Promise<GeneratedKnowledgeBase> {

    console.log(`\n  Opening page: ${url}`);
    if (httpCredentials) console.log(`  Using HTTP basic auth (username: ${httpCredentials.username})`);

    // Step 1 — Open the page with Playwright and extract DOM snapshot
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      ...(httpCredentials ? { httpCredentials } : {}),
    });
    const page = await context.newPage();

    // load fires as soon as HTML + subresources are done; then wait for JS hydration
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(3000); // let React/Next.js hydrate

    // Wait for at least one interactive element to appear (React hydration)
    await page.waitForFunction(
      () => document.querySelectorAll("a, button, input").length > 0,
      { timeout: 15000 }
    ).catch(() => console.log("  ⚠  Warning: no interactive elements after 15s wait"));

    // Scroll to bottom so lazy-loaded elements render, then back to top
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const pageTitle = await page.title();
    const pageUrl   = page.url();
    const counts    = await page.evaluate(() => ({
      a:      document.querySelectorAll("a").length,
      button: document.querySelectorAll("button").length,
      input:  document.querySelectorAll("input").length,
    }));
    console.log(`  Page title  : ${pageTitle}`);
    console.log(`  Final URL   : ${pageUrl}`);
    console.log(`  Element counts — a:${counts.a}  button:${counts.button}  input:${counts.input}`);

    // Step 2 — Extract all interactive elements from the DOM
    const domSnapshot = await page.evaluate(() => {
      const elements: Array<{
        tag: string;
        type?: string;
        id?: string;
        name?: string;
        placeholder?: string;
        dataTest?: string;
        ariaLabel?: string;
        text?: string;
        className?: string;
        href?: string;
      }> = [];

      const candidates = document.querySelectorAll(
        "input, button, a, select, textarea, [data-test], [data-testid], [aria-label]"
      );

      candidates.forEach(el => {
        const htmlEl   = el as HTMLElement;
        const inputEl  = el as HTMLInputElement;
        const anchorEl = el as HTMLAnchorElement;

        const entry: {
          tag: string;
          type?: string;
          id?: string;
          name?: string;
          placeholder?: string;
          dataTest?: string;
          ariaLabel?: string;
          text?: string;
          className?: string;
          href?: string;
        } = { tag: el.tagName.toLowerCase() };

        if (inputEl.type)        entry.type        = inputEl.type;
        if (el.id)               entry.id          = el.id;
        if (inputEl.name)        entry.name        = inputEl.name;
        if (inputEl.placeholder) entry.placeholder = inputEl.placeholder;
        const dt = el.getAttribute("data-test") ?? el.getAttribute("data-testid");
        if (dt) entry.dataTest = dt;
        const al = el.getAttribute("aria-label");
        if (al) entry.ariaLabel = al;
        const txt = htmlEl.innerText?.trim().slice(0, 60);
        if (txt) entry.text = txt;
        const cls = el.className?.toString().trim().slice(0, 80);
        if (cls) entry.className = cls;
        if (anchorEl.href) entry.href = anchorEl.href;

        elements.push(entry);
      });

      // Also grab visible text nodes that look like validation messages
      const textNodes: string[] = [];
      document.querySelectorAll(
        "p, span, div, label, h1, h2, h3, .error, .message, .alert, [class*='error'], [class*='message']"
      ).forEach(el => {
        const text = (el as HTMLElement).innerText?.trim();
        if (text && text.length > 3 && text.length < 120) {
          textNodes.push(text);
        }
      });

      return {
        url:      window.location.href,
        title:    document.title,
        elements:  elements.slice(0, 100),
        textNodes: [...new Set(textNodes)].slice(0, 50),
      };
    });

    await context.close();
    await browser.close();

    console.log(`  ✅ DOM snapshot captured: ${domSnapshot.elements.length} elements found`);

    // Step 3 — Send DOM snapshot to AI and ask it to build the KB
    const prompt = `
You are a Playwright test automation expert.

I have opened this web page and extracted its interactive DOM elements.
Your job is to analyze these elements and generate a structured knowledge base
JSON file that will be used to drive AI-generated Playwright tests.

Page URL   : ${domSnapshot.url}
Page Title : ${domSnapshot.title}

DOM Elements Found:
${JSON.stringify(domSnapshot.elements, null, 2)}

Visible Text Nodes on Page:
${JSON.stringify(domSnapshot.textNodes, null, 2)}

Instructions:
1. Identify the purpose of this page (login, register, checkout, etc.)
2. Map each important interactive element to a meaningful selector key name
3. Choose the BEST selector for each element in this priority order:
   - data-test or data-testid attribute (most stable)
   - id attribute
   - name attribute combined with tag: input[name='x']
   - aria-label
   - type + value: input[type='submit'][value='Login']
4. Identify any visible error messages or validation messages
5. Identify the success state (redirect URL or success text)

Return ONLY valid JSON in this exact format. No markdown. No explanation.

{
  "pageName": "descriptive page name",
  "url": "${url}",
  "selectors": {
    "fieldKey": "cssSelector"
  },
  "messages": {
    "messageKey": "actual message text from the page"
  },
  "success": {
    "redirectUrl": "/path or empty string",
    "landmarkText": "text visible after success or empty string"
  }
}

Rules:
- Use camelCase for all keys
- Only include elements that are actually useful for test automation
- Selector values must be real CSS selectors that Playwright can use
- Message values must be actual text strings, not selector strings
- If you cannot identify a message value, omit that key
`;

    console.log(`  Asking AI to analyze DOM and generate knowledge base...`);
    const response = await this.llmProvider.generateResponse(prompt);
    const kb = AIJsonParser.parse<GeneratedKnowledgeBase>(response);

    // Step 4 — Validate the result has minimum required fields
    if (!kb.pageName || !kb.url || !kb.selectors || Object.keys(kb.selectors).length === 0) {
      throw new Error(
        "AI returned an incomplete knowledge base. Missing pageName, url, or selectors."
      );
    }

    // Step 5 — Write to file
    const outputPath = `knowledge-base/${outputName}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(kb, null, 2));

    console.log(`  ✅ Knowledge base written → ${outputPath}`);
    console.log(`     Page     : ${kb.pageName}`);
    console.log(`     Selectors: ${Object.keys(kb.selectors).join(", ")}`);

    return kb;
  }
}
