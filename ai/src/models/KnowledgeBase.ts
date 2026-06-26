/**
 * KnowledgeBase — typed representation of a knowledge-base JSON file.
 *
 * KB files live in knowledge-base/<pageKey>.json and are auto-generated
 * by KnowledgeBaseGenerator from a live DOM snapshot of the target URL.
 * They drive POM generation, test-case expansion, and spec rendering.
 */

export interface KnowledgeBase {
  /** Canonical URL of the page (used for page.goto). */
  url: string;

  /** Human-readable page name — used as describe() label when describeName is absent. */
  pageName: string;

  /** Optional override for the describe() label in generated specs. */
  describeName?: string;

  /** Lines injected into beforeEach() before page.goto (e.g. authentication steps). */
  beforeEachPrefix?: string[];

  /** When true, suppresses the page.goto(pagePath) line in beforeEach. */
  skipGoto?: boolean;

  /** CSS-selector map: logical element name → CSS selector string. */
  selectors: Record<string, string>;

  /** Known validation / error messages. Used verbatim in assertion prompts. */
  messages?: Record<string, string>;

  /** Post-success indicators (redirect URL, landmark text) for assertion generation. */
  success?: {
    redirectUrl?: string;
    landmarkText?: string;
    completionText?: string;
  };

  /** Free-form notes passed to the test-case generator as page context. */
  notes?: string;
}
