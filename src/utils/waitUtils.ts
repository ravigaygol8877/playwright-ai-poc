import type { Page } from '@playwright/test';

export async function waitForNetworkIdle(page: Page, timeout = 5_000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

export async function waitForUrl(page: Page, pattern: RegExp, timeout = 15_000): Promise<void> {
  await page.waitForURL(pattern, { timeout });
}

export async function waitForText(page: Page, text: string, timeout = 10_000): Promise<void> {
  await page.getByText(text).waitFor({ state: 'visible', timeout });
}

export async function retryClick(page: Page, selector: string, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await page.locator(selector).click({ timeout: 5_000 });
      return;
    } catch {
      if (i === retries - 1) throw new Error(`Failed to click "${selector}" after ${retries} attempts`);
      await page.waitForTimeout(500);
    }
  }
}
