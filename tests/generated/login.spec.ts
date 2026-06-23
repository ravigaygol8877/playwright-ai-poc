
import { test, expect } from '@playwright/test';


test('Login with valid username and password', async ({ page }) => {

  const testData = {
  "validUsername": "user123",
  "validPassword": "Passw0rd!",
  "invalidUsername": "user!@#",
  "invalidPassword": "123"
};


await page.goto(
  'https://example.com/login'
);


await page.fill(
  '#username',
  testData.validUsername
);


await page.fill(
  '#password',
  testData.validPassword
);


await page.click(
  '#login'
);


  await expect(page).toHaveURL(/dashboard/);

});


test('Login with invalid username and valid password', async ({ page }) => {

  const testData = {
  "validUsername": "user123",
  "validPassword": "Passw0rd!",
  "invalidUsername": "user!@#",
  "invalidPassword": "123"
};


await page.goto(
  'https://example.com/login'
);


await page.fill(
  '#username',
  testData.invalidUsername
);


await page.fill(
  '#password',
  testData.validPassword
);


await page.click(
  '#login'
);


  await expect(page.locator('text=Invalid username or password')).toBeVisible();

});


test('Login with valid username and invalid password', async ({ page }) => {

  const testData = {
  "validUsername": "user123",
  "validPassword": "Passw0rd!",
  "invalidUsername": "user!@#",
  "invalidPassword": "123"
};


await page.goto(
  'https://example.com/login'
);


await page.fill(
  '#username',
  testData.validUsername
);


await page.fill(
  '#password',
  testData.invalidPassword
);


await page.click(
  '#login'
);


  await expect(page.locator('text=Invalid username or password')).toBeVisible();

});


test('Login with empty username and password fields', async ({ page }) => {

  const testData = {
  "validUsername": "user123",
  "validPassword": "Passw0rd!",
  "invalidUsername": "user!@#",
  "invalidPassword": "123"
};


await page.goto(
  'https://example.com/login'
);


await page.fill(
  '#username',
  ''
);


await page.fill(
  '#password',
  ''
);


await page.click(
  '#login'
);


  await expect(page.locator('text=Username is required')).toBeVisible(), await expect(page.locator('text=Password is required')).toBeVisible();

});


test('Login with username exceeding maximum allowed length', async ({ page }) => {

  const testData = {
  "validUsername": "user123",
  "validPassword": "Passw0rd!",
  "invalidUsername": "user!@#",
  "invalidPassword": "123"
};


await page.goto(
  'https://example.com/login'
);


await page.fill(
  '#username',
  testData.invalidUsername
);


await page.fill(
  '#password',
  testData.validPassword
);


await page.click(
  '#login'
);


  await expect(page.locator('text=Username exceeds maximum length')).toBeVisible();

});


test('Login with password containing special characters', async ({ page }) => {

  const testData = {
  "validUsername": "user123",
  "validPassword": "Passw0rd!",
  "invalidUsername": "user!@#",
  "invalidPassword": "123"
};


await page.goto(
  'https://example.com/login'
);


await page.fill(
  '#username',
  testData.validUsername
);


await page.fill(
  '#password',
  testData.validPassword
);


await page.click(
  '#login'
);


  await expect(page).toHaveURL(/dashboard/);

});


test('Login with SQL injection attempt in username field', async ({ page }) => {

  const testData = {
  "validUsername": "user123",
  "validPassword": "Passw0rd!",
  "invalidUsername": "user!@#",
  "invalidPassword": "123"
};


await page.goto(
  'https://example.com/login'
);


await page.fill(
  '#username',
  testData.invalidUsername
);


await page.fill(
  '#password',
  testData.validPassword
);


await page.click(
  '#login'
);


  await expect(page.locator('text=Invalid username or password')).toBeVisible();

});


test('Login with case sensitivity check for username', async ({ page }) => {

  const testData = {
  "validUsername": "user123",
  "validPassword": "Passw0rd!",
  "invalidUsername": "user!@#",
  "invalidPassword": "123"
};


await page.goto(
  'https://example.com/login'
);


await page.fill(
  '#username',
  testData.validUsername
);


await page.fill(
  '#password',
  testData.validPassword
);


await page.click(
  '#login'
);


  await expect(page.locator('text=Invalid username or password')).toBeVisible();

});

