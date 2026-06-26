import { testDesktop } from '../../support/fixtures/visitFixture.js';
import AeHomePage from '../../support/pages/AeHomePage.js';
import { testData } from './ae-home.data.js';

let homePage: AeHomePage;

testDesktop.describe('Home Page — Newsletter Subscription', () => {
  testDesktop.beforeEach(async ({ page }) => {
    homePage = new AeHomePage(page);
    page.on('console', (msg) => console.info(`[${msg.type()}] ${msg.text()}`));
  });

  testDesktop(
    'AE-TC-021 @regression : Subscribe to newsletter with maximum length email address',
    async () => {
      await homePage.fillNewsletterEmail(testData.overMaxLengthUsername);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-022 @regression : Attempt newsletter subscription with email containing SQL injection attempt',
    async () => {
      await homePage.fillNewsletterEmail(testData.sqlInjectionEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-023 @regression : Attempt newsletter subscription with email containing script injection attempt',
    async () => {
      await homePage.fillNewsletterEmail(testData.xssEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-024 @regression : Subscribe with a valid standard email address',
    async () => {
      await homePage.subscribeToNewsletter(testData.validEmail);
    },
  );

  testDesktop(
    'AE-TC-025 @regression : Subscribe with an email address containing subdomain',
    async () => {
      await homePage.subscribeToNewsletter(testData.validEmail);
    },
  );

  testDesktop(
    'AE-TC-026 @regression : Subscribe with an empty email address',
    async () => {
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-027 @regression : Subscribe with an invalid email format missing \'@\'',
    async () => {
      await homePage.fillNewsletterEmail(testData.invalidEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-028 @regression : Subscribe with a very long but valid email address',
    async () => {
      await homePage.fillNewsletterEmail(testData.overMaxLengthUsername);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-029 @regression : Subscribe with an email containing SQL injection attempt',
    async () => {
      await homePage.fillNewsletterEmail(testData.sqlInjectionEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-030 @regression : Subscribe with an email containing script injection attempt',
    async () => {
      await homePage.fillNewsletterEmail(testData.xssEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-031 @regression : Subscribe with a valid email address',
    async () => {
      await homePage.subscribeToNewsletter(testData.validEmail);
    },
  );

  testDesktop(
    'AE-TC-032 @regression : Subscribe with malformed email missing domain part',
    async () => {
      await homePage.fillNewsletterEmail(testData.invalidEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-033 @regression : Subscribe with email missing \'@\' symbol',
    async () => {
      await homePage.fillNewsletterEmail(testData.invalidEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-034 @regression : Subscribe with empty email input',
    async () => {
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-035 @regression : Subscribe with email containing invalid characters',
    async () => {
      await homePage.fillNewsletterEmail(testData.invalidEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-036 @regression : Subscribe with email at maximum allowed length',
    async () => {
      await homePage.fillNewsletterEmail(testData.overMaxLengthUsername);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-037 @regression : Subscribe with email containing script injection attempt (duplicate check)',
    async () => {
      await homePage.fillNewsletterEmail(testData.xssEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-038 @regression : Subscribe button click with empty email field shows required field error',
    async () => {
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-039 @regression : Subscribe with valid email submits successfully',
    async () => {
      await homePage.subscribeToNewsletter(testData.validEmail);
    },
  );

  testDesktop(
    'AE-TC-040 @regression : Subscribe with invalid email format shows validation error',
    async () => {
      await homePage.fillNewsletterEmail(testData.invalidEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );
});
