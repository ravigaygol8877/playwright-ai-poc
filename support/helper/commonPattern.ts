import { expect, type Locator, type Page } from '@playwright/test';

export default class CorePattern {
    private readonly navLinks: Locator;

    constructor(private readonly page: Page) {
        this.navLinks = page.locator('nav a, .navbar a, header a');
    }

    async clickNavLink(linkText: string): Promise<void> {
        await this.page.getByRole('link', { name: linkText, exact: true }).click();
        await this.page.waitForLoadState('networkidle');
    }

    async verifyCurrentUrl(expectedUrl: string): Promise<void> {
        await expect(this.page).toHaveURL(expectedUrl);
    }

    async verifyPageVisible(): Promise<void> {
        await this.page.waitForLoadState('domcontentloaded');
        await expect(this.page.locator('body')).toBeVisible();
    }
}
