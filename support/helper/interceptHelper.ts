import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export function getUserCredentials(): { email: string; password: string } {
    const env      = process.env['ENVIRONMENT'] || 'qa';
    const email    = process.env[`${env.toUpperCase()}_USER_EMAIL`] || '';
    const password = process.env[`${env.toUpperCase()}_USER_PASS`]  || '';
    if (!email || !password) {
        throw new Error(`Missing credentials for environment: ${env}`);
    }
    return { email, password };
}

export async function verifyPageTitle(page: Page, expectedTitle: string): Promise<void> {
    const pageTitle = page.locator('#root h1');
    await pageTitle.waitFor({ state: 'visible' });
    await expect(pageTitle).toContainText(expectedTitle);
}

export async function waitForSelector(page: Page, selector: string, timeout = 30000): Promise<void> {
    try {
        await page.waitForSelector(selector, { timeout });
    } catch (error) {
        console.error(`Error waiting for selector: ${error}`);
    }
}
