/**
 * PageAnalyzer
 *
 * Opens a URL with headless Playwright and extracts structured page context
 * for use by ScenarioInferenceEngine. Goes deeper than KnowledgeBaseGenerator —
 * captures forms with labeled fields, buttons, nav links, and validation messages
 * so the LLM can infer test scenarios grounded in actual DOM content.
 */

import { chromium } from "@playwright/test";

export interface PageFormField {
  label:       string;
  inputType:   string;
  placeholder: string;
  required:    boolean;
}

export interface PageForm {
  fields:     PageFormField[];
  submitText: string;
}

export interface PageContext {
  url:                string;
  title:              string;
  headings:           string[];
  forms:              PageForm[];
  buttons:            string[];
  navLinks:           string[];
  validationMessages: string[];
}

export class PageAnalyzer {

  async analyze(
    url: string,
    httpCredentials?: { username: string; password: string },
  ): Promise<PageContext> {
    const browser = await chromium.launch({ headless: true });
    const ctx     = await browser.newContext({
      ...(httpCredentials ? { httpCredentials } : {}),
    });
    const page = await ctx.newPage();

    try {
      await page.goto(url, { waitUntil: "load", timeout: 30_000 });
      await page.waitForTimeout(2_000);

      // Scroll to trigger lazy-loaded elements
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1_000);
      await page.evaluate(() => window.scrollTo(0, 0));

      const data = await page.evaluate(() => {
        const title = document.title;

        const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
          .map(h => (h as HTMLElement).innerText?.trim() ?? "")
          .filter(v => v.length > 0 && v.length < 120);

        // Extract forms with labeled fields
        const forms = Array.from(document.forms).map(form => {
          const fields = Array.from(
            form.querySelectorAll("input, textarea, select"),
          )
            .filter(el => (el as HTMLInputElement).type !== "hidden")
            .map(el => {
              const input   = el as HTMLInputElement;
              const labelEl = input.id
                ? document.querySelector(`label[for="${input.id}"]`)
                : (input.closest("label") ?? input.previousElementSibling);
              return {
                label:       ((labelEl as HTMLElement | null)?.innerText?.trim() ?? ""),
                inputType:   input.type || el.tagName.toLowerCase(),
                placeholder: input.placeholder ?? "",
                required:    input.required,
              };
            })
            .filter(f => f.label.length > 0 || f.placeholder.length > 0);

          const submitBtn = form.querySelector(
            '[type="submit"], button[type="submit"], button',
          );
          return {
            fields,
            submitText: (submitBtn as HTMLElement | null)?.innerText?.trim() ?? "Submit",
          };
        });

        const buttons = Array.from(
          document.querySelectorAll("button, [role='button']"),
        )
          .map(b => (b as HTMLElement).innerText?.trim() ?? "")
          .filter(v => v.length > 0 && v.length < 60)
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 20);

        const navLinks = Array.from(
          document.querySelectorAll("nav a, header a, [role='navigation'] a"),
        )
          .map(a => (a as HTMLElement).innerText?.trim() ?? "")
          .filter(v => v.length > 0 && v.length < 60)
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 15);

        const validationMessages = Array.from(
          document.querySelectorAll(
            "[role='alert'], .error, .error-message, [class*='error'], [class*='invalid'], [aria-live]",
          ),
        )
          .map(el => (el as HTMLElement).innerText?.trim() ?? "")
          .filter(v => v.length > 3 && v.length < 200)
          .slice(0, 10);

        return { title, headings, forms, buttons, navLinks, validationMessages };
      });

      return { url, ...data } as PageContext;
    } finally {
      await ctx.close();
      await browser.close();
    }
  }
}
