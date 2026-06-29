import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { resolveRunContext } from './pipeline/reporting/RunContext.js';

const env     = process.env['ENVIRONMENT'] ?? 'development';
const envFile = `config/environments/${env}.env`;
if (existsSync(envFile)) loadEnv({ path: envFile, override: false });
loadEnv({ override: false });

const runs = resolveRunContext();

const CI           = process.env['CI'];
const httpUsername = process.env['HTTP_USERNAME'];
const httpPassword = process.env['HTTP_PASSWORD'];

export default defineConfig({
  testDir: './tests',

  testMatch: '**/*.spec.ts',

  outputDir: runs.testArtifacts,

  timeout: 120000,

  fullyParallel: false,

  forbidOnly: !!CI,

  retries: CI ? 2 : 0,

  workers: 1,

  reporter: [
    ['html',              { open: 'never', outputFolder: runs.playwright }],
    ['json',              { outputFile: path.join(runs.playwright, 'results.json') }],
    ['junit',             { outputFile: path.join(runs.playwright, 'junit.xml') }],
    ['allure-playwright', { detail: true, outputFolder: 'allure-results', suiteTitle: false }],
    CI ? ['github'] : ['list'],
  ],

  expect: {
    timeout: 5000,
  },

  use: {
    baseURL: process.env['BASE_URL'] ?? 'https://automationexercise.com',

    testIdAttribute: 'data-testid',

    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',

    headless: !!CI,

    actionTimeout:     10_000,
    navigationTimeout: 30_000,

    ...(httpUsername && httpPassword
      ? { httpCredentials: { username: httpUsername, password: httpPassword } }
      : {}),
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});
