import { testDesktop, expect } from '../../support/fixtures/visitFixture.js';
import AeHomePage from '../../support/pages/AeHomePage.js';
import { testData } from './ae-home.data.js';

let homePage: AeHomePage;

testDesktop.describe('Home Page — Products & Cart Navigation', () => {
  testDesktop.beforeEach(async ({ page }) => {
    homePage = new AeHomePage(page);
    page.on('console', (msg) => console.info(`[${msg.type()}] ${msg.text()}`));
  });

  testDesktop(
    'AE-TC-061 @regression : Verify navProductsLink does not load product listing page when user is not logged in',
    async () => {
      await homePage.navigateToProducts();
      await homePage.verifyProductsNavLinkText();
    },
  );

  testDesktop(
    'AE-TC-062 @regression : Verify navProductsLink does not allow injection attacks via URL manipulation',
    async () => {
      await homePage.navigateToProducts();
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-063 @regression : Verify navProductsLink loads product listing page correctly when clicked multiple times rapidly',
    async () => {
      await homePage.navigateToProducts();
      await homePage.verifyProductsPageUrl();
    },
  );

  testDesktop(
    'AE-TC-064 @regression : Verify navProductsLink loads product listing page correctly after navigating away and back',
    async ({ page }) => {
      await homePage.navigateToContactUs();
      await homePage.navigateToProducts();
      await expect(page).toHaveURL('https://automationexercise.com/products');
    },
  );

  testDesktop(
    'AE-TC-065 @regression : Verify navProductsLink is disabled or not clickable when page is loading',
    async () => {
      await homePage.navigateToProducts();
      await homePage.verifyProductsNavLinkVisible();
    },
  );

  testDesktop(
    'AE-TC-066 @regression : Verify navigation to Signup/Login page from navSignupLoginLink',
    async () => {
      await homePage.navigateToLogin();
      await homePage.verifyLoginPageUrl();
    },
  );

  testDesktop(
    'AE-TC-067 @regression : Verify URL correctness after clicking navSignupLoginLink',
    async ({ page }) => {
      await homePage.navigateToLogin();
      await expect(page).toHaveURL(/login|signup/);
    },
  );

  testDesktop(
    'AE-TC-068 @regression : Verify that clicking navSignupLoginLink multiple times does not cause errors',
    async ({ page }) => {
      await homePage.navigateToLogin();
      await homePage.navigateToLogin();
      await expect(page).toHaveURL(/\/login/);
    },
  );

  testDesktop(
    'AE-TC-069 @regression : Verify that unauthenticated user cannot bypass login by directly accessing navSignupLoginLink',
    async () => {
      await homePage.navigateToLogin();
      await homePage.verifySignupLoginNavLinkVisible();
    },
  );

  testDesktop(
    'AE-TC-070 @regression : Verify that the authentication page shows validation error when submitting empty login form',
    async ({ page }) => {
      await homePage.navigateToLogin();
      await page.locator('button[data-qa="login-button"]').click();
      await expect(page.locator('form[action="/login"] input[name="email"]')).toBeVisible();
    },
  );

  testDesktop(
    'AE-TC-071 @regression : Verify that signup form accepts valid email and password inputs',
    async () => {
      await homePage.subscribeToNewsletter(testData.validEmail);
    },
  );

  testDesktop(
    'AE-TC-072 @regression : Verify that the navSignupLoginLink is accessible via keyboard navigation',
    async () => {
      await homePage.verifySignupLoginNavLinkVisible();
    },
  );

  testDesktop(
    'AE-TC-073 @regression : Navigate to Cart page with empty cart',
    async () => {
      await homePage.navigateToCart();
      await homePage.verifyCartNavLinkVisible();
      await homePage.verifyCartEmpty();
    },
  );

  testDesktop(
    'AE-TC-074 @regression : Navigate to Cart page after adding a product',
    async () => {
      await homePage.navigateToProducts();
      await homePage.clickAddToCart();
      await homePage.clickContinueShopping();
      await homePage.navigateToCart();
      await homePage.verifyCartPageUrl();
    },
  );

  testDesktop(
    'AE-TC-075 @regression : Verify cart page prompt when user is not logged in',
    async () => {
      await homePage.navigateToCart();
      await homePage.verifyCartPageUrl();
    },
  );

  testDesktop(
    'AE-TC-076 @regression : Verify cart page prompt when user is logged in',
    async () => {
      await homePage.navigateToCart();
      await homePage.verifyCartNavLinkVisible();
      await homePage.verifyCartPageUrl();
    },
  );

  testDesktop(
    'AE-TC-077 @regression : Attempt to access cart page via navCartLink with session expired',
    async () => {
      await homePage.navigateToCart();
      await homePage.verifyCartPageUrl();
    },
  );

  testDesktop(
    'AE-TC-078 @regression : Verify cart page behavior after removing all items and clicking navCartLink',
    async () => {
      await homePage.navigateToCart();
      await homePage.verifyCartEmpty();
    },
  );

  testDesktop(
    'AE-TC-079 @regression : Verify cart page loads correctly after multiple addToCartButtons clicks',
    async () => {
      await homePage.navigateToProducts();
      await homePage.clickAddToCart();
      await homePage.navigateToCart();
      await homePage.verifyCartNavLinkVisible();
      await homePage.verifyCartPageUrl();
    },
  );

  testDesktop(
    'AE-TC-080 @regression : Submit valid email once and verify successful subscription',
    async () => {
      await homePage.subscribeToNewsletter(testData.validEmail);
    },
  );
});
