import { expect, test as base, type Page } from '@playwright/test';
export { expect };
import { DESKTOP_VIEW_PORT, MOBILE_VIEW_PORT } from '../helpers/constants.js';
import { ExamplePage } from '../pages/ExamplePage.js';
import { exampleData } from '../data/example.data.js';
import type { ExampleData } from '../data/example.data.js';

// ─── Fixture interfaces ───────────────────────────────────────────────────────
// FixtureUpdater appends new POM entries after the last matching line in
// PageFixtures, and new data type entries after the last matching line in DataFixtures.

interface PageFixtures {
  examplePage: ExamplePage;
}

interface DataFixtures {
  exampleData: ExampleData;
}

// ─── Shared POM + data fixtures ───────────────────────────────────────────────
// FixtureUpdater injects new page fixture impls before the last `\w+Data: async`
// line and new data fixture impls before the `}); // testFixtures-end` sentinel.

const testFixtures = base.extend<PageFixtures & DataFixtures>({

  examplePage: async ({ page }, use) => {
    await use(new ExamplePage(page));
  },

  exampleData: async ({}, use) => {
    await use(exampleData);
  },

}); // testFixtures-end

// ─── Desktop viewport (1280×720) ─────────────────────────────────────────────

export const testDesktop = testFixtures.extend<{ page: Page }>({
  page: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page    = await context.newPage();
    await page.setViewportSize(DESKTOP_VIEW_PORT);
    await page.goto('/');
    await page.waitForLoadState('load');
    await use(page);
    await context.close();
  },
});

// ─── Mobile viewport (390×844) ───────────────────────────────────────────────

export const testMobile = testFixtures.extend<{ page: Page }>({
  page: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page    = await context.newPage();
    await page.setViewportSize(MOBILE_VIEW_PORT);
    await page.goto('/');
    await page.waitForLoadState('load');
    await use(page);
    await context.close();
  },
});
