/**
 * SelectorRetriever — Phase 2 contextual retrieval.
 *
 * Given a natural-language query (requirement, test title, expected result, step text)
 * and a full KnowledgeBase, returns only the selectors and messages that are relevant
 * to that query, instead of injecting the entire KB into every LLM prompt.
 *
 * Algorithm:
 *   1. Tokenize the query (camelCase split + lowercase + stop-word filter)
 *   2. Expand tokens with a synonym map (e.g. "purchase" → adds "cart", "checkout")
 *   3. Score each selector key by counting overlaps with expanded query tokens
 *   4. Return top-N selectors with highest scores; always return at least MIN_SELECTORS
 *   5. Include messages that share at least one token with the expanded query
 *
 * No LLM calls, no network, no external dependencies — pure in-process scoring.
 */

import type { KnowledgeBase } from '../models/KnowledgeBase.js';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface RetrievedContext {
  selectors: Record<string, string>;
  messages: Record<string, string>;
  stats: {
    query: string;
    totalSelectors: number;
    retrievedSelectors: number;
    totalMessages: number;
    retrievedMessages: number;
  };
}

// ─── Stop words ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'that', 'this', 'these', 'those',
  'with', 'without', 'for', 'from', 'to', 'of', 'on', 'in', 'at', 'by',
  'and', 'or', 'but', 'not', 'no', 'if', 'when', 'then', 'as', 'so',
  'it', 'its', 'they', 'them', 'their', 'we', 'our', 'my', 'me', 'he',
  'she', 'his', 'her', 'user', 'test', 'page', 'given', 'after',
  'make', 'sure', 'able', 'ensure', 'also', 'any', 'all', 'each', 'both',
]);

// ─── Synonym map ──────────────────────────────────────────────────────────────
//
// Maps query words → additional tokens that should count as selector matches.
// Bidirectional: if query contains "newsletter", "subscribe" becomes a match too.

const SYNONYMS: Record<string, string[]> = {
  // Authentication
  login:        ['signin', 'auth', 'credentials', 'password', 'email', 'account', 'authenticate'],
  signin:       ['login', 'auth', 'credentials', 'password'],
  logout:       ['signout', 'exit', 'logoff'],
  signout:      ['logout', 'exit'],
  register:     ['signup', 'registration', 'create', 'join', 'new'],
  signup:       ['register', 'registration', 'create', 'join', 'new'],
  account:      ['login', 'signup', 'register', 'profile'],
  credentials:  ['login', 'signin', 'password', 'email', 'auth'],
  authenticate: ['login', 'auth', 'credentials'],
  auth:         ['login', 'signin', 'credentials'],
  // Navigation
  navigate:     ['nav', 'link', 'go', 'open', 'visit', 'menu', 'header'],
  navigation:   ['nav', 'menu', 'header', 'link', 'bar'],
  nav:          ['menu', 'navigation', 'header', 'link'],
  menu:         ['nav', 'navigation', 'header', 'dropdown'],
  header:       ['nav', 'menu', 'navigation'],
  link:         ['anchor', 'href', 'navigate', 'nav'],
  go:           ['navigate', 'nav', 'goto', 'visit', 'open'],
  open:         ['navigate', 'view', 'visit', 'go', 'click'],
  visit:        ['navigate', 'nav', 'go', 'open'],
  // E-commerce
  cart:         ['basket', 'checkout', 'add', 'buy', 'purchase', 'shop', 'addto'],
  checkout:     ['cart', 'purchase', 'buy', 'order', 'payment', 'basket'],
  purchase:     ['cart', 'checkout', 'buy', 'add', 'order', 'shop'],
  buy:          ['cart', 'checkout', 'purchase', 'add', 'shop'],
  add:          ['cart', 'addto', 'buy', 'purchase', 'insert'],
  subscribe:    ['newsletter', 'subscription', 'notify', 'email', 'signup'],
  newsletter:   ['subscribe', 'subscription', 'email', 'notify'],
  subscription: ['subscribe', 'newsletter', 'email'],
  product:      ['item', 'goods', 'catalog', 'shop', 'brand', 'category'],
  products:     ['item', 'items', 'category', 'brand', 'catalog', 'shop'],
  category:     ['women', 'men', 'kids', 'type', 'department', 'filter', 'group'],
  brand:        ['polo', 'hm', 'madame', 'label', 'manufacturer'],
  browse:       ['products', 'category', 'nav', 'view', 'explore'],
  // UI elements
  click:        ['button', 'btn', 'link', 'submit', 'action'],
  press:        ['button', 'btn', 'click', 'submit'],
  button:       ['btn', 'submit', 'click', 'action', 'cta'],
  btn:          ['button', 'submit', 'click'],
  submit:       ['button', 'btn', 'send', 'confirm', 'save', 'click'],
  input:        ['field', 'textbox', 'form', 'enter', 'fill', 'type', 'text'],
  field:        ['input', 'textbox', 'form', 'text'],
  form:         ['input', 'field', 'submit', 'fill', 'text'],
  enter:        ['input', 'field', 'fill', 'type', 'text'],
  fill:         ['input', 'field', 'enter', 'type', 'text'],
  type:         ['input', 'field', 'enter', 'fill', 'text'],
  // Data
  email:        ['mail', 'address', 'login', 'subscribe', 'input'],
  password:     ['pass', 'pwd', 'credentials', 'login', 'secret'],
  // Status / result words
  error:        ['invalid', 'fail', 'wrong', 'incorrect', 'message', 'alert', 'validation'],
  invalid:      ['error', 'wrong', 'incorrect', 'fail', 'validation'],
  success:      ['confirm', 'complete', 'done', 'added', 'redirect', 'welcome'],
  view:         ['show', 'display', 'see', 'open', 'visit'],
  see:          ['view', 'show', 'display', 'verify', 'visible'],
  show:         ['view', 'display', 'see', 'visible'],
  verify:       ['check', 'assert', 'confirm', 'see', 'view', 'visible'],
  check:        ['verify', 'assert', 'confirm', 'see', 'view'],
  // Common landing / home
  home:         ['homepage', 'landing', 'main', 'index', 'dashboard'],
  homepage:     ['home', 'landing', 'main', 'index'],
  landing:      ['home', 'homepage', 'main'],
  // API / testing pages (automationexercise.com specific)
  api:          ['apis', 'testing', 'list', 'endpoint'],
  apis:         ['api', 'list', 'testing', 'endpoint'],
};

// ─── SelectorRetriever ────────────────────────────────────────────────────────

export class SelectorRetriever {
  private static readonly DEFAULT_TOP_N  = 10;
  private static readonly MIN_SELECTORS  = 5;

  /**
   * Retrieve the most relevant selectors and messages for a given query.
   *
   * @param query - Any natural-language string: requirement, test title, step, expected result
   * @param kb    - Full KnowledgeBase to retrieve from
   * @param topN  - Maximum selectors to return (default 10; floor at MIN_SELECTORS)
   */
  retrieve(query: string, kb: KnowledgeBase, topN = SelectorRetriever.DEFAULT_TOP_N): RetrievedContext {
    const queryTokens    = this.tokenize(query);
    const expandedTokens = this.expandWithSynonyms(queryTokens);

    // ── Score selectors ──────────────────────────────────────────────────────

    const selectorEntries = Object.entries(kb.selectors);

    const scored = selectorEntries.map(([key, selector]) => ({
      key,
      selector,
      score: this.scoreKey(key, expandedTokens),
    }));

    // Highest score first
    scored.sort((a, b) => b.score - a.score);

    // Effective limit: honour topN, but floor at MIN_SELECTORS (or total if smaller)
    const effectiveN = Math.min(
      Math.max(topN, SelectorRetriever.MIN_SELECTORS),
      selectorEntries.length,
    );

    // Keep top scorers and fill remaining slots from the sorted tail
    const topSlice = scored.slice(0, effectiveN);

    const retrievedSelectors: Record<string, string> = {};
    for (const { key, selector } of topSlice) {
      retrievedSelectors[key] = selector;
    }

    // ── Score messages ───────────────────────────────────────────────────────

    const messageEntries = Object.entries(kb.messages ?? {});
    const retrievedMessages: Record<string, string> = {};

    for (const [key, value] of messageEntries) {
      const msgTokens = [...this.tokenize(key), ...this.tokenize(value)];
      const overlap   = msgTokens.filter(t => expandedTokens.has(t)).length;
      if (overlap > 0) {
        retrievedMessages[key] = value;
      }
    }

    // Fallback: when no messages scored, return all (messages are few and always useful)
    const finalMessages = Object.keys(retrievedMessages).length > 0
      ? retrievedMessages
      : (kb.messages ?? {});

    return {
      selectors: retrievedSelectors,
      messages:  finalMessages,
      stats: {
        query,
        totalSelectors:    selectorEntries.length,
        retrievedSelectors: Object.keys(retrievedSelectors).length,
        totalMessages:      messageEntries.length,
        retrievedMessages:  Object.keys(finalMessages).length,
      },
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private scoreKey(selectorKey: string, expandedQueryTokens: Set<string>): number {
    const keyTokens = this.tokenize(selectorKey);
    return keyTokens.filter(t => expandedQueryTokens.has(t)).length;
  }

  /**
   * Split camelCase identifier or sentence into lowercase tokens, filtering stop words.
   * "navSignupLoginLink" → ["nav", "signup", "login", "link"]
   * "User can subscribe to newsletter" → ["subscribe", "newsletter"]
   */
  tokenize(text: string): string[] {
    const withSpaces = text
      .replace(/([A-Z])/g, ' $1')  // insert space before every uppercase letter
      .replace(/[^a-zA-Z0-9]+/g, ' ');  // replace non-alphanumeric runs with space

    return withSpaces
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 1 && !STOP_WORDS.has(t));
  }

  private expandWithSynonyms(tokens: string[]): Set<string> {
    const expanded = new Set<string>(tokens);
    for (const token of tokens) {
      const synonyms = SYNONYMS[token] ?? [];
      for (const s of synonyms) {
        expanded.add(s);
      }
    }
    return expanded;
  }
}
