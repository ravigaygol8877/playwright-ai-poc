import type { Page } from '@playwright/test';

export default class CorePattern {
    constructor(private readonly page: Page) {}

    async clickUserMenu(menuName: string): Promise<void> {
        const userDropdown = this.page.locator("[class^='index-module_userDropdown']");
        await userDropdown.waitFor({ state: 'visible' });
        await userDropdown.click();
        await this.page.getByText(menuName, { exact: true }).click();
        console.info(`Navigated to "${menuName}" via user menu.`);
    }

    async clickHamburgerMenu(menuName: string): Promise<void> {
        const menuButton = this.page.locator("[class^='index-module_mobileNavMenu'] button");
        await menuButton.click();
        await this.page.getByText(menuName, { exact: true }).click();
        console.info(`Navigated to "${menuName}" via hamburger menu.`);
    }
}
