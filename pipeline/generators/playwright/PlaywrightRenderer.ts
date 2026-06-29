import type { ActionModel }
    from "../action-model/ActionModel.js";

import type { KnowledgeBase }
    from "../../models/KnowledgeBase.js";

/** Minimal slice of PomOptions needed by the renderer (avoids circular imports). */
export interface RendererPomOptions {
    methodRegistry?: Record<string, { click?: string; fill?: string }>;
}

function safeLocator(selector: string): string {
  // Normalize attribute values from " to ' so they're safe inside a single-quoted outer string
  const norm = selector.replace(/=\s*"([^"]*)"/g, "='$1'");
  return `page.locator('${norm}')`;
}

/**
 * Converts a single `ActionModel` into a Playwright code string.
 *
 * Supports two output modes:
 * - **Raw mode** (default): emits `await page.locator("selector").fill/click()` using the
 *   selector from the Knowledge Base. Used when no POM is available.
 * - **POM mode** (when `pomFixtureKey` is provided): emits POM method calls when a
 *   `methodRegistry` entry exists for the target, otherwise falls back to direct locator access.
 */
export class PlaywrightRenderer {

  /**
   * Render a single action as a Playwright `await …` statement.
   *
   * @param action        - Classified action model (goto / fill / click / noop).
   * @param knowledgeBase - Page KB; used for selector lookup in raw mode and for the goto URL.
   * @param pomFixtureKey - Optional fixture variable name (e.g. `"aeHomePage"`). When set,
   *                        the renderer emits POM method calls instead of raw locators.
   * @param pomOptions    - Options object; `methodRegistry` is used for method lookup.
   * @returns A single-line (or empty string for noops) Playwright statement.
   */
    renderAction(
        action: ActionModel,
        knowledgeBase: KnowledgeBase,
        pomFixtureKey?: string,
        pomOptions?: RendererPomOptions,
    ): string {

        switch (action.action) {

            case "goto":
                return `await page.goto('${knowledgeBase.url}');`;

            case "fill": {
                if (!action.target) return "";
                if (!action.dataKey) return "";
                const value = action.dataKey === "empty"
                    ? "''"
                    : `testData.${action.dataKey}`;
                if (pomFixtureKey) {
                    const method = pomOptions?.methodRegistry?.[action.target]?.fill;
                    if (method) {
                        return `await ${pomFixtureKey}.${method}(${value});`;
                    }
                    // fallback — direct access (will only work if locator is public/protected)
                    const selector = knowledgeBase.selectors[action.target];
                    if (!selector) return "";
                    return `await ${safeLocator(selector)}.fill(${value});`;
                }
                const selector = knowledgeBase.selectors[action.target];
                if (!selector) return "";
                return `await ${safeLocator(selector)}.fill(${value});`;
            }

            case "click": {
                if (!action.target) return "";
                if (pomFixtureKey) {
                    const method = pomOptions?.methodRegistry?.[action.target]?.click;
                    if (method) {
                        return `await ${pomFixtureKey}.${method}();`;
                    }
                    // fallback — direct access (will only work if locator is public/protected)
                    return `await ${pomFixtureKey}.${action.target}.click();`;
                }
                const selector = knowledgeBase.selectors[action.target];
                if (!selector) return "";
                return `await ${safeLocator(selector)}.click();`;
            }

            default:
                // Steps that don't map to goto/fill/click are emitted as assertions
                // by AssertionGenerator and handled separately.
                return "";
        }
    }
}