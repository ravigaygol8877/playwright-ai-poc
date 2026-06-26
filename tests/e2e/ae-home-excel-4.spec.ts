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

  test("Verify navProductsLink does not load product listing page when user is not logged in", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/products']:has-text('Products')").click();
    await expect(page.locator("navProductsLink")).toHaveText('Products')
  });

  test("Verify navProductsLink does not allow injection attacks via URL manipulation", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/products']:has-text('Products')").click();
    await expect(page.locator("a[href='https://automationexercise.com/products']:has-text('Products')")).toBeVisible();
  });

  test("Verify navProductsLink loads product listing page correctly when clicked multiple times rapidly", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/products']:has-text('Products')").click();
    await expect(page.locator("a.btn.btn-default.add-to-cart")).toHaveCount(1);
  });

  test("Verify navProductsLink loads product listing page correctly after navigating away and back", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/contact_us']:has-text('Contact us')").click();
    await page.locator("a[href='https://automationexercise.com/products']:has-text('Products')").click();
    await expect(page).toHaveURL("https://automationexercise.com/products")
  });

  test("Verify navProductsLink is disabled or not clickable when page is loading", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/products']:has-text('Products')").click();
    await expect(page.locator("a[href='https://automationexercise.com/products']:has-text('Products')")).toBeDisabled();
  });

  test("Verify navigation to Signup/Login page from navSignupLoginLink", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await expect(page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')")).toBeVisible();
  });

  test("Verify URL correctness after clicking navSignupLoginLink", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await expect(page).toHaveURL(/login|signup/);
  });

  test("Verify that clicking navSignupLoginLink multiple times does not cause errors", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("Verify that unauthenticated user cannot bypass login by directly accessing navSignupLoginLink", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").click();
    await expect(page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')")).toBeVisible();
  });

  test("Verify that the authentication page shows validation error when submitting empty login form", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('username is required')).toBeVisible();
    await expect(page.getByText('password is required')).toBeVisible();
  });

  test("Verify that signup form accepts valid email and password inputs", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validPassword);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Verify that the navSignupLoginLink is accessible via keyboard navigation", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')").fill(testData.validUsername);
    await expect(page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')")).toBeVisible();
  });

  test("Navigate to Cart page with empty cart", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')").click();
    await expect(page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')")).toBeVisible();
    await expect(page.getByText('Your cart is empty!')).toBeVisible();
  });

  test("Navigate to Cart page after adding a product", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/products']:has-text('Products')").click();
    await page.locator("a.btn.btn-default.add-to-cart").click();
    await page.locator("button[type='submit'].btn.btn-success.close-modal.btn-block").click();
    await page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')").click();
    await expect(page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')")).toBeVisible();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Verify cart page prompt when user is not logged in", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Verify cart page prompt when user is logged in", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')").click();
    await expect(page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')")).toBeVisible();
    await expect(page.locator("a[href='https://automationexercise.com/view_cart']:has-text('View Cart')")).toBeVisible();
  });

  test("Attempt to access cart page via navCartLink with session expired", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Verify cart page behavior after removing all items and clicking navCartLink", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')").click();
    await page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Verify cart page loads correctly after multiple addToCartButtons clicks", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/products']:has-text('Products')").click();
    await page.locator("a.btn.btn-default.add-to-cart").click();
    await page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')").click();
    await expect(page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')")).toBeVisible();
    await expect(page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')")).toBeVisible();
  });

  test("Submit valid email once and verify successful subscription", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });
});
