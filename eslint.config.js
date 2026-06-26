// @ts-check
import tseslint from "typescript-eslint";

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

  // Ignore generated/test/config files
  {
    ignores: [
      "dist/**",
      "build/**",
      "node_modules/**",
      "src/pages/**",         // generated POM files — may contain LLM artefacts
      "src/data/**",          // generated data files
      "playwright.config.ts", // third-party config
      "*.js",                 // compiled output / config scripts at root
    ],
  },
);
