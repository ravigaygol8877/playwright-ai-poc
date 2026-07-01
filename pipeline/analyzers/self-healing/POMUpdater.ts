import fs from "fs";
import type { HealingResult } from "./models/HealingResult.js";

interface LocatorUpdateDiff {
  propertyName: string;
  oldSelector: string;
  newSelector: string;
  line: number;
}

export class POMUpdater {
  /**
   * Updates a POM file with healed locators.
   * Returns diff information for reporting.
   */
  updatePOMWithHealedLocators(
    pomFilePath: string,
    healingResults: HealingResult[]
  ): LocatorUpdateDiff[] {
    const content = fs.readFileSync(pomFilePath, "utf-8");
    const lines = content.split("\n");
    const diffs: LocatorUpdateDiff[] = [];

    let modifiedContent = content;

    for (const result of healingResults) {
      if (!result.locatorPropertyName) continue;

      // Strip "text=" prefix from healedLocator for string constants
      // If originalLocator starts with "text=", the property is a string constant not a Locator
      const isStringConstant = result.originalLocator.startsWith("text=");
      const effectiveHealed = isStringConstant && result.healedLocator.startsWith("text=")
        ? result.healedLocator.slice(5)
        : result.healedLocator;
      const effectiveOriginal = isStringConstant
        ? result.originalLocator.slice(5)
        : result.originalLocator;

      if (isStringConstant) {
        // Pattern: private readonly propName = 'some text'
        const stringPattern = new RegExp(
          `(private\\s+readonly\\s+${result.locatorPropertyName}\\s*=\\s*)["'\`]([^"'\`]+)["'\`](\\s*;)`
        );
        const match = stringPattern.exec(modifiedContent);
        if (match && match[2] === effectiveOriginal) {
          const oldFull = match[0];
          const newFull = `${match[1]}'${effectiveHealed}'${match[3]}`;
          modifiedContent = modifiedContent.replace(oldFull, newFull);
          const lineNum = modifiedContent.substring(0, modifiedContent.indexOf(newFull)).split("\n").length;
          diffs.push({
            propertyName: result.locatorPropertyName,
            oldSelector: result.originalLocator,
            newSelector: result.healedLocator,
            line: lineNum,
          });
        }
        continue;
      }

      // Try inline pattern: private readonly prop: Locator = page.locator("selector")
      const inlinePattern = new RegExp(
        `(private\\s+readonly\\s+${result.locatorPropertyName}:\\s+Locator\\s*=\\s*.*?\\.locator\\(\\s*)["'\`]([^"'\`]+)["'\`](\\s*\\))`
      );

      // Try constructor pattern: this.prop = page.locator("selector")
      const constructorPattern = new RegExp(
        `(this\\.${result.locatorPropertyName}\\s*=\\s*(?:this\\.page|page)\\.locator\\(\\s*)["'\`]([^"'\`]+)["'\`](\\s*\\))`
      );

      for (const pattern of [inlinePattern, constructorPattern]) {
        const match = pattern.exec(modifiedContent);
        if (match && match[2] === effectiveOriginal) {
          const oldFull = match[0];
          const newFull = `${match[1]}"${effectiveHealed}"${match[3]}`;
          modifiedContent = modifiedContent.replace(oldFull, newFull);

          const lineNum = modifiedContent.substring(0, modifiedContent.indexOf(newFull)).split("\n").length;
          diffs.push({
            propertyName: result.locatorPropertyName,
            oldSelector: result.originalLocator,
            newSelector: result.healedLocator,
            line: lineNum,
          });
          break;
        }
      }
    }

    // Write updated content back to file
    fs.writeFileSync(pomFilePath, modifiedContent, "utf-8");

    return diffs;
  }

  /**
   * Generates a human-readable diff report for POM changes.
   */
  generateDiffReport(diffs: LocatorUpdateDiff[]): string {
    let report = "=== POM File Changes ===\n\n";

    for (const diff of diffs) {
      report += `Property: ${diff.propertyName} (Line ${diff.line})\n`;
      report += `  Old: ${diff.oldSelector}\n`;
      report += `  New: ${diff.newSelector}\n\n`;
    }

    return report;
  }

  /**
   * Validates that a healed selector is syntactically correct and commonly used.
   */
  validateHealedSelector(selector: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if selector is empty
    if (!selector || selector.trim().length === 0) {
      errors.push("Selector is empty");
      return { isValid: false, errors };
    }

    // Check for common CSS selector patterns (including attribute selectors)
    const cssPatterns = [
      /^[.#]?[a-zA-Z_-][\w-]*$/, // Class or ID
      /^[a-zA-Z]+(\[[^\]]+\])*$/, // Tag with attributes
      /^\[[^\]]+\]/, // Attribute selector (e.g., [data-testid='...'])
      /^[.#]?[a-zA-Z_-][\w-]*(\s+[a-zA-Z_-][\w-]*)*$/, // Descendant
      /^[a-zA-Z]+.*:.*\(.*\)/, // Pseudo-selector
    ];

    const isCssValid = cssPatterns.some((p) => p.test(selector));

    // Check for XPath
    const isXPath = selector.startsWith("/") || (selector.startsWith(".") && !selector.startsWith("["));

    // Check for text selector (Playwright text locators)
    const isTextSelector =
      selector.startsWith("text=") ||
      selector.includes("has-text") ||
      selector.includes("has_text");

    if (!isCssValid && !isXPath && !isTextSelector) {
      errors.push("Selector does not match CSS, XPath, or text patterns");
    }

    // Check for suspicious patterns
    if (selector.includes("xpath=")) {
      errors.push('Selector contains "xpath=" prefix - use pure XPath instead');
    }

    if (selector.includes("//") && !selector.startsWith("//")) {
      errors.push('Double slashes found in non-XPath selector');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Escapes special regex characters in a string.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
