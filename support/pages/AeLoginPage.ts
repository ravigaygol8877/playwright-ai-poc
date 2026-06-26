import { expect, type Locator, type Page } from '@playwright/test';

export default class AeLoginPage {
    private readonly page: Page;

    // ── Login form locators ────────────────────────────────────────────────────
    private readonly loginEmailInput: Locator;
    private readonly loginPasswordInput: Locator;
    private readonly loginButton: Locator;

    // ── Signup form locators ───────────────────────────────────────────────────
    private readonly signupNameInput: Locator;
    private readonly signupEmailInput: Locator;
    private readonly signupButton: Locator;

    // ── Newsletter locators ────────────────────────────────────────────────────
    private readonly subscriptionEmailInput: Locator;
    private readonly subscriptionButton: Locator;

    // ── Nav locators ───────────────────────────────────────────────────────────
    private readonly navHomeLink: Locator;
    private readonly navProductsLink: Locator;
    private readonly navCartLink: Locator;
    private readonly navSignupLoginLink: Locator;
    private readonly navTestCasesLink: Locator;
    private readonly navApiTestingLink: Locator;
    private readonly navVideoTutorialsLink: Locator;
    private readonly navContactUsLink: Locator;

    // ── Expected strings ──────────────────────────────────────────────────────
    private readonly invalidLoginErrorText = 'Your email or password is incorrect!';
    private readonly loginSectionHeading   = 'Login to your account';
    private readonly signupSectionHeading  = 'New User Signup!';
    private readonly subscribeSuccessText  = 'You have been successfully subscribed!';

    constructor(page: Page) {
        this.page = page;

        this.loginEmailInput        = page.locator("input[name='email'][type='email']");
        this.loginPasswordInput     = page.locator("input[name='password'][type='password']");
        this.loginButton            = page.locator("button[type='submit']:has-text('Login')");

        this.signupNameInput        = page.locator("input[name='name'][type='text']");
        this.signupEmailInput       = page.locator("input[name='email'][type='email']:nth-of-type(2)");
        this.signupButton           = page.locator("button[type='submit']:has-text('Signup')");

        this.subscriptionEmailInput = page.locator("input#susbscribe_email");
        this.subscriptionButton     = page.locator("button#subscribe");

        this.navHomeLink            = page.locator("a[href='https://automationexercise.com/']:has-text('Home')");
        this.navProductsLink        = page.locator("a[href='https://automationexercise.com/products']:has-text('Products')");
        this.navCartLink            = page.locator("a[href='https://automationexercise.com/view_cart']:has-text('Cart')");
        this.navSignupLoginLink     = page.locator("a[href='https://automationexercise.com/login']:has-text('Signup / Login')");
        this.navTestCasesLink       = page.locator("a[href='https://automationexercise.com/test_cases']:has-text('Test Cases')");
        this.navApiTestingLink      = page.locator("a[href='https://automationexercise.com/api_list']:has-text('API Testing')");
        this.navVideoTutorialsLink  = page.locator("a[href='https://www.youtube.com/c/AutomationExercise']:has-text('Video Tutorials')");
        this.navContactUsLink       = page.locator("a[href='https://automationexercise.com/contact_us']:has-text('Contact us')");
    }

    // ── Assertions — page state ─────────────────────────────────────────────────

    async verifyPageLoaded(): Promise<void> {
        await expect(this.page).toHaveURL('**/login');
        await expect(this.page.getByText(this.loginSectionHeading)).toBeVisible();
        await expect(this.page.getByText(this.signupSectionHeading)).toBeVisible();
        console.info('Login page loaded and verified.');
    }

    async verifyLoginFormVisible(): Promise<void> {
        const fields = [this.loginEmailInput, this.loginPasswordInput, this.loginButton];
        for (const field of fields) {
            await expect(field).toBeVisible();
        }
        console.info('Login form inputs are visible.');
    }

    async verifySignupFormVisible(): Promise<void> {
        const fields = [this.signupNameInput, this.signupEmailInput, this.signupButton];
        for (const field of fields) {
            await expect(field).toBeVisible();
        }
        console.info('Signup form inputs are visible.');
    }

    // ── Actions — login (atomic) ────────────────────────────────────────────────

    async fillLoginEmail(email: string): Promise<void> {
        await this.loginEmailInput.fill(email);
        console.info(`Filled login email: ${email}`);
    }

    async fillLoginPassword(password: string): Promise<void> {
        await this.loginPasswordInput.fill(password);
        console.info('Filled login password.');
    }

    async submitLogin(): Promise<void> {
        await this.loginButton.click();
        await this.page.waitForLoadState('networkidle');
        console.info('Submitted login form.');
    }

    // ── Actions — signup (atomic) ───────────────────────────────────────────────

    async fillSignupName(name: string): Promise<void> {
        await this.signupNameInput.fill(name);
        console.info(`Filled signup name: ${name}`);
    }

    async fillSignupEmail(email: string): Promise<void> {
        await this.signupEmailInput.fill(email);
        console.info(`Filled signup email: ${email}`);
    }

    async submitSignup(): Promise<void> {
        await this.signupButton.click();
        await this.page.waitForLoadState('networkidle');
        console.info('Submitted signup form.');
    }

    // ── Actions — login (composite) ─────────────────────────────────────────────

    async loginWithCredentials(email: string, password: string): Promise<void> {
        await this.loginEmailInput.fill(email);
        await this.loginPasswordInput.fill(password);
        await this.loginButton.click();
        await this.page.waitForLoadState('networkidle');
        console.info('Submitted login form with credentials.');
    }

    async loginWithInvalidCredentials(email: string, password: string): Promise<void> {
        await this.loginEmailInput.fill(email);
        await this.loginPasswordInput.fill(password);
        await this.loginButton.click();
        await expect(this.page.getByText(this.invalidLoginErrorText)).toBeVisible({ timeout: 5000 });
        console.info('Invalid login: error message verified.');
    }

    async loginWithBlankFields(): Promise<void> {
        await this.loginEmailInput.fill('');
        await this.loginPasswordInput.fill('');
        await this.loginButton.click();
        await expect(this.page.getByText(this.invalidLoginErrorText)).toBeVisible({ timeout: 5000 });
        console.info('Blank login submission: error message verified.');
    }

    // ── Assertions — login errors ───────────────────────────────────────────────

    async verifyLoginError(message: string): Promise<void> {
        await expect(this.page.getByText(message)).toBeVisible({ timeout: 5000 });
        console.info(`Login error message verified: ${message}`);
    }

    async verifyInvalidCredentialsError(): Promise<void> {
        await expect(this.page.getByText(this.invalidLoginErrorText)).toBeVisible({ timeout: 5000 });
        console.info('Invalid credentials error message verified.');
    }

    // ── Actions — signup ─────────────────────────────────────────────────────────

    async signupWith(name: string, email: string): Promise<void> {
        await this.signupNameInput.fill(name);
        await this.signupEmailInput.fill(email);
        await this.signupButton.click();
        await this.page.waitForLoadState('networkidle');
        console.info('Submitted signup form.');
    }

    // ── Actions — subscription ───────────────────────────────────────────────────

    async subscribeToNewsletter(email: string): Promise<void> {
        await this.subscriptionEmailInput.scrollIntoViewIfNeeded();
        await this.subscriptionEmailInput.fill(email);
        await this.subscriptionButton.click();
        await expect(this.page.getByText(this.subscribeSuccessText)).toBeVisible({ timeout: 5000 });
        console.info('Newsletter subscription verified.');
    }

    // ── Assertions — security ────────────────────────────────────────────────────

    async verifyNoScriptInjection(): Promise<void> {
        await expect(this.page).not.toHaveURL(/alert|<script|javascript:/i);
        console.info('No script injection markers in URL.');
    }
}
