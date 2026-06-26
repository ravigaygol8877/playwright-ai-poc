import { testMobile, expect } from '../../support/fixtures/visitFixture.js';
import AeHomePage from '../../support/pages/AeHomePage.js';

let homePage: AeHomePage;

testMobile.describe('Home Page - Mobile', () => {
  testMobile.beforeEach(async ({ page }) => {
    homePage = new AeHomePage(page);
    page.on('console', (msg) => console.info(`[${msg.type()}] ${msg.text()}`));
  });

  testMobile(
    'AE-MOB-001 @mobile @smoke : Verify homepage loads correctly on mobile viewport',
    async ({ page }) => {
      await expect(page).toHaveURL(/automationexercise/);
      await homePage.verifyPageLoaded();
    },
  );

  testMobile(
    'AE-MOB-002 @mobile @smoke : Verify nav links are visible on mobile viewport',
    async () => {
      await homePage.verifyNavLinksVisible();
    },
  );

  testMobile(
    'AE-MOB-003 @mobile : Verify add to cart works on mobile viewport',
    async () => {
      await homePage.clickAddToCart();
      await homePage.verifyAddToCartSuccess();
    },
  );

  testMobile(
    'AE-MOB-004 @mobile : Verify category links visible on mobile viewport',
    async () => {
      await homePage.verifyCategoryLinksVisible();
    },
  );
});
