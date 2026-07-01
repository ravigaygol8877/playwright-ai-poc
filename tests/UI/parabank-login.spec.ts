import type { ConsoleMessage, Page } from '@playwright/test';
import { testDesktop, testMobile } from '../../support/fixtures/visitFixture.js';
import { verifyPageTitle, waitForSelector } from '../../support/helper/interceptHelper.js';
import LoginPage from '../../support/pages/loginPage.page.js';

let loginPage: LoginPage;

testDesktop.describe('onlineBankingLogin - Desktop', () => {
    testDesktop.beforeEach(async ({ page }: { page: Page }) => {
        loginPage = new LoginPage(page);
        page.on('console', (msg: ConsoleMessage) => console.info(`[Console][Desktop]: ${msg.text()}`));
    });

    testDesktop(
        'TC_001 @regression : [onlineBankingLogin] Successful Login with Valid Credentials',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Enter valid username into the 'username' field.
        // Enter valid password into the 'password' field.
        // Click the 'Log In' button.
        await loginPage.successfulLoginWithValidCredentials();
        },
    );

    testDesktop(
        'TC_002 @regression : [onlineBankingLogin] Login Attempt with Invalid Username',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Enter invalid username into the 'username' field.
        // Enter valid password into the 'password' field.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithInvalidUsername();
        },
    );

    testDesktop(
        'TC_003 @regression : [onlineBankingLogin] Login Attempt with Invalid Password',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Enter valid username into the 'username' field.
        // Enter invalid password into the 'password' field.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithInvalidPassword();
        },
    );

    testDesktop(
        'TC_004 @regression : [onlineBankingLogin] Login Attempt with Both Fields Empty',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Leave the 'username' field empty.
        // Leave the 'password' field empty.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithBothFieldsEmpty();
        },
    );

    testDesktop(
        'TC_005 @regression : [onlineBankingLogin] Login Attempt with Empty Username Field',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Leave the 'username' field empty.
        // Enter valid password into the 'password' field.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithEmptyUsernameField();
        },
    );

    testDesktop(
        'TC_006 @regression : [onlineBankingLogin] Login Attempt with Empty Password Field',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Enter valid username into the 'username' field.
        // Leave the 'password' field empty.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithEmptyPasswordField();
        },
    );

    testDesktop(
        'TC_007 @regression : [onlineBankingLogin] Login Attempt with SQL Injection in Username Field',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Enter SQL injection string (e.g., "' OR '1'='1") into the 'username' field.
        // Enter any value into the 'password' field.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithSqlInjectionInUsernameField();
        },
    );

    testDesktop(
        'TC_008 @regression : [onlineBankingLogin] Login Attempt with Maximum Length Username and Password',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Enter a username with the maximum allowed characters into the 'username' field.
        // Enter a password with the maximum allowed characters into the 'password' field.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithMaximumLengthUsernameAndPassword();
        },
    );
});

testMobile.describe('onlineBankingLogin - Mobile Web', () => {
    testMobile.beforeEach(async ({ page }: { page: Page }) => {
        loginPage = new LoginPage(page);
        page.on('console', (msg: ConsoleMessage) => console.info(`[Console][Mobile]: ${msg.text()}`));
    });

    testMobile(
        'TC_001 @regression : [onlineBankingLogin][Mobile] Successful Login with Valid Credentials',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Enter valid username into the 'username' field.
        // Enter valid password into the 'password' field.
        // Click the 'Log In' button.
        await loginPage.successfulLoginWithValidCredentials();
        },
    );

    testMobile(
        'TC_002 @regression : [onlineBankingLogin][Mobile] Login Attempt with Invalid Username',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Enter invalid username into the 'username' field.
        // Enter valid password into the 'password' field.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithInvalidUsername();
        },
    );

    testMobile(
        'TC_003 @regression : [onlineBankingLogin][Mobile] Login Attempt with Invalid Password',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Enter valid username into the 'username' field.
        // Enter invalid password into the 'password' field.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithInvalidPassword();
        },
    );

    testMobile(
        'TC_004 @regression : [onlineBankingLogin][Mobile] Login Attempt with Both Fields Empty',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Leave the 'username' field empty.
        // Leave the 'password' field empty.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithBothFieldsEmpty();
        },
    );

    testMobile(
        'TC_005 @regression : [onlineBankingLogin][Mobile] Login Attempt with Empty Username Field',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Leave the 'username' field empty.
        // Enter valid password into the 'password' field.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithEmptyUsernameField();
        },
    );

    testMobile(
        'TC_006 @regression : [onlineBankingLogin][Mobile] Login Attempt with Empty Password Field',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Enter valid username into the 'username' field.
        // Leave the 'password' field empty.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithEmptyPasswordField();
        },
    );

    testMobile(
        'TC_007 @regression : [onlineBankingLogin][Mobile] Login Attempt with SQL Injection in Username Field',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Enter SQL injection string (e.g., "' OR '1'='1") into the 'username' field.
        // Enter any value into the 'password' field.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithSqlInjectionInUsernameField();
        },
    );

    testMobile(
        'TC_008 @regression : [onlineBankingLogin][Mobile] Login Attempt with Maximum Length Username and Password',
        async ({ page }: { page: Page }) => {
        // Navigate to ParaBank login page.
        // Enter a username with the maximum allowed characters into the 'username' field.
        // Enter a password with the maximum allowed characters into the 'password' field.
        // Click the 'Log In' button.
        await loginPage.loginAttemptWithMaximumLengthUsernameAndPassword();
        },
    );
});
