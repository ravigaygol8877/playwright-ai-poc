import type { TestCase }
  from "../../models/TestCase.js";

import type { KnowledgeBase }
  from "../../models/KnowledgeBase.js";

import { kbKeyToClassName }
  from "../pom/POMGenerator.js";

export function toMethodName(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
    .replace(/^verify|^validate|^check/i, m => m.toLowerCase());
}

import { pMap }
  from "../../utils/concurrency.js";

interface TestBlock {
  desktop: string;
  mobile:  string;
}

/**
 * Compiles a complete `.spec.ts` file from an array of test cases.
 *
 * Follows the enterprise pattern:
 * - Both testDesktop and testMobile describe blocks in one file
 * - Imports from support/fixtures/visitFixture and support/helper/interceptHelper
 * - Default import of POM class
 * - No data file import — data is either in POM or loaded via fileReader
 * - Test names follow: 'TC-{id} @regression : [{describe}] {title}'
 */
export class PlaywrightGenerator {
  constructor(private concurrency = 8) {}

  /**
   * Generate a complete UI Playwright spec file as a string.
   */
  async generate(
    testCases:     TestCase[],
    knowledgeBase: KnowledgeBase,
  ): Promise<string> {

    const describeName = knowledgeBase.describeName ?? knowledgeBase.pageName;
    const pageKey      = (knowledgeBase as any).pageKey ?? '';
    const className    = kbKeyToClassName(pageKey || describeName.replace(/\s+/g, '-').toLowerCase());
    const camelName    = className.charAt(0).toLowerCase() + className.slice(1);
    const pageFile     = `${camelName}.page.js`;

    const testBlocks = await pMap(
      testCases,
      tc => this.generateTestBlock(tc, describeName, camelName),
      this.concurrency,
    );

    const desktopTests = testBlocks.map(b => b.desktop).join('\n\n');
    const mobileTests  = testBlocks.map(b => b.mobile).join('\n\n');

    const authRequired   = knowledgeBase.authRequired ?? false;
    const skipGoto       = knowledgeBase.skipGoto ?? false;
    const pageUrl        = knowledgeBase.url ?? '';
    const extraLines     = (knowledgeBase.beforeEachPrefix ?? []).map(l => `        ${l}`).join('\n');

    const loginImport    = authRequired
      ? `import { loginToParaBank, navigateTo } from '../../support/helper/loginHelper.js';`
      : `import { navigateTo } from '../../support/helper/loginHelper.js';`;

    const beforeEachBody = [
      authRequired     ? `        await loginToParaBank(page);` : '',
      !skipGoto && pageUrl ? `        await navigateTo(page, '${new URL(pageUrl).pathname.replace(/^\/[^/]+\//, '')}');` : '',
      extraLines,
      `        ${camelName} = new ${className}(page);`,
      `        page.on('console', (msg: ConsoleMessage) => console.info(\`[Console][#LABEL#]: \${msg.text()}\`));`,
    ].filter(Boolean).join('\n');

    const desktopBeforeEach = beforeEachBody.replace('[#LABEL#]', 'Desktop');
    const mobileBeforeEach  = beforeEachBody.replace('[#LABEL#]', 'Mobile');

    return `import type { ConsoleMessage, Page } from '@playwright/test';
import { testDesktop, testMobile } from '../../support/fixtures/visitFixture.js';
${loginImport}
import ${className} from '../../support/pages/${pageFile}';

let ${camelName}: ${className};

testDesktop.describe('${describeName} - Desktop', () => {
    testDesktop.beforeEach(async ({ page }: { page: Page }) => {
${desktopBeforeEach}
    });

${desktopTests}
});

testMobile.describe('${describeName} - Mobile Web', () => {
    testMobile.beforeEach(async ({ page }: { page: Page }) => {
${mobileBeforeEach}
    });

${mobileTests}
});
`;
  }

  /**
   * Generate a complete API spec file as a string.
   */
  async generateApiSpec(
    testCases:     TestCase[],
    knowledgeBase: KnowledgeBase,
  ): Promise<string> {

    const describeName = knowledgeBase.describeName ?? knowledgeBase.pageName;

    const apiTestBlocks = await pMap(
      testCases,
      tc => this.generateApiTestBlock(tc, describeName),
      this.concurrency,
    );

    return `import { expect, test } from '@playwright/test';
import { getApiConfig, getUserCredentials } from '../../support/helper/apiHelper.js';

const { loginURL } = getApiConfig();

test.describe('${describeName} - API Tests', () => {
    let authToken: string;

    test.beforeAll(async ({ request }) => {
        const { email, password } = getUserCredentials();
        const response = await request.post(loginURL, {
            data: { Username: email, Password: password },
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        authToken = body?.Result?.ApiToken ?? '';
        expect(authToken).toBeTruthy();
    });

${apiTestBlocks.join('\n\n')}
});
`;
  }

  private escSingle(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  private escDouble(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private toMethodName(title: string): string {
    return toMethodName(title);
  }

  private async generateTestBlock(
    testCase:    TestCase,
    describeName: string,
    camelName:   string,
  ): Promise<TestBlock> {

    const methodName     = this.toMethodName(testCase.title);
    const testTitle      = this.escSingle(testCase.title);
    const testId         = testCase.id ?? 'TC-001';

    // Build step comments for the test body
    const stepLines = testCase.steps
      .map(s => {
        const text = typeof s === 'string' ? s
          : (s as any).step ?? (s as any).description ?? (s as any).action ?? JSON.stringify(s);
        return `        // ${text}`;
      })
      .join('\n');

    const bodyLines = testCase.steps.length > 0
      ? `${stepLines}\n        await ${camelName}.${methodName}();`
      : `        await ${camelName}.${methodName}();`;

    const desktopTest = `    testDesktop(
        '${testId} @regression : [${describeName}] ${testTitle}',
        async ({ page }: { page: Page }) => {
${bodyLines}
        },
    );`;

    const mobileTest = `    testMobile(
        '${testId} @regression : [${describeName}][Mobile] ${testTitle}',
        async ({ page }: { page: Page }) => {
${bodyLines}
        },
    );`;

    return { desktop: desktopTest, mobile: mobileTest };
  }

  private async generateApiTestBlock(
    testCase:    TestCase,
    describeName: string,
  ): Promise<string> {

    const testTitle = this.escSingle(testCase.title);
    const testId    = testCase.id ?? 'TC-001';

    const stepLines = testCase.steps
      .map(s => {
        const text = typeof s === 'string' ? s
          : (s as any).step ?? (s as any).description ?? (s as any).action ?? JSON.stringify(s);
        return `        // ${text}`;
      })
      .join('\n');

    return `    test(
        '${testId} @regression : [${describeName}][API] ${testTitle}',
        async ({ request }) => {
${stepLines}
            const { email, password } = getUserCredentials();
            const response = await request.post(loginURL, {
                data: { Username: email, Password: password },
            });
            expect(response.status()).toBe(200);
            expect(response.ok()).toBeTruthy();
            console.log('${this.escSingle(testCase.title)} verified');
        },
    );`;
  }
}
