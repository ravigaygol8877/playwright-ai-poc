/**
 * ensureScaffold.ts
 *
 * Auto-creates the enterprise Playwright support/ folder structure and all
 * required scaffold files the first time any generation or demo command runs.
 *
 * Safe to call on every run — skips files that already exist.
 * Import and call ensureScaffoldFiles() at the top of every script entry point.
 */

import fs   from 'fs';
import path from 'path';

const DIRS = [
  'support/fixtures',
  'support/helper',
  'support/pages',
  'support/data',
  'support/utils',
  'tests/UI',
  'tests/API',
];

const SCAFFOLDS: Record<string, string> = {
  'support/utils/constants.ts': `export const DESKTOP_VIEW_PORT = { width: 1280, height: 800 };
export const MOBILE_VIEW_PORT  = { width: 375,  height: 667 };
`,

  'support/fixtures/visitFixture.ts': `import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import { DESKTOP_VIEW_PORT, MOBILE_VIEW_PORT } from '../utils/constants.js';

type TestFixture = { page: Page };

const baseURL = process.env['BASE_URL'] ?? '';
if (!baseURL) {
    console.warn('WARNING: BASE_URL is not set. Check your .env or config/environments/*.env');
}

async function setupPage(browser: any, viewportSize: { width: number; height: number }) {
    const context = await browser.newContext();
    const page    = await context.newPage();
    await page.setViewportSize(viewportSize);
    if (baseURL) { await page.goto(baseURL); await page.waitForLoadState('load'); }
    return { page, context };
}

export const testDesktop = base.extend<TestFixture>({
    page: async ({ browser }, use) => {
        const { page } = await setupPage(browser, DESKTOP_VIEW_PORT);
        await use(page);
    },
});

export const testMobile = base.extend<TestFixture>({
    page: async ({ browser }, use) => {
        const { page } = await setupPage(browser, MOBILE_VIEW_PORT);
        await use(page);
    },
});
`,

  'support/helper/interceptHelper.ts': `import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export function getUserCredentials(): { email: string; password: string } {
    const env      = process.env['ENVIRONMENT'] || 'qa';
    const email    = process.env[\`\${env.toUpperCase()}_USER_EMAIL\`] || '';
    const password = process.env[\`\${env.toUpperCase()}_USER_PASS\`]  || '';
    if (!email || !password) throw new Error(\`Missing credentials for environment: \${env}\`);
    return { email, password };
}

export async function verifyPageTitle(page: Page, expectedTitle: string): Promise<void> {
    const pageTitle = page.locator('#root h1');
    await pageTitle.waitFor({ state: 'visible' });
    await expect(pageTitle).toContainText(expectedTitle);
}

export async function waitForSelector(page: Page, selector: string, timeout = 30000): Promise<void> {
    try { await page.waitForSelector(selector, { timeout }); }
    catch (error) { console.error(\`Error waiting for selector: \${error}\`); }
}
`,

  'support/helper/apiHelper.ts': `const ENV = process.env['ENVIRONMENT'] || 'qa';

export function getApiConfig() {
    const baseURL = process.env['API_BASE_URL'] || '';
    return { baseURL, loginURL: \`\${baseURL}/log-in\` };
}

export function getUserCredentials(): { email: string; password: string } {
    const email    = process.env[\`\${ENV.toUpperCase()}_USER_EMAIL\`] || '';
    const password = process.env[\`\${ENV.toUpperCase()}_USER_PASS\`]  || '';
    if (!email || !password) throw new Error(\`Missing credentials for environment: \${ENV}\`);
    return { email, password };
}

export function getEnvironment(): string { return ENV; }
`,

  'support/helper/fileReader.ts': `import fs from 'fs';
import path from 'path';

export function readJson(fileName: string) {
    const filePath = path.join('support', 'data', \`\${fileName}.json\`);
    if (!fs.existsSync(filePath)) throw new Error(\`JSON file not found: \${filePath}\`);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function loadCSV(filePath: string): string[] {
    return fs.readFileSync(filePath, 'utf-8')
        .split(/\\r?\\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}
`,

  'support/helper/loginHelper.ts': `import type { Page } from '@playwright/test';
import { getUserCredentials } from './interceptHelper.js';

const BASE_URL = process.env['BASE_URL'] ?? '';

export async function loginToParaBank(page: Page): Promise<void> {
    const { email: username, password } = getUserCredentials();
    await page.goto(\`\${BASE_URL}/index.htm\`);
    await page.waitForLoadState('load');
    await page.locator("input[name='username']").fill(username);
    await page.locator("input[name='password']").fill(password);
    await page.locator("input[type='submit'].button").click();
    await page.waitForLoadState('load');
}

export async function navigateTo(page: Page, path: string): Promise<void> {
    await page.goto(\`\${BASE_URL}/\${path}\`);
    await page.waitForLoadState('load');
}
`,

  'support/helper/commonPattern.ts': `import type { Page } from '@playwright/test';

export default class CorePattern {
    constructor(private readonly page: Page) {}

    async clickUserMenu(menuName: string): Promise<void> {
        const userDropdown = this.page.locator("[class^='index-module_userDropdown']");
        await userDropdown.waitFor({ state: 'visible' });
        await userDropdown.click();
        await this.page.getByText(menuName, { exact: true }).click();
        console.info(\`Navigated to "\${menuName}" via user menu.\`);
    }

    async clickHamburgerMenu(menuName: string): Promise<void> {
        const menuButton = this.page.locator("[class^='index-module_mobileNavMenu'] button");
        await menuButton.click();
        await this.page.getByText(menuName, { exact: true }).click();
        console.info(\`Navigated to "\${menuName}" via hamburger menu.\`);
    }
}
`,

  'support/pages/example.page.ts': `import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

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
`,

  'support/data/exampleData.json': `{
  "exampleValue": "example"
}
`,
};

export function ensureScaffoldFiles(): void {
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  let created = 0;
  for (const [filePath, content] of Object.entries(SCAFFOLDS)) {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf-8');
      created++;
    }
  }
  if (created > 0) console.log(`  Scaffold      : created ${created} support file(s)`);
}
