import type { ConsoleMessage, Page } from '@playwright/test';
import { testDesktop, testMobile } from '../../support/fixtures/visitFixture.js';
import { navigateTo } from '../../support/helper/loginHelper.js';
import RegisterPage from '../../support/pages/registerPage.page.js';

let registerPage: RegisterPage;

testDesktop.describe('Account Registration - Desktop', () => {
    testDesktop.beforeEach(async ({ page }: { page: Page }) => {
        await navigateTo(page, 'register.htm');
        registerPage = new RegisterPage(page);
        page.on('console', (msg: ConsoleMessage) => console.info(`[Console][Desktop]: ${msg.text()}`));
    });

    testDesktop(
        'TC_001 @regression : [Account Registration] Successful account registration with valid data',
        async ({ page }: { page: Page }) => {
        // Enter valid personal details into the Personal Details form.
        // Input unique desired username into the Username field.
        // Enter strong password into the Password field.
        // Confirm password by entering the same value into the Confirm Password field.
        // Click the Register button.
        await registerPage.successfulAccountRegistrationWithValidData();
        },
    );

    testDesktop(
        'TC_002 @regression : [Account Registration] Attempt registration with a username already in use',
        async ({ page }: { page: Page }) => {
        // Enter valid personal details.
        // Input 'ExistingUser' into the Username field.
        // Enter strong password and confirmation.
        // Click the Register button.
        await registerPage.attemptRegistrationWithAUsernameAlreadyInUse();
        },
    );

    testDesktop(
        'TC_003 @regression : [Account Registration] Attempt registration with password confirmation mismatch',
        async ({ page }: { page: Page }) => {
        // Enter valid personal details.
        // Input unique desired username.
        // Enter 'Password123' into the Password field.
        // Input 'Password456' (different) into the Confirm Password field.
        // Click the Register button.
        await registerPage.attemptRegistrationWithPasswordConfirmationMismatch();
        },
    );

    testDesktop(
        'TC_004 @regression : [Account Registration] Attempt registration leaving all required fields blank',
        async ({ page }: { page: Page }) => {
        // Leave all Personal Details fields blank.
        // Leave Username, Password, and Confirm Password fields blank.
        // Click the Register button.
        await registerPage.attemptRegistrationLeavingAllRequiredFieldsBlank();
        },
    );

    testDesktop(
        'TC_005 @regression : [Account Registration] Attempt registration with missing critical personal detail (e.g., Email)',
        async ({ page }: { page: Page }) => {
        // Enter valid details for all fields EXCEPT the Email field.
        // Input unique username and password.
        // Click the Register button.
        await registerPage.attemptRegistrationWithMissingCriticalPersonalDetailEgEmail();
        },
    );

    testDesktop(
        'TC_006 @regression : [Account Registration] Attempt registration using SQL injection payload in username field',
        async ({ page }: { page: Page }) => {
        // Enter valid personal details.
        // Input 'admin' OR '1'='1' into the Username field.
        // Enter strong password and confirmation.
        // Click the Register button.
        await registerPage.attemptRegistrationUsingSqlInjectionPayloadInUsernameField();
        },
    );

    testDesktop(
        'TC_007 @regression : [Account Registration] Attempt registration using minimum allowed password length (Boundary)',
        async ({ page }: { page: Page }) => {
        // Enter valid personal details.
        // Input unique desired username.
        // Enter exactly 8 characters into the Password field.
        // Confirm password using the same 8 characters.
        // Click the Register button.
        await registerPage.attemptRegistrationUsingMinimumAllowedPasswordLengthBoundary();
        },
    );
});

testMobile.describe('Account Registration - Mobile Web', () => {
    testMobile.beforeEach(async ({ page }: { page: Page }) => {
        await navigateTo(page, 'register.htm');
        registerPage = new RegisterPage(page);
        page.on('console', (msg: ConsoleMessage) => console.info(`[Console][Mobile]: ${msg.text()}`));
    });

    testMobile(
        'TC_001 @regression : [Account Registration][Mobile] Successful account registration with valid data',
        async ({ page }: { page: Page }) => {
        // Enter valid personal details into the Personal Details form.
        // Input unique desired username into the Username field.
        // Enter strong password into the Password field.
        // Confirm password by entering the same value into the Confirm Password field.
        // Click the Register button.
        await registerPage.successfulAccountRegistrationWithValidData();
        },
    );

    testMobile(
        'TC_002 @regression : [Account Registration][Mobile] Attempt registration with a username already in use',
        async ({ page }: { page: Page }) => {
        // Enter valid personal details.
        // Input 'ExistingUser' into the Username field.
        // Enter strong password and confirmation.
        // Click the Register button.
        await registerPage.attemptRegistrationWithAUsernameAlreadyInUse();
        },
    );

    testMobile(
        'TC_003 @regression : [Account Registration][Mobile] Attempt registration with password confirmation mismatch',
        async ({ page }: { page: Page }) => {
        // Enter valid personal details.
        // Input unique desired username.
        // Enter 'Password123' into the Password field.
        // Input 'Password456' (different) into the Confirm Password field.
        // Click the Register button.
        await registerPage.attemptRegistrationWithPasswordConfirmationMismatch();
        },
    );

    testMobile(
        'TC_004 @regression : [Account Registration][Mobile] Attempt registration leaving all required fields blank',
        async ({ page }: { page: Page }) => {
        // Leave all Personal Details fields blank.
        // Leave Username, Password, and Confirm Password fields blank.
        // Click the Register button.
        await registerPage.attemptRegistrationLeavingAllRequiredFieldsBlank();
        },
    );

    testMobile(
        'TC_005 @regression : [Account Registration][Mobile] Attempt registration with missing critical personal detail (e.g., Email)',
        async ({ page }: { page: Page }) => {
        // Enter valid details for all fields EXCEPT the Email field.
        // Input unique username and password.
        // Click the Register button.
        await registerPage.attemptRegistrationWithMissingCriticalPersonalDetailEgEmail();
        },
    );

    testMobile(
        'TC_006 @regression : [Account Registration][Mobile] Attempt registration using SQL injection payload in username field',
        async ({ page }: { page: Page }) => {
        // Enter valid personal details.
        // Input 'admin' OR '1'='1' into the Username field.
        // Enter strong password and confirmation.
        // Click the Register button.
        await registerPage.attemptRegistrationUsingSqlInjectionPayloadInUsernameField();
        },
    );

    testMobile(
        'TC_007 @regression : [Account Registration][Mobile] Attempt registration using minimum allowed password length (Boundary)',
        async ({ page }: { page: Page }) => {
        // Enter valid personal details.
        // Input unique desired username.
        // Enter exactly 8 characters into the Password field.
        // Confirm password using the same 8 characters.
        // Click the Register button.
        await registerPage.attemptRegistrationUsingMinimumAllowedPasswordLengthBoundary();
        },
    );
});
