import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { resolveRunContext } from './src/reporting/RunContext.js';

// Load environment-specific overrides, then root .env as fallback.
// This runs at config-parse time so BASE_URL and HTTP_* are available immediately.
const env     = process.env['ENVIRONMENT'] ?? 'development';
const envFile = `config/environments/${env}.env`;
if (existsSync(envFile)) loadEnv({ path: envFile, override: false });
loadEnv({ override: false });

// Resolve the active run context — creates a timestamped reports/{runId}/ tree.
// Reuses the run ID from generate-all when tests follow a generation step.
const runs = resolveRunContext();

const CI            = process.env['CI'];
const httpUsername  = process.env['HTTP_USERNAME'];
const httpPassword  = process.env['HTTP_PASSWORD'];

export default defineConfig({
  testDir: './tests',

  outputDir: runs.testArtifacts,

  fullyParallel: true,

  forbidOnly: !!CI,

  retries: CI ? 2 : 0,

  ...(CI ? { workers: 2 } : {}),

  reporter: [
    ['html',             { open: 'never', outputFolder: runs.playwright }],
    ['json',             { outputFile: path.join(runs.playwright, 'results.json') }],
    ['junit',            { outputFile: path.join(runs.playwright, 'junit.xml') }],
    ['allure-playwright', { detail: true, outputFolder: runs.allureResults, suiteTitle: false }],
    CI ? ['github'] : ['list'],
  ],

  use: {
    baseURL: process.env['BASE_URL'] ?? 'http://localhost:3000',

    testIdAttribute: 'data-testid',

    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',

    actionTimeout:     10_000,
    navigationTimeout: 30_000,

    // Basic HTTP auth — only injected when credentials are present (QA/UAT envs)
    ...(httpUsername && httpPassword
      ? { httpCredentials: { username: httpUsername, password: httpPassword } }
      : {}),
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
