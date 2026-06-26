import { expect, type Page } from '@playwright/test';

export async function loginWithValidCredentials(
    page: Page,
    email: string,
    password: string,
): Promise<void> {
    await page.locator("input[name='email'][type='email']").fill(email);
    await page.locator("input[name='password'][type='password']").fill(password);
    await page.locator("button[type='submit']:has-text('Login')").click();
    await page.waitForLoadState('networkidle');
    console.info('Logged in with valid credentials.');
}

export async function doLogOut(page: Page): Promise<void> {
    const logoutLink = page.locator("a[href='/logout']:has-text('Logout')");
    await logoutLink.waitFor({ state: 'visible' });
    await Promise.all([page.waitForURL('**/login'), logoutLink.click()]);
    console.info('Logged out successfully.');
}

export async function verifyPageTitle(page: Page, expectedTitle: string): Promise<void> {
    await expect(page).toHaveTitle(expectedTitle);
    console.info(`Page title verified: ${expectedTitle}`);
}

export async function waitForSelector(page: Page, selector: string, timeout = 30000): Promise<void> {
    await page.waitForSelector(selector, { timeout });
}
