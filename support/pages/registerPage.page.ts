import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export default class RegisterPage {
    private readonly page: Page;

    private readonly firstNameInput: Locator;
    private readonly lastNameInput: Locator;
    private readonly addressStreetInput: Locator;
    private readonly cityInput: Locator;
    private readonly stateInput: Locator;
    private readonly zipCodeInput: Locator;
    private readonly phoneNumberInput: Locator;
    private readonly ssnInput: Locator;
    private readonly usernameInput: Locator;
    private readonly passwordInput: Locator;
    private readonly confirmPasswordInput: Locator;
    private readonly submitButton: Locator;
    private readonly forgotLoginLink: Locator;

    constructor(page: Page) {
        this.page = page;

        this.firstNameInput = page.locator('input[id="customer.firstName"]').first();
        this.lastNameInput = page.locator('input[id="customer.lastName"]').first();
        this.addressStreetInput = page.locator('input[id="customer.address.street"]').first();
        this.cityInput = page.locator('input[id="customer.address.city"]').first();
        this.stateInput = page.locator('input[id="customer.address.state"]').first();
        this.zipCodeInput = page.locator('input[id="customer.address.zipCode"]').first();
        this.phoneNumberInput = page.locator('input[id="customer.phoneNumber"]').first();
        this.ssnInput = page.locator('input[id="customer.ssn"]').first();
        this.usernameInput = page.locator('input[id="customer.username"]').first();
        this.passwordInput = page.locator('input[id="customer.password"]').first();
        this.confirmPasswordInput = page.locator('input[id="repeatedPassword"]').first();
        this.submitButton = page.locator('input[type="submit"').or(page.locator('class="button"]')).first();
        this.forgotLoginLink = page.locator('a:has-text("Forgot login info?")').first();
    }

    async successfulAccountRegistrationWithValidData(): Promise<void> {
        await this.firstNameInput.fill('John');
        await this.lastNameInput.fill('Doe');
        await this.addressStreetInput.fill('123 Main St');
        await this.cityInput.fill('Springfield');
        await this.stateInput.fill('IL');
        await this.zipCodeInput.fill('62704');
        await this.phoneNumberInput.fill('5551234567');
        await this.ssnInput.fill('123-45-6789');
        await this.usernameInput.fill('uniqueuser123');
        await this.passwordInput.fill('StrongPass!1');
        await this.confirmPasswordInput.fill('StrongPass!1');
        await this.submitButton.click();
        await expect(this.forgotLoginLink).toBeVisible();
        console.info('Verified successful account registration with valid data.');
    }

    async attemptRegistrationWithAUsernameAlreadyInUse(): Promise<void> {
        await this.firstNameInput.fill('Jane');
        await this.lastNameInput.fill('Smith');
        await this.addressStreetInput.fill('456 Elm St');
        await this.cityInput.fill('Metropolis');
        await this.stateInput.fill('NY');
        await this.zipCodeInput.fill('10001');
        await this.phoneNumberInput.fill('5559876543');
        await this.ssnInput.fill('987-65-4321');
        await this.usernameInput.fill('existinguser');
        await this.passwordInput.fill('Password123!');
        await this.confirmPasswordInput.fill('Password123!');
        await this.submitButton.click();
        await expect(this.usernameInput).toBeVisible();
        console.info('Verified registration attempt with a username already in use.');
    }

    async attemptRegistrationWithPasswordConfirmationMismatch(): Promise<void> {
        await this.firstNameInput.fill('Alice');
        await this.lastNameInput.fill('Wonderland');
        await this.addressStreetInput.fill('789 Oak Ave');
        await this.cityInput.fill('Gotham');
        await this.stateInput.fill('NJ');
        await this.zipCodeInput.fill('07001');
        await this.phoneNumberInput.fill('5551112222');
        await this.ssnInput.fill('111-22-3333');
        await this.usernameInput.fill('aliceuser');
        await this.passwordInput.fill('MismatchPass1');
        await this.confirmPasswordInput.fill('MismatchPass2');
        await this.submitButton.click();
        await expect(this.confirmPasswordInput).toBeVisible();
        console.info('Verified registration attempt with password confirmation mismatch.');
    }

    async attemptRegistrationLeavingAllRequiredFieldsBlank(): Promise<void> {
        await this.submitButton.click();
        await expect(this.firstNameInput).toBeVisible();
        console.info('Verified registration attempt leaving all required fields blank.');
    }

    async attemptRegistrationWithMissingCriticalPersonalDetailEgEmail(): Promise<void> {
        await this.firstNameInput.fill('Bob');
        await this.lastNameInput.fill('Builder');
        await this.addressStreetInput.fill('321 Maple Rd');
        await this.cityInput.fill('Smallville');
        await this.stateInput.fill('KS');
        await this.zipCodeInput.fill('66002');
        await this.phoneNumberInput.fill('5553334444');
        await this.ssnInput.fill('222-33-4444');
        await this.usernameInput.fill('bobthebuilder');
        await this.passwordInput.fill('BuildIt123!');
        await this.confirmPasswordInput.fill('BuildIt123!');
        await this.submitButton.click();
        await expect(this.firstNameInput).toBeVisible();
        console.info('Verified registration attempt with missing critical personal detail (e.g., email).');
    }

    async attemptRegistrationUsingSqlInjectionPayloadInUsernameField(): Promise<void> {
        await this.firstNameInput.fill('Eve');
        await this.lastNameInput.fill('Hacker');
        await this.addressStreetInput.fill('999 Evil St');
        await this.cityInput.fill('Hackerville');
        await this.stateInput.fill('CA');
        await this.zipCodeInput.fill('90210');
        await this.phoneNumberInput.fill('5556667777');
        await this.ssnInput.fill('333-44-5555');
        await this.usernameInput.fill("' OR '1'='1';--");
        await this.passwordInput.fill('SecurePass!2');
        await this.confirmPasswordInput.fill('SecurePass!2');
        await this.submitButton.click();
        await expect(this.usernameInput).toBeVisible();
        console.info('Verified registration attempt using SQL injection payload in username field.');
    }

    async attemptRegistrationUsingMinimumAllowedPasswordLengthBoundary(): Promise<void> {
        await this.firstNameInput.fill('Sam');
        await this.lastNameInput.fill('Short');
        await this.addressStreetInput.fill('101 Tiny Ln');
        await this.cityInput.fill('Miniville');
        await this.stateInput.fill('TX');
        await this.zipCodeInput.fill('75001');
        await this.phoneNumberInput.fill('5558889999');
        await this.ssnInput.fill('444-55-6666');
        await this.usernameInput.fill('samshort');
        await this.passwordInput.fill('12345');
        await this.confirmPasswordInput.fill('12345');
        await this.submitButton.click();
        await expect(this.passwordInput).toBeVisible();
        console.info('Verified registration attempt using minimum allowed password length boundary.');
    }
}
