import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class AeLoginPage extends BasePage {
  // Selectors (auto-generated from KB — validate each in Chrome DevTools)
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginSubmitButton: Locator;
  readonly signupNameInput: Locator;
  readonly signupEmailInput: Locator;
  readonly signupSubmitButton: Locator;
  readonly subscribeEmailInput: Locator;
  readonly subscribeSubmitButton: Locator;

  // Validation messages
  readonly subscriptionSuccessMessage: Locator;

  // Assertion helpers
  readonly assertions: {
    loginEmailInputVisible:   () => Promise<void>;
    loginEmailInputEnabled:   () => Promise<void>;
    loginPasswordInputVisible:   () => Promise<void>;
    loginPasswordInputEnabled:   () => Promise<void>;
    loginSubmitButtonVisible:   () => Promise<void>;
    signupNameInputVisible:   () => Promise<void>;
    signupNameInputEnabled:   () => Promise<void>;
    signupEmailInputVisible:   () => Promise<void>;
    signupEmailInputEnabled:   () => Promise<void>;
    signupSubmitButtonVisible:   () => Promise<void>;
    subscribeEmailInputVisible:   () => Promise<void>;
    subscribeEmailInputEnabled:   () => Promise<void>;
    subscribeSubmitButtonVisible:   () => Promise<void>;
    subscriptionSuccessMessageVisible:   () => Promise<void>;
    urlMatches:        (pattern: RegExp | string) => Promise<void>;
  };

  constructor(page: Page) {
    super(page);

    this.loginEmailInput = page.locator("input[type='email'][name='email']").first();
    this.loginPasswordInput = page.locator("input[type='password'][name='password']").first();
    this.loginSubmitButton = page.locator("button[type='submit']:contains('Login')").first();
    this.signupNameInput = page.locator("input[type='text'][name='name']").first();
    this.signupEmailInput = page.locator("input[type='email'][name='email']").first();
    this.signupSubmitButton = page.locator("button[type='submit']:contains('Signup')").first();
    this.subscribeEmailInput = page.locator("#susbscribe_email").first();
    this.subscribeSubmitButton = page.locator("#subscribe").first();

    this.subscriptionSuccessMessage = page.getByText('You have been successfully subscribed!');

    this.assertions = {
      loginEmailInputVisible:   () => expect(this.loginEmailInput).toBeVisible(),
      loginEmailInputEnabled:   () => expect(this.loginEmailInput).toBeEnabled(),
      loginPasswordInputVisible:   () => expect(this.loginPasswordInput).toBeVisible(),
      loginPasswordInputEnabled:   () => expect(this.loginPasswordInput).toBeEnabled(),
      loginSubmitButtonVisible:   () => expect(this.loginSubmitButton).toBeVisible(),
      signupNameInputVisible:   () => expect(this.signupNameInput).toBeVisible(),
      signupNameInputEnabled:   () => expect(this.signupNameInput).toBeEnabled(),
      signupEmailInputVisible:   () => expect(this.signupEmailInput).toBeVisible(),
      signupEmailInputEnabled:   () => expect(this.signupEmailInput).toBeEnabled(),
      signupSubmitButtonVisible:   () => expect(this.signupSubmitButton).toBeVisible(),
      subscribeEmailInputVisible:   () => expect(this.subscribeEmailInput).toBeVisible(),
      subscribeEmailInputEnabled:   () => expect(this.subscribeEmailInput).toBeEnabled(),
      subscribeSubmitButtonVisible:   () => expect(this.subscribeSubmitButton).toBeVisible(),
      subscriptionSuccessMessageVisible:   () => expect(this.subscriptionSuccessMessage).toBeVisible(),
      urlMatches:        (pattern: RegExp | string) => expect(this.page).toHaveURL(pattern),
    };
  }

  async goto(): Promise<void> {
    await this.navigate('/login');
    await this.waitForPageReady();
  }

  async login(email: string, password: string): Promise<void> {
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
    await this.loginSubmitButton.click();
  }

  async signup(name: string, email: string): Promise<void> {
    await this.signupNameInput.fill(name);
    await this.signupEmailInput.fill(email);
    await this.signupSubmitButton.click();
  }

  async subscribe(email: string): Promise<void> {
    await this.subscribeEmailInput.fill(email);
    await this.subscribeSubmitButton.click();
  }
}
