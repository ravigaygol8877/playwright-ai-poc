/**
 * Selector Alternatives
 * Generates multiple ways to locate same element
 * Useful when one selector breaks
 * 
 * Strategy: Try different selector types in order of reliability
 */

export class SelectorAlternatives {
  /**
   * Generate alternative selectors for a failed locator
   * Tries: text → role → aria → CSS → XPath
   */
  generateAlternatives(brokenSelector: string): string[] {
    if (!brokenSelector) return [];

    const alternatives: string[] = [];

    // 1. If it's a text selector, try role-based and aria-based
    if (brokenSelector.includes("text=")) {
      const alternatives1 = this.textSelectorAlternatives(brokenSelector);
      alternatives.push(...alternatives1);
    }

    // 2. If it's CSS, try more specific or alternative CSS
    if (brokenSelector.includes("css=") || !brokenSelector.includes("text=")) {
      const alternatives2 = this.cssSelectorAlternatives(brokenSelector);
      alternatives.push(...alternatives2);
    }

    // 3. Always add XPath as fallback
    if (!brokenSelector.includes("xpath=")) {
      const alternatives3 = this.xpathAlternatives(brokenSelector);
      alternatives.push(...alternatives3);
    }

    // 4. Data attribute alternatives
    const alternatives4 = this.dataAttributeAlternatives(brokenSelector);
    alternatives.push(...alternatives4);

    // Remove duplicates and the original (if present)
    const unique = [...new Set(alternatives)].filter(
      s => s !== brokenSelector
    );

    return unique;
  }

  /**
   * Generate text-based alternatives
   */
  private textSelectorAlternatives(selector: string): string[] {
    const alternatives: string[] = [];
    const textMatch = selector.match(/text=["']?([^"']+)["']?/);
    
    if (textMatch && textMatch[1]) {
      const text = textMatch[1];
      
      // Try exact text
      alternatives.push(`locator('text=${text}')`);
      
      // Try case-insensitive regex
      alternatives.push(`locator('text=/${text}/i')`);
      
      // Try partial text with regex
      if (text.length > 5) {
        const partial = text.substring(0, Math.ceil(text.length / 2));
        alternatives.push(`locator('text=/${partial}.*/i')`);
      }
      
      // Try role-based with name
      alternatives.push(`locator('role=button, name=/${text}/i')`);
      alternatives.push(`locator('role=link, name=/${text}/i')`);
      alternatives.push(`locator('role=heading, name=/${text}/i')`);
      
      // Try aria-label
      alternatives.push(`locator('[aria-label*="${text}"]')`);
      alternatives.push(`locator('[aria-label*="${text.toLowerCase()}"]')`);
      
      // Try title attribute
      alternatives.push(`locator('[title*="${text}"]')`);
      alternatives.push(`locator('[title*="${text.toLowerCase()}"]')`);
    }

    return alternatives;
  }

  /**
   * Generate CSS alternatives
   */
  private cssSelectorAlternatives(selector: string): string[] {
    const alternatives: string[] = [];
    
    // Extract class/id from selector
    const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
    const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
    
    if (classMatch) {
      const className = classMatch[1];
      
      // Try with different tag names
      alternatives.push(`locator('button.${className}')`);
      alternatives.push(`locator('div.${className}')`);
      alternatives.push(`locator('span.${className}')`);
      alternatives.push(`locator('a.${className}')`);
      
      // Try with attribute selector
      alternatives.push(`locator('[class*="${className}"]')`);
      alternatives.push(`locator('[class~="${className}"]')`);
    }
    
    if (idMatch) {
      const id = idMatch[1];
      
      // Try exact ID
      alternatives.push(`locator('#${id}')`);
      alternatives.push(`locator('[id="${id}"]')`);
      alternatives.push(`locator('[id*="${id}"]')`);
    }

    return alternatives;
  }

  /**
   * Generate XPath alternatives
   */
  private xpathAlternatives(selector: string): string[] {
    const alternatives: string[] = [];
    
    // Generic XPath patterns
    alternatives.push(`locator('xpath=//*[contains(text(), "")]')`); // Will be filled in
    alternatives.push(`locator('xpath=//*[@role="button"]')`);
    alternatives.push(`locator('xpath=//*[@role="link"]')`);
    alternatives.push(`locator('xpath=//button')`);
    alternatives.push(`locator('xpath=//a')`);

    return alternatives;
  }

  /**
   * Generate data attribute alternatives
   */
  private dataAttributeAlternatives(selector: string): string[] {
    const alternatives: string[] = [];
    
    // Common data attributes
    alternatives.push(`locator('[data-testid]')`);
    alternatives.push(`locator('[data-test]')`);
    alternatives.push(`locator('[data-id]')`);
    alternatives.push(`locator('[data-name]')`);
    alternatives.push(`locator('[data-qa]')`);

    return alternatives;
  }

  /**
   * Order alternatives by reliability (best first)
   */
  orderByReliability(alternatives: string[]): string[] {
    const order: Record<string, number> = {
      "data-testid": 1,
      "data-test": 2,
      "id=": 3,
      "role=": 4,
      "aria-label": 5,
      "text=": 6,
      "class": 7,
      "css=": 8,
      "xpath=": 9,
    };

    return [...alternatives].sort((a, b) => {
      const scoreA = this.scoreReliability(a, order);
      const scoreB = this.scoreReliability(b, order);
      return scoreA - scoreB;
    });
  }

  /**
   * Score reliability of a selector
   */
  private scoreReliability(
    selector: string,
    order: Record<string, number>
  ): number {
    for (const [key, score] of Object.entries(order)) {
      if (selector.includes(key)) {
        return score;
      }
    }
    return 99; // Unknown
  }
}
