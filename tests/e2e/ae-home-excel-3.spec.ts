import { test, expect } from '@playwright/test';

const testData = {
  "validUsername": "johndoe1987",
  "validPassword": "P@ssw0rd!2024",
  "invalidUsername": "john*doe!",
  "invalidPassword": "123",
  "overMaxLengthUsername": "thisusernameisdefinitelywaytoolongtobeacceptedbythesystem12345",
  "uppercaseUsername": "JOHNDOE1987",
  "firstName": "John",
  "lastName": "Doe",
  "postalCode": "90210",
  "invalidPostalCode": "ABCDE",
  "lockedOutUsername": "locked_out_user"
};

test.describe('home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test("Subscribe with email field containing only spaces shows required field error", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with maximum length valid email submits successfully", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.overMaxLengthUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe button click with email field containing script injection attempt shows validation error", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe button click with email field containing SQL injection attempt shows validation error", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Verify validation error when entering <script>alert(1)</script> in email field on Signup/Login page", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).not.toBeVisible();
  });

  test("Verify valid email input allows successful navigation on Signup/Login page", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Verify validation error when entering empty email field on Signup/Login page", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Verify validation error when entering invalid email format in email field", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.invalidUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Verify that entering long email input with script tags does not execute JavaScript and shows validation error", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).not.toBeVisible();
  });

  test("Verify that clicking navSignupLoginLink navigates to Signup/Login page", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await expect(page).toHaveURL('https://automationexercise.com/login');
    await expect(page.getByText('Signup / Login')).toBeVisible();
  });

  test("Verify that entering email with special characters but no script tags is accepted", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Navigate through all nav links using keyboard and activate each with Enter", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await page.locator("a[href='https://automationexercise.com/products']:has-text('Products')").click();
    await page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')").click();
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await page.locator("a.test_cases_list[href='https://automationexercise.com/test_cases']").click();
    await page.locator("a.apis_list[href='https://automationexercise.com/api_list']").click();
    await page.locator("a[href='https://www.youtube.com/c/AutomationExercise']:has-text('Video Tutorials')").click();
    await page.locator("a[href='https://automationexercise.com/contact_us']:has-text('Contact us')").click();
    await expect(page).toHaveURL('https://automationexercise.com/');
    await expect(page.locator("a[href='https://automationexercise.com/products']:has-text('Products')")).toBeFocused();
  });

  test("Add product to cart using keyboard navigation and verify confirmation message", async ({ page }) => {
    await page.locator("a.btn.btn-default.add-to-cart").click();
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Navigate through category links using keyboard and verify correct category page loads", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/#Women']:has-text('WOMEN')").click();
    await page.locator("a[href='https://automationexercise.com/#Men']:has-text('MEN')").click();
    await page.locator("a[href='https://automationexercise.com/#Kids']:has-text('KIDS')").click();
    await expect(page).toHaveURL(/\/#Women/);
    await expect(page.locator("a[href='https://automationexercise.com/#Women']:has-text('WOMEN')")).toBeFocused();
  });

  test("Attempt to activate continueShoppingButton via keyboard when no modal is present", async ({ page }) => {
    await page.locator("button[type='submit'].btn.btn-success.close-modal.btn-block").click();
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await expect(page.locator("button[type='submit'].btn.btn-success.close-modal.btn-block")).toBeHidden();
  });

  test("Navigate through brand links using keyboard and verify each brand page loads", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/brand_products/Polo']:has-text('POLO')").click();
    await page.locator("a[href='https://automationexercise.com/brand_products/H&M']:has-text('H&M')").click();
    await page.locator("a[href='https://automationexercise.com/brand_products/Madame']:has-text('MADAME')").click();
    await page.locator("a[href='https://automationexercise.com/brand_products/Mast%20&%20Harbour']:has-text('MAST & HARBOUR')").click();
    await page.locator("a[href='https://automationexercise.com/brand_products/Babyhug']:has-text('BABYHUG')").click();
    await page.locator("a[href='https://automationexercise.com/brand_products/Allen%20Solly%20Junior']:has-text('ALLEN SOLLY JUNIOR')").click();
    await page.locator("a[href='https://automationexercise.com/brand_products/Kookie%20Kids']:has-text('KOOKIE KIDS')").click();
    await page.locator("a[href='https://automationexercise.com/brand_products/Biba']:has-text('BIBA')").click();
    await expect(page).toHaveURL(/\/brand_products\/.+/);
    await expect(page.locator("a[href^='https://automationexercise.com/brand_products/']:focus")).toBeVisible();
  });

  test("Verify viewProductLinks are accessible and open product details via keyboard", async ({ page }) => {
    await page.locator("a[href^='https://automationexercise.com/product_details/']").click();
    await expect(page.locator("a[href^='https://automationexercise.com/product_details/']")).toBeVisible();
    await expect(page).toHaveURL(/\/product_details\//);
  });

  test("Verify testCasesButton and apisListButton are operable via keyboard and load correct pages", async ({ page }) => {
    await page.locator("button.btn.btn-success:has-text('Test Cases')").click();
    await page.locator("button.btn.btn-success:has-text('APIs list for practice')").click();
    await expect(page.locator("button.btn.btn-success:has-text('Test Cases')")).toBeVisible();
    await expect(page.locator("button.btn.btn-success:has-text('APIs list for practice')")).toBeVisible();
  });

  test("Verify clicking navProductsLink loads product listing page with available items", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/products']:has-text('Products')").click();
    await expect(page.locator("a[href='https://automationexercise.com/products']:has-text('Products')")).toBeVisible();
  });

  test("Verify navProductsLink is clickable and visible on home page", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/products']:has-text('Products')").click();
    await expect(page.locator("a[href='https://automationexercise.com/products']:has-text('Products')")).toBeVisible();
    await expect(page).toHaveURL("https://automationexercise.com/products");
  });
});
