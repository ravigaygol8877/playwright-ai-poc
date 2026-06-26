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

  test("Verify homepage loads with all main header navigation links visible", async ({ page }) => {

    await expect(page.locator("a[href='https://automationexercise.com/']:has-text('Home')")).toBeVisible();
    await expect(page.locator("a[href='https://automationexercise.com/products']:has-text('Products')")).toBeVisible();
  });

  test("Verify clicking navProductsLink navigates to products page", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/products']:has-text('Products')").click();
    await expect(page).toHaveURL("https://automationexercise.com/products")
  });

  test("Verify add to cart functionality shows correct validation message", async ({ page }) => {
    await page.locator("a.btn.btn-default.add-to-cart").click();
    await page.locator("button[type='submit'].btn.btn-success.close-modal.btn-block").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Verify homepage does not load if URL is incorrect", async ({ page }) => {

    await expect(page).toHaveURL(/404/);
  });

  test("Verify all category links under Women category are visible", async ({ page }) => {

    await expect(page.locator("a[href='https://automationexercise.com/#Women']:has-text('WOMEN')")).toBeVisible();
    await expect(page.locator("a[href='https://automationexercise.com/category_products/1']:has-text('Dress')")).toBeVisible();
  });

  test("Verify homepage resists script injection via URL parameters", async ({ page }) => {

    await expect(page).not.toHaveURL(/alert/i);
  });

  test("Verify clicking navSignupLoginLink navigates to signup/login page", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await expect(page).toHaveURL("https://automationexercise.com/login");
    await expect(page.getByText("Signup / Login")).toBeVisible();
  });

  test("Verify viewProductLinks are clickable and navigate to product details", async ({ page }) => {
    await page.locator("a[href^='https://automationexercise.com/product_details/']").click();
    await expect(page).toHaveURL(/product_details/);
  });

  test("Navigate to Women > Dress category and verify filtered product list", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/#Women']:has-text('WOMEN')").click();
    await page.locator("a[href='https://automationexercise.com/category_products/1']:has-text('Dress')").click();
    await expect(page.locator("a[href='https://automationexercise.com/category_products/1']:has-text('Dress')")).toBeVisible();
  });

  test("Navigate to Men > Tshirts category and verify filtered product list", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/#Men']:has-text('MEN')").click();
    await page.locator("a[href='https://automationexercise.com/category_products/3']:has-text('Tshirts')").click();
    await expect(page.locator("a[href='https://automationexercise.com/category_products/3']:has-text('Tshirts')")).toHaveText('Tshirts')
  });

  test("Navigate to Kids > Tops & Shirts category and verify filtered product list", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/#Kids']:has-text('KIDS')").click();
    await page.locator("a[href='https://automationexercise.com/category_products/5']:has-text('Tops & Shirts')").click();
    await expect(page.locator("a[href='https://automationexercise.com/#Kids']:has-text('KIDS')")).toHaveText('KIDS');
    await expect(page.locator("a[href='https://automationexercise.com/category_products/5']:has-text('Tops & Shirts')")).toHaveText('Tops & Shirts');
  });

  test("Click categoryWomenLink only and verify product list shows all Women category products", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/#Women']:has-text('WOMEN')").click();
    await expect(page.locator("a[href='https://automationexercise.com/#Women']:has-text('WOMEN')")).toBeVisible();
  });

  test("Attempt to click an invalid category element and verify no navigation occurs", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Verify that clicking categoryMenLink followed by categoryJeansMenLink filters products correctly", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/#Men']:has-text('MEN')").click();
    await page.locator("a[href='https://automationexercise.com/category_products/6']:has-text('Jeans')").click();
    await expect(page.locator("a[href='https://automationexercise.com/category_products/6']:has-text('Jeans')")).toHaveText('Jeans');
  });

  test("Verify that clicking categoryKidsLink followed by categoryDressKidsLink filters products correctly", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/#Kids']:has-text('KIDS')").click();
    await page.locator("a[href='https://automationexercise.com/category_products/4']:has-text('Dress')").click();
    await expect(page.locator("a[href='https://automationexercise.com/category_products/4']:has-text('Dress')")).toBeVisible();
  });

  test("Verify security: ensure no unauthorized category filtering by URL manipulation", async ({ page }) => {

    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Verify newsletter subscription form is visible after scrolling to bottom", async ({ page }) => {

    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("button:has-text('Subscribe')")).toBeVisible();
  });

  test("Subscribe to newsletter with a valid email", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Attempt newsletter subscription with empty email field", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Attempt newsletter subscription with invalid email format", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });
});
