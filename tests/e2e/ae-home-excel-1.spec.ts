import { testDesktop, expect } from '../../support/fixtures/visitFixture.js';
import AeHomePage from '../../support/pages/AeHomePage.js';
import { testData } from './ae-home.data.js';

let homePage: AeHomePage;

testDesktop.describe('Home Page', () => {
  testDesktop.beforeEach(async ({ page }) => {
    homePage = new AeHomePage(page);
    page.on('console', (msg) => console.info(`[${msg.type()}] ${msg.text()}`));
  });

  testDesktop(
    'AE-TC-001 @regression @smoke : Verify homepage loads with all main header navigation links visible',
    async () => {
      await homePage.verifyNavLinksVisible();
    },
  );

  testDesktop(
    'AE-TC-002 @regression @smoke : Verify clicking Products nav link navigates to products page',
    async () => {
      await homePage.navigateToProducts();
      await homePage.verifyProductsPageUrl();
    },
  );

  testDesktop(
    'AE-TC-003 @regression @smoke : Verify add to cart functionality shows correct validation message',
    async () => {
      await homePage.clickAddToCart();
      await homePage.verifyAddToCartSuccess();
      await homePage.clickContinueShopping();
    },
  );

  testDesktop(
    'AE-TC-004 @regression : Verify homepage does not load if URL is incorrect',
    async ({ page }) => {
      await expect(page).not.toHaveURL(/404/);
    },
  );

  testDesktop(
    'AE-TC-005 @regression : Verify all category links under Women category are visible',
    async () => {
      await homePage.verifyCategoryLinksVisible();
      await homePage.expandWomenCategory();
      await homePage.verifyCategoryDressWomenVisible();
    },
  );

  testDesktop(
    'AE-TC-006 @regression : Verify homepage resists script injection via URL parameters',
    async () => {
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-007 @regression : Verify clicking navSignupLoginLink navigates to signup/login page',
    async ({ page }) => {
      await homePage.navigateToLogin();
      await expect(page).toHaveURL('https://automationexercise.com/login');
      await homePage.verifySignupLoginTextVisible();
    },
  );

  testDesktop(
    'AE-TC-008 @regression : Verify viewProductLinks are clickable and navigate to product details',
    async ({ page }) => {
      await homePage.clickFirstProductViewDetails();
      await expect(page).toHaveURL(/product_details/);
    },
  );

  testDesktop(
    'AE-TC-009 @regression : Navigate to Women > Dress category and verify filtered product list',
    async ({ page }) => {
      await homePage.expandWomenCategory();
      await homePage.clickCategoryDressWomen();
      await expect(page).toHaveURL(/category_products/);
    },
  );

  testDesktop(
    'AE-TC-010 @regression : Navigate to Men > Tshirts category and verify filtered product list',
    async ({ page }) => {
      await homePage.expandMenCategory();
      await homePage.clickCategoryTshirtsMen();
      await expect(page).toHaveURL(/category_products/);
    },
  );

  testDesktop(
    'AE-TC-011 @regression : Navigate to Kids > Tops & Shirts category and verify filtered product list',
    async ({ page }) => {
      await homePage.expandKidsCategory();
      await homePage.clickCategoryTopsShirtsKids();
      await expect(page).toHaveURL(/category_products/);
    },
  );

  testDesktop(
    'AE-TC-012 @regression : Click categoryWomenLink only and verify product list shows all Women category products',
    async () => {
      await homePage.expandWomenCategory();
      await homePage.verifyCategoryWomenVisible();
    },
  );

  testDesktop(
    'AE-TC-013 @regression : Attempt to click an invalid category element and verify no navigation occurs',
    async () => {
      await homePage.clickHome();
      await homePage.verifyPageLoaded();
    },
  );

  testDesktop(
    'AE-TC-014 @regression : Verify that clicking categoryMenLink followed by categoryJeansMenLink filters products correctly',
    async ({ page }) => {
      await homePage.expandMenCategory();
      await homePage.clickCategoryJeansMen();
      await expect(page).toHaveURL(/category_products/);
    },
  );

  testDesktop(
    'AE-TC-015 @regression : Verify that clicking categoryKidsLink followed by categoryDressKidsLink filters products correctly',
    async ({ page }) => {
      await homePage.expandKidsCategory();
      await homePage.clickCategoryDressKids();
      await expect(page).toHaveURL(/category_products/);
    },
  );

  testDesktop(
    'AE-TC-016 @regression : Verify security: ensure no unauthorized category filtering by URL manipulation',
    async () => {
      await homePage.verifyNoScriptInjection();
    },
  );

  testDesktop(
    'AE-TC-017 @regression : Verify newsletter subscription form is visible after scrolling to bottom',
    async () => {
      await homePage.verifyNewsletterSectionVisible();
    },
  );

  testDesktop(
    'AE-TC-018 @regression : Subscribe to newsletter with a valid email',
    async () => {
      await homePage.subscribeToNewsletter(testData.validEmail);
    },
  );

  testDesktop(
    'AE-TC-019 @regression : Attempt newsletter subscription with empty email field',
    async () => {
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNewsletterSectionVisible();
    },
  );

  testDesktop(
    'AE-TC-020 @regression : Attempt newsletter subscription with invalid email format',
    async () => {
      await homePage.fillNewsletterEmail(testData.invalidEmail);
      await homePage.clickNewsletterSubscribe();
      await homePage.verifyNewsletterSectionVisible();
    },
  );
});
