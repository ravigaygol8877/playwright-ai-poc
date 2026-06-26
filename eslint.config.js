// @ts-check
import tseslint from "typescript-eslint";
import playwright from "eslint-plugin-playwright";

export default tseslint.config(
  // Base TypeScript strict rules
  ...tseslint.configs.recommended,

  // Project-wide settings
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Disallow `any` type — the main quality gate
      "@typescript-eslint/no-explicit-any": "error",
      // Require return types on public methods
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // Allow unused vars prefixed with _
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // Allow non-null assertions in test helpers
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },

  // Playwright-specific rules for test files
  {
    ...playwright.configs["flat/recommended"],
    files: ["tests/**/*.spec.ts", "tests/**/*.test.ts"],
    settings: {
      // Declare custom test fixtures so playwright/no-standalone-expect
      // recognises testDesktop (and testMobile) as valid test functions.
      playwright: {
        globalAliases: {
          test: ["testDesktop", "testMobile"],
        },
      },
    },
    rules: {
      ...playwright.configs["flat/recommended"].rules,
      "playwright/no-wait-for-timeout": "error",
      "playwright/no-element-handle": "error",
      "playwright/prefer-web-first-assertions": "warn",
      "playwright/no-page-pause": "error",
    },
  },

  // Ignore generated/test/config files
  {
    ignores: [
      "dist/**",
      "build/**",
      "node_modules/**",
      "support/pages/**",     // generated POM files — may contain LLM artefacts
      "support/data/**",      // generated data files
      "playwright.config.ts", // third-party config
      "*.js",                 // compiled output / config scripts at root
    ],
  },
);
