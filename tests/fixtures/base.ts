import { expect, test as base, type Page } from '@playwright/test';
export { expect };
import { DESKTOP_VIEW_PORT, MOBILE_VIEW_PORT } from '../helpers/constants.js';

type TestFixture = {
    page: Page;
};

export const testDesktop = base.extend<TestFixture>({
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

export const testMobile = base.extend<TestFixture>({
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
