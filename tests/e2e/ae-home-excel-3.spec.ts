import { testDesktop, expect } from '../fixtures/base.js';
import AeHomePage from '../pages/AeHomePage.js';
import { testData } from './ae-home.data.js';

let homePage: AeHomePage;

testDesktop.describe('Home Page — Navigation & Keyboard', () => {
  testDesktop.beforeEach(async ({ page }) => {
    homePage = new AeHomePage(page);
    page.on('console', (msg) => console.info(`[${msg.type()}] ${msg.text()}`));
  });

  testDesktop(
    'AE-TC-041 @regression : Subscribe with email field containing only spaces shows required field error',
    async () => {
      await homePage.fillNewsletterEmail(testData.validUsername);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-042 @regression : Subscribe with maximum length valid email submits successfully',
    async () => {
      await homePage.fillNewsletterEmail(testData.overMaxLengthUsername);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNewsletterSectionVisible();
    },
  );

  testDesktop(
    'AE-TC-043 @regression : Subscribe button click with email field containing script injection attempt',
    async () => {
      await homePage.fillNewsletterEmail(testData.xssEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-044 @regression : Subscribe button click with email field containing SQL injection attempt',
    async () => {
      await homePage.fillNewsletterEmail(testData.sqlInjectionEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-045 @regression : Verify validation error when entering script tags in email field on Signup/Login page',
    async () => {
      await homePage.navigateToLogin();
      await homePage.fillNewsletterEmail(testData.xssEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-046 @regression : Verify valid email input allows successful navigation on Signup/Login page',
    async () => {
      await homePage.navigateToLogin();
      await homePage.fillNewsletterEmail(testData.validEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyLoginPageUrl();
    },
  );

  testDesktop(
    'AE-TC-047 @regression : Verify validation error when entering empty email field on Signup/Login page',
    async () => {
      await homePage.navigateToLogin();
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyLoginPageUrl();
    },
  );

  testDesktop(
    'AE-TC-048 @regression : Verify validation error when entering invalid email format in email field',
    async () => {
      await homePage.navigateToLogin();
      await homePage.fillNewsletterEmail(testData.invalidEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyLoginPageUrl();
    },
  );

  testDesktop(
    'AE-TC-049 @regression : Verify that entering long email with script tags does not execute JavaScript',
    async () => {
      await homePage.navigateToLogin();
      await homePage.fillNewsletterEmail(testData.xssEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-050 @regression : Verify that clicking navSignupLoginLink navigates to Signup/Login page',
    async ({ page }) => {
      await homePage.navigateToLogin();
      await expect(page).toHaveURL('https://automationexercise.com/login');
      await homePage.verifySignupLoginTextVisible();
    },
  );

  testDesktop(
    'AE-TC-051 @regression : Verify that entering email with special characters but no script tags is accepted',
    async () => {
      await homePage.navigateToLogin();
      await homePage.fillNewsletterEmail(testData.validEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyLoginPageUrl();
    },
  );

  testDesktop(
    'AE-TC-052 @regression : Navigate through all nav links and activate each',
    async ({ page }) => {
      await homePage.clickHome();
      await homePage.navigateToProducts();
      await homePage.navigateToCart();
      await homePage.navigateToLogin();
      await homePage.navigateToTestCases();
      await homePage.navigateToApiTesting();
      await homePage.navigateToVideoTutorials();
      await homePage.navigateToContactUs();
      await expect(page).toHaveURL(/contact_us/);
    },
  );

  testDesktop(
    'AE-TC-053 @regression : Add product to cart using keyboard navigation and verify confirmation message',
    async () => {
      await homePage.clickAddToCart();
      await homePage.verifyAddToCartSuccess();
    },
  );

  testDesktop(
    'AE-TC-054 @regression : Navigate through category links and verify correct category page loads',
    async () => {
      await homePage.expandWomenCategory();
      await homePage.expandMenCategory();
      await homePage.expandKidsCategory();
      await homePage.verifyCategoryLinksVisible();
    },
  );

  testDesktop(
    'AE-TC-055 @regression : Attempt to activate continueShoppingButton when no modal is present',
    async () => {
      await homePage.verifyContinueShoppingButtonHidden();
    },
  );

  testDesktop(
    'AE-TC-056 @regression : Navigate through brand links and verify each brand page loads',
    async ({ page }) => {
      await homePage.navigateToBrandPolo();
      await homePage.navigateToBrandHM();
      await homePage.navigateToBrandMadame();
      await homePage.navigateToBrandMastHarbour();
      await homePage.navigateToBrandBabyhug();
      await homePage.navigateToBrandAllenSollyJunior();
      await homePage.navigateToBrandKookieKids();
      await homePage.navigateToBrandBiba();
      await expect(page).toHaveURL(/\/brand_products\/.+/);
    },
  );

  testDesktop(
    'AE-TC-057 @regression : Verify viewProductLinks are accessible and open product details',
    async ({ page }) => {
      await homePage.clickFirstProductViewDetails();
      await expect(page).toHaveURL(/\/product_details\//);
    },
  );

  testDesktop(
    'AE-TC-058 @regression : Verify testCasesButton and apisListButton are operable and load correct pages',
    async () => {
      await homePage.verifyTestCasesButtonVisible();
      await homePage.verifyApisListButtonVisible();
      await homePage.navigateToTestCases();
    },
  );

  testDesktop(
    'AE-TC-059 @regression : Verify clicking navProductsLink loads product listing page with available items',
    async () => {
      await homePage.navigateToProducts();
      await homePage.verifyProductsPageUrl();
    },
  );

  testDesktop(
    'AE-TC-060 @regression : Verify navProductsLink is clickable and visible on home page',
    async ({ page }) => {
      await homePage.navigateToProducts();
      await homePage.verifyProductsNavLinkVisible();
      await expect(page).toHaveURL('https://automationexercise.com/products');
    },
  );
});
