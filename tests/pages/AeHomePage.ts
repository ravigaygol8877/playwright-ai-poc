import { expect, type Locator, type Page } from '@playwright/test';

export default class AeHomePage {
    private readonly page: Page;

    // ── Nav locators ───────────────────────────────────────────────────────────
    private readonly navHomeLink: Locator;
    private readonly navProductsLink: Locator;
    private readonly navCartLink: Locator;
    private readonly navSignupLoginLink: Locator;
    private readonly navTestCasesLink: Locator;
    private readonly navApiTestingLink: Locator;
    private readonly navVideoTutorialsLink: Locator;
    private readonly navContactUsLink: Locator;

    // ── Category locators ──────────────────────────────────────────────────────
    private readonly categoryWomenLink: Locator;
    private readonly categoryMenLink: Locator;
    private readonly categoryKidsLink: Locator;
    private readonly categoryDressWomenLink: Locator;
    private readonly categoryTopsWomenLink: Locator;
    private readonly categorySareeWomenLink: Locator;
    private readonly categoryTshirtsMenLink: Locator;
    private readonly categoryJeansMenLink: Locator;
    private readonly categoryDressKidsLink: Locator;
    private readonly categoryTopsShirtsKidsLink: Locator;

    // ── Brand locators ─────────────────────────────────────────────────────────
    private readonly brandPoloLink: Locator;
    private readonly brandHM: Locator;
    private readonly brandMadame: Locator;
    private readonly brandMastHarbour: Locator;
    private readonly brandBabyhug: Locator;
    private readonly brandAllenSollyJunior: Locator;
    private readonly brandKookieKids: Locator;
    private readonly brandBiba: Locator;

    // ── Product & cart locators ────────────────────────────────────────────────
    private readonly addToCartButtons: Locator;
    private readonly viewProductLinks: Locator;
    private readonly continueShoppingButton: Locator;
    private readonly viewCartLink: Locator;
    private readonly testCasesButton: Locator;
    private readonly apisListButton: Locator;

    // ── Newsletter locators ────────────────────────────────────────────────────
    private readonly newsletterEmailInput: Locator;
    private readonly newsletterSubscribeButton: Locator;

    // ── Expected strings ──────────────────────────────────────────────────────
    private readonly addToCartSuccessText  = 'Your product has been added to cart.';
    private readonly subscribeSuccessText  = 'You have been successfully subscribed!';
    private readonly cartEmptyText         = 'Your cart is empty!';
    private readonly signupLoginText       = 'Signup / Login';

    constructor(page: Page) {
        this.page = page;

        this.navHomeLink           = page.locator("a[href='https://automationexercise.com/']:has-text('Home')");
        this.navProductsLink       = page.locator("a[href='https://automationexercise.com/products']:has-text('Products')");
        this.navCartLink           = page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')");
        this.navSignupLoginLink    = page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')");
        this.navTestCasesLink      = page.locator("a.test_cases_list[href='https://automationexercise.com/test_cases']");
        this.navApiTestingLink     = page.locator("a.apis_list[href='https://automationexercise.com/api_list']");
        this.navVideoTutorialsLink = page.locator("a[href='https://www.youtube.com/c/AutomationExercise']:has-text('Video Tutorials')");
        this.navContactUsLink      = page.locator("a[href='https://automationexercise.com/contact_us']:has-text('Contact us')");

        this.categoryWomenLink          = page.locator("a[href='https://automationexercise.com/#Women']:has-text('WOMEN')");
        this.categoryMenLink            = page.locator("a[href='https://automationexercise.com/#Men']:has-text('MEN')");
        this.categoryKidsLink           = page.locator("a[href='https://automationexercise.com/#Kids']:has-text('KIDS')");
        this.categoryDressWomenLink     = page.locator("a[href='https://automationexercise.com/category_products/1']:has-text('Dress')");
        this.categoryTopsWomenLink      = page.locator("a[href='https://automationexercise.com/category_products/2']:has-text('Tops')");
        this.categorySareeWomenLink     = page.locator("a[href='https://automationexercise.com/category_products/7']:has-text('Saree')");
        this.categoryTshirtsMenLink     = page.locator("a[href='https://automationexercise.com/category_products/3']:has-text('Tshirts')");
        this.categoryJeansMenLink       = page.locator("a[href='https://automationexercise.com/category_products/6']:has-text('Jeans')");
        this.categoryDressKidsLink      = page.locator("a[href='https://automationexercise.com/category_products/4']:has-text('Dress')");
        this.categoryTopsShirtsKidsLink = page.locator("a[href='https://automationexercise.com/category_products/5']:has-text('Tops & Shirts')");

        this.brandPoloLink         = page.locator("a[href='https://automationexercise.com/brand_products/Polo']:has-text('POLO')");
        this.brandHM               = page.locator("a[href='https://automationexercise.com/brand_products/H&M']:has-text('H&M')");
        this.brandMadame           = page.locator("a[href='https://automationexercise.com/brand_products/Madame']:has-text('MADAME')");
        this.brandMastHarbour      = page.locator("a[href='https://automationexercise.com/brand_products/Mast%20&%20Harbour']:has-text('MAST & HARBOUR')");
        this.brandBabyhug          = page.locator("a[href='https://automationexercise.com/brand_products/Babyhug']:has-text('BABYHUG')");
        this.brandAllenSollyJunior = page.locator("a[href='https://automationexercise.com/brand_products/Allen%20Solly%20Junior']:has-text('ALLEN SOLLY JUNIOR')");
        this.brandKookieKids       = page.locator("a[href='https://automationexercise.com/brand_products/Kookie%20Kids']:has-text('KOOKIE KIDS')");
        this.brandBiba             = page.locator("a[href='https://automationexercise.com/brand_products/Biba']:has-text('BIBA')");

        this.addToCartButtons       = page.locator("a.btn.btn-default.add-to-cart");
        this.viewProductLinks       = page.locator("a[href^='https://automationexercise.com/product_details/']");
        this.continueShoppingButton = page.locator("button[type='submit'].btn.btn-success.close-modal.btn-block");
        this.viewCartLink           = page.locator("a[href='https://automationexercise.com/view_cart']:has-text('View Cart')");
        this.testCasesButton        = page.locator("button.btn.btn-success:has-text('Test Cases')");
        this.apisListButton         = page.locator("button.btn.btn-success:has-text('APIs list for practice')");

        this.newsletterEmailInput     = page.locator("input[type='email']#susbscribe_email");
        this.newsletterSubscribeButton = page.locator("button#subscribe");
    }

    // ── Actions — navigation ────────────────────────────────────────────────────

    async clickHome(): Promise<void> {
        await this.navHomeLink.click();
        await this.page.waitForLoadState('networkidle');
        console.info('Clicked Home nav link.');
    }

    async navigateToProducts(): Promise<void> {
        await this.navProductsLink.click();
        await this.page.waitForURL('**/products');
        console.info('Navigated to Products page.');
    }

    async navigateToCart(): Promise<void> {
        await this.navCartLink.click();
        await this.page.waitForURL('**/view_cart');
        console.info('Navigated to Cart page.');
    }

    async navigateToLogin(): Promise<void> {
        await this.navSignupLoginLink.click();
        await this.page.waitForURL('**/login');
        console.info('Navigated to Signup/Login page.');
    }

    async navigateToTestCases(): Promise<void> {
        await this.navTestCasesLink.click();
        await this.page.waitForURL('**/test_cases');
        console.info('Navigated to Test Cases page.');
    }

    async navigateToApiTesting(): Promise<void> {
        await this.navApiTestingLink.click();
        await this.page.waitForLoadState('networkidle');
        console.info('Navigated to API Testing page.');
    }

    async navigateToVideoTutorials(): Promise<void> {
        await this.navVideoTutorialsLink.click();
        console.info('Clicked Video Tutorials nav link.');
    }

    async navigateToContactUs(): Promise<void> {
        await this.navContactUsLink.click();
        await this.page.waitForURL('**/contact_us');
        console.info('Navigated to Contact Us page.');
    }

    // ── Actions — categories ────────────────────────────────────────────────────

    async expandWomenCategory(): Promise<void> {
        await this.categoryWomenLink.click();
        console.info('Expanded Women category accordion.');
    }

    async expandMenCategory(): Promise<void> {
        await this.categoryMenLink.click();
        console.info('Expanded Men category accordion.');
    }

    async expandKidsCategory(): Promise<void> {
        await this.categoryKidsLink.click();
        console.info('Expanded Kids category accordion.');
    }

    async clickCategoryDressWomen(): Promise<void> {
        await this.categoryDressWomenLink.waitFor({ state: 'visible' });
        await this.categoryDressWomenLink.click();
        console.info('Clicked Women > Dress subcategory.');
    }

    async clickCategoryTopsWomen(): Promise<void> {
        await this.categoryTopsWomenLink.waitFor({ state: 'visible' });
        await this.categoryTopsWomenLink.click();
        console.info('Clicked Women > Tops subcategory.');
    }

    async clickCategoryTshirtsMen(): Promise<void> {
        await this.categoryTshirtsMenLink.waitFor({ state: 'visible' });
        await this.categoryTshirtsMenLink.click();
        console.info('Clicked Men > Tshirts subcategory.');
    }

    async clickCategoryJeansMen(): Promise<void> {
        await this.categoryJeansMenLink.waitFor({ state: 'visible' });
        await this.categoryJeansMenLink.click();
        console.info('Clicked Men > Jeans subcategory.');
    }

    async clickCategoryDressKids(): Promise<void> {
        await this.categoryDressKidsLink.waitFor({ state: 'visible' });
        await this.categoryDressKidsLink.click();
        console.info('Clicked Kids > Dress subcategory.');
    }

    async clickCategoryTopsShirtsKids(): Promise<void> {
        await this.categoryTopsShirtsKidsLink.waitFor({ state: 'visible' });
        await this.categoryTopsShirtsKidsLink.click();
        console.info('Clicked Kids > Tops & Shirts subcategory.');
    }

    // ── Actions — brands ────────────────────────────────────────────────────────

    async navigateToBrandPolo(): Promise<void> {
        await this.brandPoloLink.click();
        console.info('Navigated to POLO brand page.');
    }

    async navigateToBrandHM(): Promise<void> {
        await this.brandHM.click();
        console.info('Navigated to H&M brand page.');
    }

    async navigateToBrandMadame(): Promise<void> {
        await this.brandMadame.click();
        console.info('Navigated to MADAME brand page.');
    }

    async navigateToBrandMastHarbour(): Promise<void> {
        await this.brandMastHarbour.click();
        console.info('Navigated to MAST & HARBOUR brand page.');
    }

    async navigateToBrandBabyhug(): Promise<void> {
        await this.brandBabyhug.click();
        console.info('Navigated to BABYHUG brand page.');
    }

    async navigateToBrandAllenSollyJunior(): Promise<void> {
        await this.brandAllenSollyJunior.click();
        console.info('Navigated to ALLEN SOLLY JUNIOR brand page.');
    }

    async navigateToBrandKookieKids(): Promise<void> {
        await this.brandKookieKids.click();
        console.info('Navigated to KOOKIE KIDS brand page.');
    }

    async navigateToBrandBiba(): Promise<void> {
        await this.brandBiba.click();
        console.info('Navigated to BIBA brand page.');
    }

    // ── Actions — cart ──────────────────────────────────────────────────────────

    async clickAddToCart(): Promise<void> {
        await this.addToCartButtons.first().click();
        console.info('Clicked Add to Cart button.');
    }

    async clickContinueShopping(): Promise<void> {
        await this.continueShoppingButton.waitFor({ state: 'visible' });
        await this.continueShoppingButton.click();
        console.info('Clicked Continue Shopping.');
    }

    async clickViewCart(): Promise<void> {
        await this.viewCartLink.waitFor({ state: 'visible' });
        await this.viewCartLink.click();
        await this.page.waitForURL('**/view_cart');
        console.info('Clicked View Cart.');
    }

    async clickFirstProductViewDetails(): Promise<void> {
        await this.viewProductLinks.first().click();
        await this.page.waitForURL('**/product_details/**');
        console.info('Clicked first View Product link.');
    }

    async clickTestCasesButton(): Promise<void> {
        await this.testCasesButton.click();
        console.info('Clicked Test Cases button.');
    }

    async clickApisListButton(): Promise<void> {
        await this.apisListButton.click();
        console.info('Clicked APIs List button.');
    }

    async navigateToApiList(): Promise<void> {
        await this.apisListButton.click();
        await this.page.waitForURL('**/api_list');
        console.info('Navigated to API List page.');
    }

    async viewCart(): Promise<void> {
        await this.viewCartLink.waitFor({ state: 'visible' });
        await this.viewCartLink.click();
        await this.page.waitForURL('**/view_cart');
        console.info('Clicked View Cart link and navigated to cart.');
    }

    // ── Actions — newsletter ────────────────────────────────────────────────────

    async fillNewsletterEmail(email: string): Promise<void> {
        await this.newsletterEmailInput.scrollIntoViewIfNeeded();
        await this.newsletterEmailInput.fill(email);
        console.info(`Filled newsletter email: ${email}`);
    }

    async clickNewsletterSubscribe(): Promise<void> {
        await this.newsletterSubscribeButton.click();
        console.info('Clicked newsletter Subscribe button.');
    }

    async subscribeToNewsletter(email: string): Promise<void> {
        await this.fillNewsletterEmail(email);
        await this.clickNewsletterSubscribe();
        await expect(this.page.getByText(this.subscribeSuccessText)).toBeVisible({ timeout: 5000 });
        console.info('Newsletter subscription verified successfully.');
    }

    // ── Assertions — page state ─────────────────────────────────────────────────

    async verifyPageLoaded(): Promise<void> {
        await expect(this.page).toHaveURL('https://automationexercise.com/');
        await expect(this.navHomeLink).toBeVisible();
        console.info('Home page loaded and verified.');
    }

    async verifyNavLinksVisible(): Promise<void> {
        const links = [
            this.navHomeLink,
            this.navProductsLink,
            this.navCartLink,
            this.navSignupLoginLink,
            this.navTestCasesLink,
        ];
        for (const link of links) {
            await expect(link).toBeVisible();
        }
        console.info('All primary nav links are visible.');
    }

    async verifyProductsPageUrl(): Promise<void> {
        await expect(this.page).toHaveURL('https://automationexercise.com/products');
        console.info('Verified URL is /products.');
    }

    async verifyLoginPageUrl(): Promise<void> {
        await expect(this.page).toHaveURL(/login/);
        console.info('Verified URL contains /login.');
    }

    async verifyProductDetailsPageUrl(): Promise<void> {
        await expect(this.page).toHaveURL(/product_details/);
        console.info('Verified URL is a product details page.');
    }

    async verifyBrandProductsPageUrl(): Promise<void> {
        await expect(this.page).toHaveURL(/\/brand_products\/.+/);
        console.info('Verified URL is a brand products page.');
    }

    async verifyCartPageUrl(): Promise<void> {
        await expect(this.page).toHaveURL(/view_cart/);
        console.info('Verified URL is /view_cart.');
    }

    // ── Assertions — nav links ──────────────────────────────────────────────────

    async verifyProductsNavLinkVisible(): Promise<void> {
        await expect(this.navProductsLink).toBeVisible();
        console.info('Products nav link is visible.');
    }

    async verifyProductsNavLinkText(): Promise<void> {
        await expect(this.navProductsLink).toHaveText('Products');
        console.info('Products nav link has correct text.');
    }

    async verifyProductsNavLinkDisabled(): Promise<void> {
        await expect(this.navProductsLink).toBeDisabled();
        console.info('Products nav link is disabled.');
    }

    async verifyProductsNavLinkFocused(): Promise<void> {
        await expect(this.navProductsLink).toBeFocused();
        console.info('Products nav link is focused.');
    }

    async verifySignupLoginNavLinkVisible(): Promise<void> {
        await expect(this.navSignupLoginLink).toBeVisible();
        console.info('Signup/Login nav link is visible.');
    }

    async verifySignupLoginTextVisible(): Promise<void> {
        await expect(this.page.getByText(this.signupLoginText)).toBeVisible();
        console.info('Signup / Login text is visible.');
    }

    async verifyCartNavLinkVisible(): Promise<void> {
        await expect(this.navCartLink).toBeVisible();
        console.info('Cart nav link is visible.');
    }

    async verifyViewCartLinkVisible(): Promise<void> {
        await expect(this.viewCartLink).toBeVisible();
        console.info('View Cart link is visible.');
    }

    // ── Assertions — categories ─────────────────────────────────────────────────

    async verifyCategoryLinksVisible(): Promise<void> {
        const categories = [this.categoryWomenLink, this.categoryMenLink, this.categoryKidsLink];
        for (const cat of categories) {
            await expect(cat).toBeVisible();
        }
        console.info('Top-level category links are visible.');
    }

    async verifyCategoryWomenVisible(): Promise<void> {
        await expect(this.categoryWomenLink).toBeVisible();
        console.info('Women category link is visible.');
    }

    async verifyCategoryDressWomenVisible(): Promise<void> {
        await expect(this.categoryDressWomenLink).toBeVisible();
        console.info('Women > Dress subcategory link is visible.');
    }

    async verifyCategoryTshirtsMenText(): Promise<void> {
        await expect(this.categoryTshirtsMenLink).toHaveText('Tshirts');
        console.info('Men > Tshirts subcategory has correct text.');
    }

    async verifyCategoryKidsText(): Promise<void> {
        await expect(this.categoryKidsLink).toHaveText('KIDS');
        console.info('Kids category link has correct text.');
    }

    async verifyCategoryTopsShirtsKidsText(): Promise<void> {
        await expect(this.categoryTopsShirtsKidsLink).toHaveText('Tops & Shirts');
        console.info('Kids > Tops & Shirts subcategory has correct text.');
    }

    async verifyCategoryJeansMenText(): Promise<void> {
        await expect(this.categoryJeansMenLink).toHaveText('Jeans');
        console.info('Men > Jeans subcategory has correct text.');
    }

    async verifyCategoryDressKidsVisible(): Promise<void> {
        await expect(this.categoryDressKidsLink).toBeVisible();
        console.info('Kids > Dress subcategory link is visible.');
    }

    async verifyCategoryWomenFocused(): Promise<void> {
        await expect(this.categoryWomenLink).toBeFocused();
        console.info('Women category link is focused.');
    }

    // ── Assertions — cart ───────────────────────────────────────────────────────

    async verifyAddToCartSuccess(): Promise<void> {
        await expect(this.page.getByText(this.addToCartSuccessText)).toBeVisible({ timeout: 5000 });
        console.info('Add-to-cart success message verified.');
    }

    async verifyCartEmpty(): Promise<void> {
        await expect(this.page.getByText(this.cartEmptyText)).toBeVisible({ timeout: 5000 });
        console.info('Cart is empty message verified.');
    }

    async verifyAddToCartButtonExists(): Promise<void> {
        await expect(this.addToCartButtons.first()).toBeVisible();
        console.info('Add-to-cart button is present.');
    }

    async verifyContinueShoppingButtonHidden(): Promise<void> {
        await expect(this.continueShoppingButton).toBeHidden();
        console.info('Continue Shopping button is hidden (modal not open).');
    }

    // ── Assertions — products ───────────────────────────────────────────────────

    async verifyProductDetailsLinkVisible(): Promise<void> {
        await expect(this.viewProductLinks.first()).toBeVisible();
        console.info('Product details link is visible.');
    }

    // ── Assertions — brand ──────────────────────────────────────────────────────

    async verifyBrandLinkFocused(): Promise<void> {
        await expect(this.brandPoloLink.or(this.brandHM).or(this.brandMadame).or(this.brandBiba)).toBeFocused();
        console.info('A brand link is focused.');
    }

    // ── Assertions — buttons ────────────────────────────────────────────────────

    async verifyTestCasesButtonVisible(): Promise<void> {
        await expect(this.testCasesButton).toBeVisible();
        console.info('Test Cases button is visible.');
    }

    async verifyApisListButtonVisible(): Promise<void> {
        await expect(this.apisListButton).toBeVisible();
        console.info('APIs List button is visible.');
    }

    // ── Assertions — newsletter ─────────────────────────────────────────────────

    async verifyNewsletterSectionVisible(): Promise<void> {
        await this.newsletterEmailInput.scrollIntoViewIfNeeded();
        await expect(this.newsletterEmailInput).toBeVisible();
        await expect(this.newsletterSubscribeButton).toBeVisible();
        console.info('Newsletter subscription section is visible.');
    }

    // ── Assertions — security ───────────────────────────────────────────────────

    async verifyNoScriptInjection(): Promise<void> {
        await expect(this.page).not.toHaveURL(/alert|<script|javascript:/i);
        console.info('No script injection markers in URL.');
    }

    // ── Assertions — validation ─────────────────────────────────────────────────

    async verifyValidationError(message: string): Promise<void> {
        await expect(this.page.getByText(message)).toBeVisible({ timeout: 5000 });
        console.info(`Validation error visible: ${message}`);
    }
}
