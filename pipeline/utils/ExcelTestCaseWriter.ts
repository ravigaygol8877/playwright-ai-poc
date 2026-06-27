/**
 * ExcelTestCaseWriter
 *
 * Writes all AI-generated test cases into a "Generated Test Cases" sheet
 * inside the same requirements Excel file. The sheet is replaced on every run
 * so it always reflects the latest generation.
 *
 * Sheet columns:
 *   A  ID             — TC_001, TC_002, ...
 *   B  Page           — KB page key
 *   C  Feature        — functional area
 *   D  Scenario       — requirement scenario name
 *   E  Test Case Title — AI-generated title
 *   F  Type           — positive | negative | validation | edge-case | security | boundary
 *   G  Priority       — Critical | High | Medium | Low
 *   H  Preconditions  — numbered list
 *   I  Steps          — numbered list
 *   J  Expected Result
 *   K  Req. Priority  — smoke | regression (from Sheet 1)
 *   L  Source         — Excel | AI-Discovered
 */

import ExcelJS from "exceljs";
import type { ExpandedRequirement } from "../readers/RequirementExpander.js";

// ─── Priority colour coding ────────────────────────────────────────────────────

const PRIORITY_FILL: Record<string, ExcelJS.Fill> = {
  Critical: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } },
  High:     { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6600" } },
  Medium:   { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } },
  Low:      { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } },
};

const PRIORITY_FONT_COLOR: Record<string, string> = {
  Critical: "FFFFFFFF",
  High:     "FFFFFFFF",
  Medium:   "FF000000",
  Low:      "FF000000",
};

const TYPE_FILL: Record<string, ExcelJS.Fill> = {
  positive:   { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } },
  negative:   { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4D6" } },
  validation: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } },
  "edge-case":{ type: "pattern", pattern: "solid", fgColor: { argb: "FFDAE8FC" } },
  security:   { type: "pattern", pattern: "solid", fgColor: { argb: "FFE1D5E7" } },
  boundary:   { type: "pattern", pattern: "solid", fgColor: { argb: "FFDAE8FC" } },
};

// ─── Writer ────────────────────────────────────────────────────────────────────

export class ExcelTestCaseWriter {

  async write(
    filePath: string,
    expandedRequirements: ExpandedRequirement[],
  ): Promise<number> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // Remove existing sheet if present so we always get a fresh one
    const existing = workbook.getWorksheet("Generated Test Cases");
    if (existing) workbook.removeWorksheet(existing.id);

    const sheet = workbook.addWorksheet("Generated Test Cases", {
      views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
    });

    // ── Column definitions ──────────────────────────────────────────────────
    sheet.columns = [
      { header: "ID",             key: "id",             width: 10  },
      { header: "Page (KB Key)",  key: "page",           width: 26  },
      { header: "Feature",        key: "feature",        width: 22  },
      { header: "Scenario",       key: "scenario",       width: 32  },
      { header: "Test Case Title",key: "title",          width: 42  },
      { header: "Type",           key: "type",           width: 14  },
      { header: "Priority",       key: "priority",       width: 12  },
      { header: "Preconditions",  key: "preconditions",  width: 36  },
      { header: "Steps",          key: "steps",          width: 52  },
      { header: "Expected Result",key: "expectedResult", width: 46  },
      { header: "Req. Priority",  key: "reqPriority",    width: 14  },
      { header: "Source",         key: "source",         width: 16  },
    ];

    // ── Style header row ────────────────────────────────────────────────────
    const headerRow = sheet.getRow(1);
    headerRow.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height    = 24;

    // ── Write test case rows ────────────────────────────────────────────────
    let rowCount = 0;

    for (const req of expandedRequirements) {
      if (!req.aiGenerate || req.generatedTestCases.length === 0) continue;

      for (const tc of req.generatedTestCases) {
        const priority = (tc.priority ?? "Medium") as string;
        const type     = (tc.type     ?? "positive") as string;

        const preconditionText = Array.isArray(tc.preconditions) && tc.preconditions.length > 0
          ? tc.preconditions.map((p, i) => `${i + 1}. ${p}`).join("\n")
          : "None";

        const stepsText = Array.isArray(tc.steps)
          ? tc.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
          : "";

        const sourceLabel = req.source === "ai-discovered" ? "AI-Discovered" : "Excel";

        const row = sheet.addRow({
          id:             tc.id,
          page:           req.page,
          feature:        req.feature,
          scenario:       req.scenario,
          title:          tc.title,
          type,
          priority,
          preconditions:  preconditionText,
          steps:          stepsText,
          expectedResult: tc.expectedResult,
          reqPriority:    req.priority,
          source:         sourceLabel,
        });

        row.height    = Math.max(60, (tc.steps?.length ?? 1) * 18);
        row.alignment = { wrapText: true, vertical: "top" };

        // Colour-code Priority cell (column G = index 7)
        const priorityCell = row.getCell(7);
        if (PRIORITY_FILL[priority]) {
          priorityCell.fill = PRIORITY_FILL[priority]!;
          priorityCell.font = {
            bold:  true,
            color: { argb: PRIORITY_FONT_COLOR[priority] ?? "FF000000" },
          };
          priorityCell.alignment = { horizontal: "center", vertical: "middle" };
        }

        // Colour-code Type cell (column F = index 6)
        const typeCell = row.getCell(6);
        if (TYPE_FILL[type]) {
          typeCell.fill      = TYPE_FILL[type]!;
          typeCell.alignment = { horizontal: "center", vertical: "middle" };
        }

        // Colour-code Source cell (column L = index 12)
        const sourceCell = row.getCell(12);
        if (req.source === "ai-discovered") {
          sourceCell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDAE8FC" } };
          sourceCell.font      = { italic: true, color: { argb: "FF0050A0" } };
          sourceCell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
          sourceCell.alignment = { horizontal: "center", vertical: "middle" };
        }

        // Light border on entire row
        for (let col = 1; col <= 12; col++) {
          row.getCell(col).border = {
            top:    { style: "thin", color: { argb: "FFD0D0D0" } },
            bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
            left:   { style: "thin", color: { argb: "FFD0D0D0" } },
            right:  { style: "thin", color: { argb: "FFD0D0D0" } },
          };
        }

        rowCount++;
      }
    }

    // ── Auto-filter on header ───────────────────────────────────────────────
    sheet.autoFilter = { from: "A1", to: "L1" };

    await workbook.xlsx.writeFile(filePath);
    return rowCount;
  }
}
