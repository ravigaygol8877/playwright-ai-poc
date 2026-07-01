/**
 * POM Registry - Fast lookup for POM files
 * Solves: Brittle pattern matching in POMIdentifier
 * Enables: O(1) lookups instead of O(n) regex
 * 
 * Features:
 * - Scans support/pages/ directory once
 * - Builds name → filepath map with aliases
 * - Semantic and fuzzy matching
 * - Cached for reuse
 */

import fs from "fs";
import path from "path";

export interface POMEntry {
  name: string;              // "BillpayPage"
  filePath: string;          // "support/pages/billpayPage.page.ts"
  className: string;         // "BillpayPage"
  aliases: string[];         // ["billpay", "payment", "bill"]
  keywords: string[];        // ["bill", "pay", "page"]
  selectors: string[];       // Locator property names
}

export class POMRegistry {
  private registry: Map<string, POMEntry> = new Map();
  private initialized = false;
  private static instance: POMRegistry | null = null;

  /**
   * Initialize registry by scanning POM files
   * Should be called once at startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const pagesDir = "support/pages";
    
    // Check if directory exists
    if (!fs.existsSync(pagesDir)) {
      console.warn(`POM pages directory not found: ${pagesDir}`);
      this.initialized = true;
      return;
    }

    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith(".page.ts"));

    for (const file of files) {
      const entry = this.parsePOMFile(file, path.join(pagesDir, file));
      if (entry) {
        // Register by all identifiers (case-insensitive)
        this.registry.set(entry.name.toLowerCase(), entry);
        
        for (const alias of entry.aliases) {
          this.registry.set(alias.toLowerCase(), entry);
        }
        
        for (const keyword of entry.keywords) {
          this.registry.set(keyword.toLowerCase(), entry);
        }
      }
    }

    this.initialized = true;
    console.log(`POM Registry initialized with ${new Set(this.registry.values()).size} POM files`);
  }

  /**
   * Parse a POM file to extract metadata
   */
  private parsePOMFile(fileName: string, filePath: string): POMEntry | null {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const name = fileName.replace(".page.ts", "");

      // Extract class name
      const classMatch = content.match(/export\s+(?:default\s+)?class\s+(\w+)/);
      const className = classMatch?.[1] || name;

      // Extract locator property names (these are selectors maintained)
      const selectors: string[] = [];
      const locatorMatches = content.matchAll(
        /(?:private|readonly)\s+(\w+)\s*(?::\s*Locator)?\s*=\s*this\.page\.locator/g
      );
      for (const match of locatorMatches) {
        if (match[1]) {
          selectors.push(match[1]);
        }
      }

      // Build aliases from the class name
      const aliases = this.generateAliases(className);

      // Build keywords
      const keywords = this.extractKeywords(className, selectors);

      return {
        name: className,
        filePath: filePath,
        className,
        aliases,
        keywords,
        selectors,
      };
    } catch (error) {
      console.warn(`Failed to parse POM file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Generate alternative names for a POM
   * BillpayPage → [billpay, bill, pay, page, payment]
   */
  private generateAliases(name: string): string[] {
    const aliases = [name.toLowerCase()];

    // Remove "Page" suffix
    if (name.endsWith("Page")) {
      const base = name.slice(0, -4);
      aliases.push(base.toLowerCase());
    }

    // Convert camelCase to words
    const words = name
      .replace(/([A-Z])/g, " $1")
      .toLowerCase()
      .trim()
      .split(/\s+/);
    aliases.push(...words);

    return [...new Set(aliases)]; // Remove duplicates
  }

  /**
   * Extract semantic keywords from class name and selectors
   */
  private extractKeywords(name: string, selectors: string[]): string[] {
    const keywords = new Set<string>();

    // From class name: BillpayPage → bill, pay, page
    const words = name
      .replace(/([A-Z])/g, " $1")
      .toLowerCase()
      .trim()
      .split(/\s+/);
    words.forEach(w => keywords.add(w));

    // From selector names: loginButton → login, button
    for (const sel of selectors) {
      const parts = sel.split(/(?=[A-Z])/).map(p => p.toLowerCase());
      parts.forEach(p => keywords.add(p));
    }

    return Array.from(keywords);
  }

  /**
   * Look up POM by any identifier
   * Tries direct match, then keyword match, then fuzzy match
   */
  lookup(testName: string): POMEntry | null {
    if (!this.initialized) {
      console.warn("POM Registry not initialized");
      return null;
    }

    // Direct lookup (case-insensitive)
    const lower = testName.toLowerCase();
    if (this.registry.has(lower)) {
      return this.registry.get(lower) || null;
    }

    // Extract keywords from test name: "[billPay]" → ["billpay", "pay"]
    const testKeywords = testName
      .replace(/[\[\]@]/g, "")
      .split(/\s+|[-_]/i)
      .map(k => k.toLowerCase())
      .filter(k => k.length > 2);

    if (testKeywords.length === 0) {
      return null;
    }

    // Try to find best match
    let bestMatch: POMEntry | null = null;
    let bestScore = 0;

    for (const [key, entry] of this.registry.entries()) {
      let score = 0;

      // Exact match: highest priority
      if (testKeywords.some(k => key === k)) score += 100;

      // Keyword match: high priority
      if (testKeywords.some(k => entry.keywords.includes(k))) score += 50;

      // Alias match: medium priority
      if (testKeywords.some(k => entry.aliases.includes(k))) score += 25;

      // Partial match: low priority
      if (testKeywords.some(k => key.includes(k) || k.includes(key))) score += 5;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    return bestScore > 0 ? bestMatch : null;
  }

  /**
   * Get all entries (deduplicated)
   */
  getAll(): POMEntry[] {
    return Array.from(new Set(this.registry.values()));
  }

  /**
   * Export registry for debugging
   */
  export(): Record<string, POMEntry> {
    const result: Record<string, POMEntry> = {};
    const seen = new Set<string>();

    for (const entry of this.getAll()) {
      if (!seen.has(entry.name)) {
        result[entry.name] = entry;
        seen.add(entry.name);
      }
    }

    return result;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): POMRegistry {
    if (!POMRegistry.instance) {
      POMRegistry.instance = new POMRegistry();
    }
    return POMRegistry.instance;
  }
}

/**
 * Global function to get registry
 */
export async function getPOMRegistry(): Promise<POMRegistry> {
  const registry = POMRegistry.getInstance();
  await registry.initialize();
  return registry;
}
