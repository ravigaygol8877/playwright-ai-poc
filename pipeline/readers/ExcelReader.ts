/**
 * ExcelReader — parses business requirements from an Excel (.xlsx) file.
 *
 * Expected worksheet format (columns A–G):
 *   A: Page        — KB page key (e.g., "parabank-login")
 *   B: URL         — Full page URL (e.g., "https://parabank.parasoft.com/login.htm")
 *                    Used to auto-generate the knowledge-base JSON if it doesn't exist yet.
 *                    Only needs to be filled once per unique page key — repeated rows for
 *                    the same page key reuse the first URL found.
 *   C: Feature     — Feature area (e.g., "Authentication")
 *   D: Scenario    — Short test scenario name
 *   E: Description — Full requirement/acceptance criteria
 *   F: Priority    — smoke | regression | (blank defaults to regression)
 *   G: TestCases   — (blank → AI generates scenarios; filled → manual override)
 *
 * Rows with blank Page or Description are skipped.
 * Rows with blank TestCases are flagged for AI generation.
 */

import ExcelJS from 'exceljs';

export interface Requirement {
  page:        string;
  url:         string;
  feature:     string;
  scenario:    string;
  description: string;
  priority:    'smoke' | 'regression';
  testCases:   string | undefined;
  aiGenerate:  boolean;
  rowNumber:   number;
  /** 'excel' = came from the spreadsheet; 'ai-discovered' = inferred from live page analysis */
  source:      'excel' | 'ai-discovered';
}

export interface ExcelParseResult {
  requirements: Requirement[];
  aiCount:      number;
  manualCount:  number;
  skippedCount: number;
  /** First URL seen per page key — used for KB auto-generation. */
  pageUrls:     Map<string, string>;
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'result' in v) return String((v as ExcelJS.CellFormulaValue).result ?? '');
  if (typeof v === 'object' && 'richText' in v) {
    return (v as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('');
  }
  // Hyperlink cells (Excel auto-formats typed URLs): { text, hyperlink }
  if (typeof v === 'object' && 'hyperlink' in v) {
    const hv = v as { text?: string; hyperlink?: string };
    return String(hv.hyperlink ?? hv.text ?? '');
  }
  return String(v);
}

export class ExcelReader {
  async read(filePath: string, worksheetName?: string): Promise<ExcelParseResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = worksheetName
      ? workbook.getWorksheet(worksheetName)
      : workbook.worksheets[0];

    if (!sheet) {
      throw new Error(
        `Worksheet${worksheetName ? ` "${worksheetName}"` : ''} not found in ${filePath}`
      );
    }

    const requirements: Requirement[] = [];
    const pageUrls     = new Map<string, string>();
    let skippedCount   = 0;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const page         = cellText(row.getCell(1)).trim();
      const url          = cellText(row.getCell(2)).trim();
      const feature      = cellText(row.getCell(3)).trim();
      const scenario     = cellText(row.getCell(4)).trim();
      const description  = cellText(row.getCell(5)).trim();
      const priorityRaw  = cellText(row.getCell(6)).trim().toLowerCase();
      const testCasesRaw = cellText(row.getCell(7)).trim();

      if (!page) {
        skippedCount++;
        return;
      }

      // Always register URL before any skip — lets discovery-only rows (Page + URL, no
      // Description) still contribute their URL for KB generation and scenario inference.
      if (url && !pageUrls.has(page)) {
        pageUrls.set(page, url);
      }

      if (!description) {
        skippedCount++;
        return;
      }

      const priority: 'smoke' | 'regression' =
        priorityRaw === 'smoke' ? 'smoke' : 'regression';

      const testCases  = testCasesRaw || undefined;
      const aiGenerate = !testCasesRaw;

      requirements.push({
        page, url, feature, scenario, description,
        priority, testCases, aiGenerate, rowNumber,
        source: 'excel',
      });
    });

    const aiCount     = requirements.filter(r => r.aiGenerate).length;
    const manualCount = requirements.filter(r => !r.aiGenerate).length;

    return { requirements, aiCount, manualCount, skippedCount, pageUrls };
  }

  /** Group requirements by page key for batch processing. */
  groupByPage(requirements: Requirement[]): Map<string, Requirement[]> {
    const map = new Map<string, Requirement[]>();
    for (const req of requirements) {
      const existing = map.get(req.page) ?? [];
      existing.push(req);
      map.set(req.page, existing);
    }
    return map;
  }
}
