import type { ConsoleMessage, Page } from '@playwright/test';
import { testDesktop, testMobile } from '../../support/fixtures/visitFixture.js';
import { loginToParaBank, navigateTo } from '../../support/helper/loginHelper.js';
import BillpayPage from '../../support/pages/billpayPage.page.js';

let billpayPage: BillpayPage;

testDesktop.describe('billPay - Desktop', () => {
    testDesktop.beforeEach(async ({ page }: { page: Page }) => {
        await loginToParaBank(page);
        await navigateTo(page, 'billpay.htm');
        billpayPage = new BillpayPage(page);
        page.on('console', (msg: ConsoleMessage) => console.info(`[Console][Desktop]: ${msg.text()}`));
    });

    testDesktop(
        'TC_001 @regression : [billPay] Successful payment with valid data inputs',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.successfulPaymentWithValidDataInputs();
        },
    );

    testDesktop(
        'TC_002 @regression : [billPay] Attempt payment with account number confirmation mismatch',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.attemptPaymentWithAccountNumberConfirmationMismatch();
        },
    );

    testDesktop(
        'TC_003 @regression : [billPay] Attempt payment with zero amount',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.attemptPaymentWithZeroAmount();
        },
    );

    testDesktop(
        'TC_004 @regression : [billPay] Attempt payment with missing required field (Account Number)',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.attemptPaymentWithMissingRequiredFieldAccountNumber();
        },
    );

    testDesktop(
        'TC_005 @regression : [billPay] Attempt payment with negative amount input',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.attemptPaymentWithNegativeAmountInput();
        },
    );

    testDesktop(
        'TC_006 @regression : [billPay] Security test: Entering SQL injection payload in Payee Name',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.securityTestEnteringSqlInjectionPayloadInPayeeName();
        },
    );

    testDesktop(
        'TC_007 @regression : [billPay] Boundary test: Entering maximum allowed characters in Payee Name',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.boundaryTestEnteringMaximumAllowedCharactersInPayeeName();
        },
    );
});

testMobile.describe('billPay - Mobile Web', () => {
    testMobile.beforeEach(async ({ page }: { page: Page }) => {
        await loginToParaBank(page);
        await navigateTo(page, 'billpay.htm');
        billpayPage = new BillpayPage(page);
        page.on('console', (msg: ConsoleMessage) => console.info(`[Console][Mobile]: ${msg.text()}`));
    });

    testMobile(
        'TC_001 @regression : [billPay][Mobile] Successful payment with valid data inputs',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.successfulPaymentWithValidDataInputs();
        },
    );

    testMobile(
        'TC_002 @regression : [billPay][Mobile] Attempt payment with account number confirmation mismatch',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.attemptPaymentWithAccountNumberConfirmationMismatch();
        },
    );

    testMobile(
        'TC_003 @regression : [billPay][Mobile] Attempt payment with zero amount',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.attemptPaymentWithZeroAmount();
        },
    );

    testMobile(
        'TC_004 @regression : [billPay][Mobile] Attempt payment with missing required field (Account Number)',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.attemptPaymentWithMissingRequiredFieldAccountNumber();
        },
    );

    testMobile(
        'TC_005 @regression : [billPay][Mobile] Attempt payment with negative amount input',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.attemptPaymentWithNegativeAmountInput();
        },
    );

    testMobile(
        'TC_006 @regression : [billPay][Mobile] Security test: Entering SQL injection payload in Payee Name',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.securityTestEnteringSqlInjectionPayloadInPayeeName();
        },
    );

    testMobile(
        'TC_007 @regression : [billPay][Mobile] Boundary test: Entering maximum allowed characters in Payee Name',
        async ({ page }: { page: Page }) => {
        // [object Object]
        // [object Object]
        // [object Object]
        await billpayPage.boundaryTestEnteringMaximumAllowedCharactersInPayeeName();
        },
    );
});
