import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export default class LoginPage {
    private readonly page: Page;

    private readonly usernameField: Locator;
    private readonly passwordField: Locator;
    private readonly loginButton: Locator;
    private readonly forgotLoginLink: Locator;
    private readonly registerLink: Locator;

    private readonly errorMessage = 'The username and password could not be verified.';
    private readonly customerLoginTitle = 'Customer Login';

    constructor(page: Page) {
        this.page = page;

        this.usernameField    = page.locator("input[name='username']").first();
        this.passwordField    = page.locator("input[name='password']").first();
        this.loginButton      = page.locator("input[type='submit'].button").first();
        this.forgotLoginLink  = page.locator("a:has-text('Forgot login info?')").first();
        this.registerLink     = page.locator("a:has-text('Register')").first();
    }

    async successfulLoginWithValidCredentials(): Promise<void> {
        await this.usernameField.fill('john');
        await this.passwordField.fill('demo');
        await this.loginButton.click();
        await expect(this.page).toHaveURL(/overview/);
        console.info('Verified successful login with valid credentials.');
    }

    async loginAttemptWithInvalidUsername(): Promise<void> {
        await this.usernameField.fill('invalid_user_xyz');
        await this.passwordField.fill('demo');
        await this.loginButton.click();
        await expect(this.page.getByText(this.errorMessage)).toBeVisible();
        console.info('Verified login attempt with invalid username shows error.');
    }

    async loginAttemptWithInvalidPassword(): Promise<void> {
        await this.usernameField.fill('john');
        await this.passwordField.fill('wrongpassword');
        await this.loginButton.click();
        await expect(this.page.getByText(this.errorMessage)).toBeVisible();
        console.info('Verified login attempt with invalid password shows error.');
    }

    async loginAttemptWithBothFieldsEmpty(): Promise<void> {
        await this.usernameField.fill('');
        await this.passwordField.fill('');
        await this.loginButton.click();
        await expect(this.page.getByText(this.errorMessage)).toBeVisible();
        console.info('Verified login attempt with both fields empty shows error.');
    }

    async loginAttemptWithEmptyUsernameField(): Promise<void> {
        await this.usernameField.fill('');
        await this.passwordField.fill('demo');
        await this.loginButton.click();
        await expect(this.page.getByText(this.errorMessage)).toBeVisible();
        console.info('Verified login attempt with empty username field shows error.');
    }

    async loginAttemptWithEmptyPasswordField(): Promise<void> {
        await this.usernameField.fill('john');
        await this.passwordField.fill('');
        await this.loginButton.click();
        await expect(this.page.getByText(this.errorMessage)).toBeVisible();
        console.info('Verified login attempt with empty password field shows error.');
    }

    async loginAttemptWithSqlInjectionInUsernameField(): Promise<void> {
        await this.usernameField.fill("' OR '1'='1");
        await this.passwordField.fill('anypassword');
        await this.loginButton.click();
        await expect(this.page.getByText(this.errorMessage)).toBeVisible();
        console.info('Verified SQL injection in username field is rejected.');
    }

    async loginAttemptWithMaximumLengthUsernameAndPassword(): Promise<void> {
        const maxLength = 'a'.repeat(255);
        await this.usernameField.fill(maxLength);
        await this.passwordField.fill(maxLength);
        await this.loginButton.click();
        await expect(this.page.getByText(this.errorMessage)).toBeVisible();
        console.info('Verified login attempt with maximum length credentials shows error.');
    }
}
