import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export default class ExamplePage {
    private readonly page: Page;
    private readonly exampleElement: Locator;

    constructor(page: Page) {
        this.page = page;
        this.exampleElement = this.page.locator('#example').first();
    }

    async verifyPageLoaded(): Promise<void> {
        await expect(this.exampleElement).toBeVisible();
        console.info('Verified example page loaded.');
    }
}
