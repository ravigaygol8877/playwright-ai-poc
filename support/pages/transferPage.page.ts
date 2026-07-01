import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export default class TransferPage {
    private readonly page: Page;

    private readonly fromAccount: Locator;
    private readonly toAccount: Locator;
    private readonly amount: Locator;
    private readonly transferButton: Locator;
    private readonly transferCompleteHeader: Locator;
    private readonly transferCompleteAmount: Locator;
    private readonly homeLink: Locator;
    private readonly accountsOverviewLink: Locator;

    private readonly transferComplete = 'Transfer Complete!';
    private readonly amountRequired = 'The amount cannot be empty.';
    private readonly invalidAmount = 'Please enter a valid amount.';
    private readonly insufficientFunds = 'Insufficient funds';

    constructor(page: Page) {
        this.page = page;

        this.fromAccount = page.locator("select[id='fromAccountId']").first();
        this.toAccount = page.locator("select[id='toAccountId']").first();
        this.amount = page.locator("input[id='amount']").first();
        this.transferButton = page.locator("input[type='submit'].button").first();
        this.transferCompleteHeader = page.locator('h1.title').first();
        this.transferCompleteAmount = page.locator('#showResult .ng-binding').first();
        this.homeLink = page.locator("a:has-text('Home')").first();
        this.accountsOverviewLink = page.locator("a:has-text('Accounts Overview')").first();
    }

    async successfulFundTransferWithValidAmount(): Promise<void> {
        await this.fromAccount.selectOption({ index: 0 });
        await this.toAccount.selectOption({ index: 1 });
        await this.amount.fill('100');
        await this.transferButton.click();
        await expect(this.transferCompleteHeader).toBeVisible();
        await expect(this.transferCompleteHeader).toHaveText(this.transferComplete);
        await expect(this.transferCompleteAmount).toBeVisible();
        console.info('Verified successful fund transfer with valid amount.');
    }

    async attemptTransferWithEmptyAmountField(): Promise<void> {
        await this.fromAccount.selectOption({ index: 0 });
        await this.toAccount.selectOption({ index: 1 });
        await this.amount.fill('');
        await this.transferButton.click();
        await expect(this.amount).toBeVisible();
        await expect(this.amount).toHaveText(this.amountRequired);
        console.info('Verified attempt transfer with empty amount field.');
    }

    async attemptTransferWithNonnumericCharactersInAmountField(): Promise<void> {
        await this.fromAccount.selectOption({ index: 0 });
        await this.toAccount.selectOption({ index: 1 });
        await this.amount.fill('abc');
        await this.transferButton.click();
        await expect(this.amount).toBeVisible();
        await expect(this.amount).toHaveText(this.invalidAmount);
        console.info('Verified attempt transfer with nonnumeric characters in amount field.');
    }

    async attemptTransferWithZeroAmount(): Promise<void> {
        await this.fromAccount.selectOption({ index: 0 });
        await this.toAccount.selectOption({ index: 1 });
        await this.amount.fill('0');
        await this.transferButton.click();
        await expect(this.amount).toBeVisible();
        await expect(this.amount).toHaveText(this.invalidAmount);
        console.info('Verified attempt transfer with zero amount.');
    }

    async attemptTransferWithANegativeAmountSecurityCheck(): Promise<void> {
        await this.fromAccount.selectOption({ index: 0 });
        await this.toAccount.selectOption({ index: 1 });
        await this.amount.fill('-50');
        await this.transferButton.click();
        await expect(this.amount).toBeVisible();
        await expect(this.amount).toHaveText(this.invalidAmount);
        console.info('Verified attempt transfer with a negative amount security check.');
    }

    async attemptTransferExceedingAvailableBalanceInsufficientFunds(): Promise<void> {
        await this.fromAccount.selectOption({ index: 0 });
        await this.toAccount.selectOption({ index: 1 });
        await this.amount.fill('1000000');
        await this.transferButton.click();
        await expect(this.amount).toBeVisible();
        await expect(this.amount).toContainText(this.insufficientFunds);
        console.info('Verified attempt transfer exceeding available balance insufficient funds.');
    }

    async attemptTransferAtMaximumAllowedLimit(): Promise<void> {
        await this.fromAccount.selectOption({ index: 0 });
        await this.toAccount.selectOption({ index: 1 });
        await this.amount.fill('10000');
        await this.transferButton.click();
        await expect(this.transferCompleteHeader).toBeVisible();
        await expect(this.transferCompleteHeader).toHaveText(this.transferComplete);
        await expect(this.transferCompleteAmount).toBeVisible();
        console.info('Verified attempt transfer at maximum allowed limit.');
    }
}
