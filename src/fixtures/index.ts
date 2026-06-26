/**
 * fixtures/index.ts
 *
 * Central Playwright fixture registry. This file is managed automatically by
 * the Auto-POM generator (npm run generate:pom / npm run generate:from-excel).
 *
 * When a new page object is generated, the POM generator injects:
 *   - POM import
 *   - Data interface import
 *   - PageFixtures property
 *   - DataFixtures property
 *   - Fixture implementation
 *
 * Do not manually add project-specific imports here — let the generator manage it.
 */

import { test as base, expect } from '@playwright/test';
import type { AeHomePageData } from '../data/aeHomePage.data.js';
import { aeHomePageData } from '../data/aeHomePage.data.js';
import type { AeLoginPageData } from '../data/aeLoginPage.data.js';
import { aeLoginPageData } from '../data/aeLoginPage.data.js';
import { AeHomePage } from '../pages/AeHomePage.js';
import { AeLoginPage } from '../pages/AeLoginPage.js';

// ── Auto-generated fixture interfaces ─────────────────────────────────────────

interface PageFixtures {
  aeHomePage:  AeHomePage;
  aeLoginPage: AeLoginPage;
}

interface DataFixtures {
  aeHomePageData:  AeHomePageData;
  aeLoginPageData: AeLoginPageData;
}

// ── Fixture registry ──────────────────────────────────────────────────────────

export const test = base.extend<PageFixtures & DataFixtures>({
  aeHomePage: async ({ page }, use) => {
    await use(new AeHomePage(page));
  },
  aeLoginPage: async ({ page }, use) => {
    await use(new AeLoginPage(page));
  },
  aeHomePageData: async ({}, use) => {
    await use(aeHomePageData);
  },
  aeLoginPageData: async ({}, use) => {
    await use(aeLoginPageData);
  },
});

export { expect };
