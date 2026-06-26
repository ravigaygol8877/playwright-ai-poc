/**
 * create-requirements-template.ts
 *
 * Creates requirements/requirements.xlsx with the correct column headers,
 * column widths, dropdowns, and example rows so the QA team can start
 * filling in requirements immediately.
 *
 * Column layout (A–G):
 *   A: Page (KB Key)   — e.g. "parabank-login"
 *   B: URL             — page URL for auto KB generation
 *   C: Feature         — functional area
 *   D: Scenario Name   — short test name
 *   E: Description     — full acceptance criteria
 *   F: Priority        — smoke | regression
 *   G: Test Cases      — blank = AI generates
 *
 * Usage:
 *   npm run requirements:template
 */

import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const OUTPUT_FILE = path.join("requirements", "requirements.xlsx");

async function main() {
  fs.mkdirSync("requirements", { recursive: true });

  const workbook  = new ExcelJS.Workbook();
  workbook.creator = "AI Test Intelligence Platform";

  const sheet = workbook.addWorksheet("Requirements", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  });

  // ── Headers ────────────────────────────────────────────────────────────────
  sheet.columns = [
    { header: "Page (KB Key)",      key: "page",        width: 28 },
    { header: "URL",                key: "url",         width: 50 },
    { header: "Feature",            key: "feature",     width: 22 },
    { header: "Scenario Name",      key: "scenario",    width: 36 },
    { header: "Description / Acceptance Criteria", key: "description", width: 58 },
    { header: "Priority",           key: "priority",    width: 14 },
    { header: "Test Cases (blank = AI generates)", key: "testCases", width: 45 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font  = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 22;

  // ── Example rows (generic placeholders — replace with your app's pages) ────
  const examples = [
    {
      page:        "parabank-login",
      url:         "https://parabank.parasoft.com/parabank/login.htm",
      feature:     "Authentication",
      scenario:    "Valid login navigates to account overview",
      description: "User should be able to log in with valid credentials and be redirected to the account overview page.",
      priority:    "smoke",
      testCases:   "",
    },
    {
      page:        "parabank-login",
      url:         "https://parabank.parasoft.com/parabank/login.htm",
      feature:     "Authentication",
      scenario:    "Invalid credentials show error message",
      description: "Submitting the login form with an incorrect password should display the error 'The username and password could not be verified'.",
      priority:    "regression",
      testCases:   "",
    },
    {
      page:        "parabank-register",
      url:         "https://parabank.parasoft.com/parabank/register.htm",
      feature:     "Registration",
      scenario:    "New user registration creates account",
      description: "A new user should be able to register by filling all required fields and clicking Register, resulting in an account created confirmation.",
      priority:    "smoke",
      testCases:   "",
    },
  ];

  for (const ex of examples) {
    const row = sheet.addRow(ex);
    row.alignment = { wrapText: true, vertical: "top" };
    row.height    = 55;
  }

  // ── Priority dropdown on column F (was E before URL column was added) ────────
  const dataRows = 200;
  for (let i = 2; i <= dataRows; i++) {
    sheet.getCell(`F${i}`).dataValidation = {
      type:         "list",
      allowBlank:   true,
      formulae:     ['"smoke,regression"'],
      showErrorMessage: true,
      errorTitle:   "Invalid priority",
      error:        "Choose 'smoke' or 'regression'",
    };
  }

  // ── Instructions sheet ─────────────────────────────────────────────────────
  const instructions = workbook.addWorksheet("Instructions");
  instructions.getColumn(1).width = 80;

  const instructionLines = [
    ["AI Test Intelligence Platform — Requirements Template"],
    [""],
    ["HOW TO USE"],
    [""],
    ["1. Fill in the 'Requirements' worksheet. Each row = one test scenario."],
    ["2. Page (KB Key) — use the exact knowledge-base file name without .json, e.g.:"],
    ["     parabank-login"],
    ["     parabank-register"],
    ["3. URL — the full URL of that page (e.g., https://your-app.com/login)."],
    ["   The framework auto-generates the knowledge-base JSON from this URL on first run."],
    ["   You only need to fill it on one row per page — repeated rows for the same page reuse it."],
    ["4. Feature — the functional area (e.g., Authentication, Checkout, Dashboard)."],
    ["5. Scenario Name — short name for the test, e.g. 'Valid login redirects to overview'."],
    ["6. Description — the full acceptance criteria. Be specific."],
    ["7. Priority — 'smoke' runs in every CI build; 'regression' runs nightly."],
    ["8. Test Cases — LEAVE BLANK to have AI generate test cases for this row."],
    ["   Fill in this column ONLY if you want to override AI with manual steps."],
    [""],
    ["RUN THE GENERATOR"],
    ["   npm run generate:from-excel"],
    ["   npm run generate:from-excel -- --file requirements/my-sprint.xlsx"],
    [""],
    ["VIEWING REPORTS"],
    ["   npm run report:latest     ← open Playwright HTML report"],
    ["   npm run allure:serve      ← open Allure report"],
    [""],
    ["The reports/latest/ folder contains all generated artefacts for the most recent run."],
  ];

  for (const [line] of instructionLines) {
    const row = instructions.addRow([line]);
    if (line && !line.startsWith(" ") && !line.startsWith("  ")) {
      row.font = { bold: line === instructionLines[0]?.[0] };
    }
  }

  await workbook.xlsx.writeFile(OUTPUT_FILE);
  console.log(`\n  ✅  Template created: ${OUTPUT_FILE}`);
  console.log(`  Fill in the 'Requirements' worksheet then run: npm run generate:from-excel\n`);
}

main().catch(err => {
  console.error("\n  Error:", (err as Error).message);
  process.exit(1);
});
