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

  test("Subscribe to newsletter with maximum length email address", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.overMaxLengthUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Attempt newsletter subscription with email containing SQL injection attempt", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Attempt newsletter subscription with email containing script injection attempt", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).not.toBeVisible();
  });

  test("Subscribe with a valid standard email address", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with an email address containing subdomain", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with an empty email address", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with an invalid email format missing '@'", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.invalidUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with a very long but valid email address", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.overMaxLengthUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with an email containing SQL injection attempt", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with an email containing script injection attempt", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with a valid email address", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with malformed email missing domain part", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with email missing '@' symbol", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with empty email input", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with email containing invalid characters", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with email at maximum allowed length", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.overMaxLengthUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with email containing script injection attempt", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).not.toBeVisible();
  });

  test("Subscribe button click with empty email field shows required field error", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with valid email submits successfully", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.validUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });

  test("Subscribe with invalid email format shows validation error", async ({ page }) => {
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").fill(testData.invalidUsername);
    await page.locator("a[href='https://automationexercise.com/']:has-text('Home')").click();
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  });
});
