import { test as base } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { DESKTOP_VIEW_PORT, MOBILE_VIEW_PORT } from '../utils/constants.js';

type TestFixture = {
    page: Page;
};

const baseURL = process.env['BASE_URL'] ?? '';
if (!baseURL) {
    console.warn('WARNING: BASE_URL is not set. Check your .env or config/environments/*.env');
}

async function setupPage(browser: Browser, viewportSize: { width: number; height: number }) {
    const context = await browser.newContext({ viewport: viewportSize });
    const page    = await context.newPage();
    if (baseURL) {
        await page.goto(baseURL);
        await page.waitForLoadState('load');
    }
    return { page, context };
}

export const testDesktop = base.extend<TestFixture>({
    page: async ({ browser }, use) => {
        const { page, context } = await setupPage(browser, DESKTOP_VIEW_PORT);
        await use(page);
        await context.close();
    },
});

export const testMobile = base.extend<TestFixture>({
    page: async ({ browser }, use) => {
        const { page, context } = await setupPage(browser, MOBILE_VIEW_PORT);
        await use(page);
        await context.close();
    },
});
