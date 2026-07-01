import type { ConsoleMessage, Page } from '@playwright/test';
import { testDesktop, testMobile } from '../../support/fixtures/visitFixture.js';
import { loginToParaBank, navigateTo } from '../../support/helper/loginHelper.js';
import TransferPage from '../../support/pages/transferPage.page.js';

let transferPage: TransferPage;

testDesktop.describe('transferFunds - Desktop', () => {
    testDesktop.beforeEach(async ({ page }: { page: Page }) => {
        await loginToParaBank(page);
        await navigateTo(page, 'transfer.htm');
        transferPage = new TransferPage(page);
        page.on('console', (msg: ConsoleMessage) => console.info(`[Console][Desktop]: ${msg.text()}`));
    });

    testDesktop(
        'TC_001 @regression : [transferFunds] Successful fund transfer with valid amount',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Enter a positive, valid amount (e.g., 100.00).
        // Click the 'Confirm Transfer' button.
        await transferPage.successfulFundTransferWithValidAmount();
        },
    );

    testDesktop(
        'TC_002 @regression : [transferFunds] Attempt transfer with empty amount field',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Leave the amount field blank.
        // Click the 'Confirm Transfer' button.
        await transferPage.attemptTransferWithEmptyAmountField();
        },
    );

    testDesktop(
        'TC_003 @regression : [transferFunds] Attempt transfer with non-numeric characters in amount field',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Enter non-numeric characters (e.g., 'abc').
        // Click the 'Confirm Transfer' button.
        await transferPage.attemptTransferWithNonnumericCharactersInAmountField();
        },
    );

    testDesktop(
        'TC_004 @regression : [transferFunds] Attempt transfer with zero amount',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Enter the amount '0.00'.
        // Click the 'Confirm Transfer' button.
        await transferPage.attemptTransferWithZeroAmount();
        },
    );

    testDesktop(
        'TC_005 @regression : [transferFunds] Attempt transfer with a negative amount (Security Check)',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Enter a negative amount (e.g., -50.00).
        // Click the 'Confirm Transfer' button.
        await transferPage.attemptTransferWithANegativeAmountSecurityCheck();
        },
    );

    testDesktop(
        'TC_006 @regression : [transferFunds] Attempt transfer exceeding available balance (Insufficient Funds)',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Enter an amount greater than the current balance (e.g., 100.00).
        // Click the 'Confirm Transfer' button.
        await transferPage.attemptTransferExceedingAvailableBalanceInsufficientFunds();
        },
    );

    testDesktop(
        'TC_007 @regression : [transferFunds] Attempt transfer at maximum allowed limit',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Enter the maximum allowed transfer amount (e.g., 99999.99).
        // Click the 'Confirm Transfer' button.
        await transferPage.attemptTransferAtMaximumAllowedLimit();
        },
    );
});

testMobile.describe('transferFunds - Mobile Web', () => {
    testMobile.beforeEach(async ({ page }: { page: Page }) => {
        await loginToParaBank(page);
        await navigateTo(page, 'transfer.htm');
        transferPage = new TransferPage(page);
        page.on('console', (msg: ConsoleMessage) => console.info(`[Console][Mobile]: ${msg.text()}`));
    });

    testMobile(
        'TC_001 @regression : [transferFunds][Mobile] Successful fund transfer with valid amount',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Enter a positive, valid amount (e.g., 100.00).
        // Click the 'Confirm Transfer' button.
        await transferPage.successfulFundTransferWithValidAmount();
        },
    );

    testMobile(
        'TC_002 @regression : [transferFunds][Mobile] Attempt transfer with empty amount field',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Leave the amount field blank.
        // Click the 'Confirm Transfer' button.
        await transferPage.attemptTransferWithEmptyAmountField();
        },
    );

    testMobile(
        'TC_003 @regression : [transferFunds][Mobile] Attempt transfer with non-numeric characters in amount field',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Enter non-numeric characters (e.g., 'abc').
        // Click the 'Confirm Transfer' button.
        await transferPage.attemptTransferWithNonnumericCharactersInAmountField();
        },
    );

    testMobile(
        'TC_004 @regression : [transferFunds][Mobile] Attempt transfer with zero amount',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Enter the amount '0.00'.
        // Click the 'Confirm Transfer' button.
        await transferPage.attemptTransferWithZeroAmount();
        },
    );

    testMobile(
        'TC_005 @regression : [transferFunds][Mobile] Attempt transfer with a negative amount (Security Check)',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Enter a negative amount (e.g., -50.00).
        // Click the 'Confirm Transfer' button.
        await transferPage.attemptTransferWithANegativeAmountSecurityCheck();
        },
    );

    testMobile(
        'TC_006 @regression : [transferFunds][Mobile] Attempt transfer exceeding available balance (Insufficient Funds)',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Enter an amount greater than the current balance (e.g., 100.00).
        // Click the 'Confirm Transfer' button.
        await transferPage.attemptTransferExceedingAvailableBalanceInsufficientFunds();
        },
    );

    testMobile(
        'TC_007 @regression : [transferFunds][Mobile] Attempt transfer at maximum allowed limit',
        async ({ page }: { page: Page }) => {
        // Navigate to the fund transfer module.
        // Select Source Account A and Destination Account B.
        // Enter the maximum allowed transfer amount (e.g., 99999.99).
        // Click the 'Confirm Transfer' button.
        await transferPage.attemptTransferAtMaximumAllowedLimit();
        },
    );
});
