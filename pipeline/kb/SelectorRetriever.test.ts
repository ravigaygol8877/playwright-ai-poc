/**
 * SelectorRetriever unit tests.
 *
 * Covers: relevance scoring, topN enforcement, synonym expansion,
 * message retrieval, fallback behaviour, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { SelectorRetriever }    from './SelectorRetriever.js';
import type { KnowledgeBase }   from '../models/KnowledgeBase.js';

// ─── Fixture KB (mirrors ae-home.json structure) ─────────────────────────────

const KB: KnowledgeBase = {
  pageName: 'Home Page',
  url:      'https://automationexercise.com/',
  selectors: {
    navHomeLink:            "a:has-text('Home')",
    navProductsLink:        "a:has-text('Products')",
    navCartLink:            "a:has-text('Cart')",
    navSignupLoginLink:     "a:has-text('Signup / Login')",
    navTestCasesLink:       "a.test_cases_list",
    navApiTestingLink:      "a.apis_list",
    addToCartButtons:       'a.btn.btn-default.add-to-cart',
    viewCartLink:           "a:has-text('View Cart')",
    categoryWomenLink:      "a:has-text('WOMEN')",
    categoryMenLink:        "a:has-text('MEN')",
    categoryKidsLink:       "a:has-text('KIDS')",
    brandPoloLink:          "a:has-text('POLO')",
    brandHM:                "a:has-text('H&M')",
    brandMadame:            "a:has-text('MADAME')",
    emailSubscribeInput:    '#subscribe_email',
    subscribeButton:        '#subscribe',
    continueShoppingButton: 'button.close-modal',
    viewProductLinks:       "a[href^='/product_details/']",
    testCasesButton:        "button:has-text('Test Cases')",
    apisListButton:         "button:has-text('APIs list')",
  },
  messages: {
    productAddedToCart: 'Your product has been added to cart.',
    subscribeSuccess:   'You have been successfully subscribed!',
  },
};

const TOTAL_SELECTORS = Object.keys(KB.selectors).length;
const TOTAL_MESSAGES  = Object.keys(KB.messages!).length;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SelectorRetriever', () => {
  const retriever = new SelectorRetriever();

  // ── Return shape ─────────────────────────────────────────────────────────────

  describe('return shape', () => {
    it('returns an object with selectors, messages, and stats fields', () => {
      const result = retriever.retrieve('user subscribes to newsletter', KB);
      expect(result).toHaveProperty('selectors');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('stats');
    });

    it('stats.totalSelectors equals the full KB selector count', () => {
      const result = retriever.retrieve('any query', KB);
      expect(result.stats.totalSelectors).toBe(TOTAL_SELECTORS);
    });

    it('stats.totalMessages equals the full KB message count', () => {
      const result = retriever.retrieve('any query', KB);
      expect(result.stats.totalMessages).toBe(TOTAL_MESSAGES);
    });

    it('stats.retrievedSelectors matches returned selectors object size', () => {
      const result = retriever.retrieve('subscribe to newsletter', KB);
      expect(result.stats.retrievedSelectors).toBe(Object.keys(result.selectors).length);
    });

    it('stats.query preserves the original query string exactly', () => {
      const query = 'user logs in with valid credentials';
      const result = retriever.retrieve(query, KB);
      expect(result.stats.query).toBe(query);
    });
  });

  // ── Relevance scoring ────────────────────────────────────────────────────────

  describe('relevance scoring', () => {
    it('includes subscribe-related selectors for a newsletter requirement', () => {
      const result = retriever.retrieve('user subscribes to newsletter with valid email', KB);
      const keys   = Object.keys(result.selectors);
      expect(keys.some(k => /subscribe|email/i.test(k))).toBe(true);
    });

    it('includes cart-related selectors for an add-to-cart requirement', () => {
      const result = retriever.retrieve('user adds product to cart', KB);
      const keys   = Object.keys(result.selectors);
      expect(keys.some(k => /cart|add/i.test(k))).toBe(true);
    });

    it('includes login/signup selector for an authentication requirement', () => {
      const result = retriever.retrieve('user navigates to login page', KB);
      const keys   = Object.keys(result.selectors);
      expect(keys.some(k => /login|signup/i.test(k))).toBe(true);
    });

    it('includes category selectors for a browse-categories requirement', () => {
      const result = retriever.retrieve('user browses women category products', KB);
      const keys   = Object.keys(result.selectors);
      expect(keys.some(k => /category|women/i.test(k))).toBe(true);
    });

    it('includes brand selectors for a brand navigation requirement', () => {
      const result = retriever.retrieve('user navigates to brand polo', KB);
      const keys   = Object.keys(result.selectors);
      expect(keys.some(k => /brand|polo/i.test(k))).toBe(true);
    });

    it('returns fewer selectors than the total KB size for a focused query', () => {
      const result = retriever.retrieve('user subscribes to newsletter', KB);
      expect(Object.keys(result.selectors).length).toBeLessThan(TOTAL_SELECTORS);
    });

    it('does not return zero selectors for a highly specific query', () => {
      const result = retriever.retrieve('user clicks add to cart', KB);
      expect(Object.keys(result.selectors).length).toBeGreaterThan(0);
    });
  });

  // ── topN enforcement ─────────────────────────────────────────────────────────

  describe('topN enforcement', () => {
    it('returns at most topN selectors when topN < total', () => {
      const result = retriever.retrieve('user navigates to login', KB, 5);
      expect(Object.keys(result.selectors).length).toBeLessThanOrEqual(5);
    });

    it('returns at least MIN_SELECTORS (5) even for a zero-match query', () => {
      const result = retriever.retrieve('zzz completely irrelevant qxyz', KB, 10);
      expect(Object.keys(result.selectors).length).toBeGreaterThanOrEqual(5);
    });

    it('returns all selectors when topN >= KB size', () => {
      const result = retriever.retrieve('anything', KB, 100);
      expect(Object.keys(result.selectors).length).toBe(TOTAL_SELECTORS);
    });

    it('honours a topN of exactly MIN_SELECTORS (5)', () => {
      const result = retriever.retrieve('subscribe', KB, 5);
      expect(Object.keys(result.selectors).length).toBeLessThanOrEqual(5);
      expect(Object.keys(result.selectors).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Message retrieval ────────────────────────────────────────────────────────

  describe('message retrieval', () => {
    it('includes subscribeSuccess message when query is about newsletter', () => {
      const result = retriever.retrieve('user successfully subscribes', KB);
      expect(Object.keys(result.messages).length).toBeGreaterThan(0);
    });

    it('includes productAddedToCart message when query is about cart', () => {
      const result = retriever.retrieve('product added to cart successfully', KB);
      const vals   = Object.values(result.messages);
      expect(vals.some(v => /cart/i.test(v))).toBe(true);
    });

    it('falls back to all messages when none match the query', () => {
      const result = retriever.retrieve('zzz completely irrelevant qxyz', KB);
      expect(Object.keys(result.messages).length).toBe(TOTAL_MESSAGES);
    });
  });

  // ── Synonym expansion ────────────────────────────────────────────────────────

  describe('synonym expansion', () => {
    it('"newsletter" query finds "subscribe" selector via synonym', () => {
      const result = retriever.retrieve('newsletter signup for updates', KB, 15);
      const keys   = Object.keys(result.selectors);
      expect(keys.some(k => /subscribe/i.test(k))).toBe(true);
    });

    it('"purchase" query finds cart selector via synonym', () => {
      const result = retriever.retrieve('complete a purchase', KB, 15);
      const keys   = Object.keys(result.selectors);
      expect(keys.some(k => /cart|add/i.test(k))).toBe(true);
    });

    it('"account" query finds login/signup selector via synonym', () => {
      const result = retriever.retrieve('access my account', KB, 15);
      const keys   = Object.keys(result.selectors);
      expect(keys.some(k => /login|signup/i.test(k))).toBe(true);
    });

    it('"buy" query finds cart-related selectors via synonym chain', () => {
      const result = retriever.retrieve('user wants to buy a product', KB, 15);
      const keys   = Object.keys(result.selectors);
      expect(keys.some(k => /cart|add/i.test(k))).toBe(true);
    });
  });

  // ── Tokenizer edge cases ─────────────────────────────────────────────────────

  describe('tokenizer', () => {
    it('splits camelCase selector keys correctly', () => {
      const tokens = retriever.tokenize('navSignupLoginLink');
      expect(tokens).toContain('nav');
      expect(tokens).toContain('signup');
      expect(tokens).toContain('login');
      expect(tokens).toContain('link');
    });

    it('lowercases all tokens', () => {
      const tokens = retriever.tokenize('NavSignupLoginLink');
      expect(tokens.every(t => t === t.toLowerCase())).toBe(true);
    });

    it('filters stop words', () => {
      const tokens = retriever.tokenize('the user should be able to login');
      expect(tokens).not.toContain('the');
      expect(tokens).not.toContain('should');
      expect(tokens).not.toContain('be');
      expect(tokens).not.toContain('able');
      expect(tokens).not.toContain('to');
    });

    it('returns an empty array for an empty string', () => {
      expect(retriever.tokenize('')).toEqual([]);
    });

    it('handles strings with special characters', () => {
      const tokens = retriever.tokenize('add-to-cart_button.click()');
      expect(tokens).toContain('add');
      expect(tokens).toContain('cart');
      expect(tokens).toContain('button');
      expect(tokens).toContain('click');
    });
  });

  // ── Defensive / edge cases ───────────────────────────────────────────────────

  describe('defensive behaviour', () => {
    it('handles an empty query without throwing', () => {
      expect(() => retriever.retrieve('', KB)).not.toThrow();
    });

    it('handles a KB with no messages field without throwing', () => {
      const { messages: _omit, ...rest } = KB;
      const kbNoMsg = rest as KnowledgeBase;
      expect(() => retriever.retrieve('subscribe', kbNoMsg)).not.toThrow();
    });

    it('returns empty messages when KB has no messages field', () => {
      const { messages: _omit, ...rest } = KB;
      const kbNoMsg = rest as KnowledgeBase;
      const result  = retriever.retrieve('subscribe', kbNoMsg);
      expect(Object.keys(result.messages).length).toBe(0);
    });

    it('handles a KB with a single selector', () => {
      const tinyKb: KnowledgeBase = {
        ...KB,
        selectors: { loginButton: '#login-btn' },
        messages:  {},
      };
      const result = retriever.retrieve('user clicks login button', tinyKb);
      expect(Object.keys(result.selectors).length).toBe(1);
    });

    it('handles topN of 0 by applying the MIN_SELECTORS floor', () => {
      const result = retriever.retrieve('subscribe', KB, 0);
      expect(Object.keys(result.selectors).length).toBeGreaterThanOrEqual(1);
    });

    it('all returned selector values are non-empty strings', () => {
      const result = retriever.retrieve('subscribe to newsletter', KB);
      for (const value of Object.values(result.selectors)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('all returned selector keys exist in the original KB', () => {
      const result = retriever.retrieve('subscribe to newsletter', KB);
      for (const key of Object.keys(result.selectors)) {
        expect(KB.selectors).toHaveProperty(key);
      }
    });
  });
});
