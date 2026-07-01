import type { Page } from '@playwright/test';
import { getUserCredentials } from './interceptHelper.js';

const BASE_URL = process.env['BASE_URL'] ?? 'https://parabank.parasoft.com/parabank';

export async function loginToParaBank(page: Page): Promise<void> {
    const { email: username, password } = getUserCredentials();
    await page.goto(`${BASE_URL}/index.htm`);
    await page.waitForLoadState('load');
    await page.locator("input[name='username']").fill(username);
    await page.locator("input[name='password']").fill(password);
    await page.locator("input[type='submit'].button").click();
    await page.waitForLoadState('load');
}

export async function navigateTo(page: Page, path: string): Promise<void> {
    await page.goto(`${BASE_URL}/${path}`);
    await page.waitForLoadState('load');
}
