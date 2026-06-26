import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class AeHomePage extends BasePage {
  readonly navHomeLink: Locator;
  readonly navProductsLink: Locator;
  readonly navCartLink: Locator;
  readonly navLoginLink: Locator;
  readonly navTestCasesLink: Locator;
  readonly productAddToCartButton: Locator;
  readonly productViewProductLink: Locator;
  readonly addToCartSuccessNotification: Locator;

  readonly assertions: {
    navHomeLinkVisible:             () => Promise<void>;
    navProductsLinkVisible:         () => Promise<void>;
    navCartLinkVisible:             () => Promise<void>;
    navLoginLinkVisible:            () => Promise<void>;
    navTestCasesLinkVisible:        () => Promise<void>;
    productAddToCartButtonVisible:  () => Promise<void>;
    productViewProductLinkVisible:  () => Promise<void>;
    addToCartSuccessNotificationVisible: () => Promise<void>;
    urlMatches: (pattern: RegExp | string) => Promise<void>;
  };

  constructor(page: Page) {
    super(page);

    this.navHomeLink               = page.locator('a[href="/"]').first();
    this.navProductsLink           = page.locator('a:has-text("Products")').first();
    this.navCartLink               = page.locator('a:has-text("Cart")').first();
    this.navLoginLink              = page.locator('a:has-text("Signup / Login")').first();
    this.navTestCasesLink          = page.locator('a:has-text("Test Cases")').first();
    this.productAddToCartButton    = page.locator('a.add-to-cart').first();
    this.productViewProductLink    = page.locator('.product_details').first();
    this.addToCartSuccessNotification = page.getByText('Your product has been added to cart.');

    this.assertions = {
      navHomeLinkVisible:             () => expect(this.navHomeLink).toBeVisible(),
      navProductsLinkVisible:         () => expect(this.navProductsLink).toBeVisible(),
      navCartLinkVisible:             () => expect(this.navCartLink).toBeVisible(),
      navLoginLinkVisible:            () => expect(this.navLoginLink).toBeVisible(),
      navTestCasesLinkVisible:        () => expect(this.navTestCasesLink).toBeVisible(),
      productAddToCartButtonVisible:  () => expect(this.productAddToCartButton).toBeVisible(),
      productViewProductLinkVisible:  () => expect(this.productViewProductLink).toBeVisible(),
      addToCartSuccessNotificationVisible: () => expect(this.addToCartSuccessNotification).toBeVisible(),
      urlMatches: (pattern: RegExp | string) => expect(this.page).toHaveURL(pattern),
    };
  }

  async goto(): Promise<void> {
    await this.navigate('/');
    await this.waitForPageReady();
  }

  async navigateToHome(): Promise<void> {
    await this.navHomeLink.click();
  }

  async navigateToProducts(): Promise<void> {
    await this.navProductsLink.click();
  }

  async navigateToCart(): Promise<void> {
    await this.navCartLink.click();
  }

  async navigateToLogin(): Promise<void> {
    await this.navLoginLink.click();
  }

  async viewProductDetails(): Promise<void> {
    await this.productViewProductLink.click();
  }

  async addToCart(): Promise<void> {
    await this.productAddToCartButton.click();
  }
}
