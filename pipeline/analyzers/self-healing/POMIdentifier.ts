import fs from "fs";
import path from "path";
import type { LocatorFailureDetail } from "./models/LocatorFailureDetail.js";
import { getPOMRegistry } from "./POMRegistry.js";

interface POMMetadata {
  filePath: string;
  className: string;
  locators: Map<string, string>; // property name → selector
}

export class POMIdentifier {
  private readonly pagesDir = "support/pages";
  private pomCache: Map<string, POMMetadata> = new Map();

  /**
   * Identifies and maps test failures to their corresponding POM files and locators.
   */
  async populateFailureWithPOMInfo(
    failure: LocatorFailureDetail
  ): Promise<void> {
    // Try to find POM using registry (by test name)
    const registry = await getPOMRegistry();
    const pomEntry = registry.lookup(failure.testName);

    if (!pomEntry) {
      // Fallback to old method for compatibility
      const testFileMatch = failure.testFile.match(/\/([a-z-]+)\.spec\.ts/i);
      const pageIdentifier = testFileMatch?.[1];
      if (pageIdentifier) {
        const pomFile = this.findPOMFile(pageIdentifier);
        if (pomFile) {
          const pomMeta = this.loadPOMMetadata(pomFile);
          if (pomMeta) {
            failure.pageObjectFile = pomFile;
            failure.pageObjectClass = pomMeta.className;

            if (failure.brokenLocator) {
              const matchingProperty = this.findMatchingLocatorProperty(
                failure.brokenLocator,
                pomMeta
              );
              if (matchingProperty) {
                failure.locatorPropertyName = matchingProperty;
                failure.confidenceInExtraction = 95;
              }
            }
          }
        }
      }
      return;
    }

    // Load POM metadata
    const pomMeta = this.loadPOMMetadata(pomEntry.filePath);
    if (!pomMeta) return;

    failure.pageObjectFile = pomEntry.filePath;
    failure.pageObjectClass = pomMeta.className;

    // If we have a broken locator, try to find matching property in POM
    if (failure.brokenLocator) {
      const matchingProperty = this.findMatchingLocatorProperty(
        failure.brokenLocator,
        pomMeta
      );
      if (matchingProperty) {
        failure.locatorPropertyName = matchingProperty;
        failure.confidenceInExtraction = 95;
      }
    }
  }

  /**
   * Finds POM file matching the test identifier.
   * E.g., "login" → "loginPage.page.ts", "billpay" → "billpayPage.page.ts"
   */
  private findPOMFile(testIdentifier: string): string | null {
    try {
      const files = fs.readdirSync(this.pagesDir);

    // Try exact match: loginPage.page.ts for "login"
    const exactMatch = files.find((f) =>
      f.toLowerCase().startsWith(testIdentifier)
    );
    if (exactMatch) return path.join(this.pagesDir, exactMatch);

    // Try partial match
    for (const file of files) {
      if (
        file.includes(testIdentifier) &&
        file.endsWith(".page.ts") &&
        file !== "example.page.ts"
      ) {
        return path.join(this.pagesDir, file);
      }
    }

    return null;
    } catch {
      return null;
    }
  }

  /**
   * Extracts POM metadata: class name, locator properties, and selectors.
   */
  private loadPOMMetadata(pomFilePath: string): POMMetadata | null {
    // Check cache first
    if (this.pomCache.has(pomFilePath)) {
      return this.pomCache.get(pomFilePath)!;
    }

    try {
      const content = fs.readFileSync(pomFilePath, "utf-8");

      // Extract class name
      const classMatch = content.match(/export\s+default\s+class\s+(\w+)/);
      const className = classMatch?.[1] ?? "Unknown";

      // Extract private locator properties and their selectors
      // Pattern 1: inline - private readonly propertyName: Locator = page.locator("selector")
      const inlineLocatorRegex =
        /private\s+readonly\s+(\w+):\s+Locator\s*=\s*.*?\.locator\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

      // Pattern 2: constructor - this.propertyName = page.locator("selector")
      const constructorLocatorRegex =
        /this\.(\w+)\s*=\s*(?:this\.page|page)\.locator\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

      const locators = new Map<string, string>();
      let match;

      // Try inline pattern first
      while ((match = inlineLocatorRegex.exec(content)) !== null) {
        if (match[1] && match[2]) {
          locators.set(match[1], match[2]); // property → selector
        }
      }

      // Then constructor pattern
      while ((match = constructorLocatorRegex.exec(content)) !== null) {
        if (match[1] && match[2] && match[1] !== "page") {
          locators.set(match[1], match[2]); // property → selector
        }
      }

      // Pattern 3: string constants - private readonly propName = 'some text'
      // These are used as: page.locator('text=' + this.propName)
      const stringConstantRegex =
        /private\s+readonly\s+(\w+)\s*=\s*["'`]([^"'`]+)["'`]\s*;/g;
      while ((match = stringConstantRegex.exec(content)) !== null) {
        if (match[1] && match[2]) {
          // Store with "text=" prefix so matching logic works
          locators.set(match[1], `text=${match[2]}`);
        }
      }

      const metadata: POMMetadata = {
        filePath: pomFilePath,
        className,
        locators,
      };

      this.pomCache.set(pomFilePath, metadata);
      return metadata;
    } catch (error) {
      console.error(`Failed to parse POM file ${pomFilePath}:`, error);
      return null;
    }
  }

  /**
   * Finds the locator property name that matches a broken selector.
   * Uses fuzzy matching and similarity scoring.
   */
  private findMatchingLocatorProperty(
    brokenLocator: string,
    pomMeta: POMMetadata
  ): string | null {
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const [propName, selector] of pomMeta.locators) {
      // Exact match
      if (selector === brokenLocator) {
        return propName;
      }

      // Partial match: check if selectors are similar (same element but different specificity)
      // E.g., "input[name='username']" vs "input[name='username'].first()"
      if (this.isSelectorSimilar(brokenLocator, selector)) {
        const score = this.calculateSimilarity(brokenLocator, selector);
        if (score > bestScore && score > 0) {
          bestScore = score;
          bestMatch = propName;
        }
      }
    }

    // Handle text= locators: brokenLocator = "text=Some message."
    // These are string constants in the POM used as page.locator('text=' + this.prop)
    if (brokenLocator.startsWith("text=")) {
      const textValue = brokenLocator.slice(5); // strip "text="
      for (const [propName, selector] of pomMeta.locators) {
        if (selector === `text=${textValue}`) {
          return propName;
        }
      }
    }

    return bestScore > 60 ? bestMatch : null;
  }

  /**
   * Checks if two selectors likely target the same element.
   */
  private isSelectorSimilar(selector1: string, selector2: string): boolean {
    // Normalize selectors by removing .first(), whitespace, etc.
    const normalize = (s: string) =>
      s.replace(/\.first\(\)/g, "").replace(/\s+/g, "").toLowerCase();

    const norm1 = normalize(selector1);
    const norm2 = normalize(selector2);

    // Check if one is substring of other or they share significant content
    if (norm1 === norm2) return true;
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

    // Check if they match the same element type and key attributes
    const elemMatch1 = selector1.match(/^([a-z]+)/i);
    const elemMatch2 = selector2.match(/^([a-z]+)/i);
    if (elemMatch1 && elemMatch2 && elemMatch1[1] === elemMatch2[1]) {
      // Same element type, check for attribute overlap
      const attrRegex = /\[([^\]]+)\]/g;
      const attrs1 = new Set(selector1.match(attrRegex) || []);
      const attrs2 = new Set(selector2.match(attrRegex) || []);
      return Array.from(attrs1).some((a) => attrs2.has(a));
    }

    return false;
  }

  /**
   * Calculates similarity score (0-100) between two selectors.
   */
  private calculateSimilarity(selector1: string, selector2: string): number {
    const normalize = (s: string) =>
      s.replace(/\.first\(\)/g, "").replace(/\s+/g, "");

    const norm1 = normalize(selector1);
    const norm2 = normalize(selector2);

    // Simple Levenshtein distance-based similarity
    const maxLen = Math.max(norm1.length, norm2.length);
    const distance = this.levenshteinDistance(norm1, norm2);
    const similarity = ((maxLen - distance) / maxLen) * 100;

    return Math.min(100, Math.max(0, similarity));
  }

  /**
   * Calculates Levenshtein distance between two strings.
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const d: number[][] = Array.from({ length: len1 + 1 }, () =>
      Array(len2 + 1).fill(0)
    );

    for (let i = 0; i <= len1; i++) {
      const row = d[i];
      if (row) row[0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      const row = d[0];
      if (row) row[j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const char1 = s1[i - 1];
        const char2 = s2[j - 1];
        const cost = char1 === char2 ? 0 : 1;
        const prev = d[i - 1];
        const curr = d[i];
        if (prev && curr) {
          const prevVal = prev[j];
          const currVal = curr[j - 1];
          const diagVal = prev[j - 1];
          if (prevVal !== undefined && currVal !== undefined && diagVal !== undefined) {
            curr[j] = Math.min(prevVal + 1, currVal + 1, diagVal + cost);
          }
        }
      }
    }

    const result = d[len1];
    const finalValue = result ? result[len2] : undefined;
    return (typeof finalValue === 'number') ? finalValue : 0;
  }
}
