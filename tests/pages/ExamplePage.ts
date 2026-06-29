import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

// Framework example POM — demonstrates the standard page object pattern.
// Never deleted by project:reset. Serves as the base scaffold anchor for FixtureUpdater.
export class ExamplePage {
  private readonly page: Page;
  readonly exampleElement: Locator;

  constructor(page: Page) {
    this.page = page;
    this.exampleElement = page.locator('#example').first();
  }

  private async navigate(path: string): Promise<void> {
    await this.page.goto(path);
  }

  private async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('load');
  }

  async goto(): Promise<void> {
    await this.navigate('/');
    await this.waitForPageReady();
  }

  readonly assertions = {
    exampleElementVisible: () => expect(this.exampleElement).toBeVisible(),
  };
}
