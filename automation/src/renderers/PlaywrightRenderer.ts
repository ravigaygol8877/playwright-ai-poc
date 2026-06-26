import type { ActionModel }
    from "../../../ai/src/action-model/ActionModel.js";

export class PlaywrightRenderer {

    renderAction(
        action: ActionModel,
        knowledgeBase: any
    ): string {

        switch (action.action) {

            case "goto":
                return `await page.goto('${knowledgeBase.url}');`;

            case "fill": {
                if (!action.target) return "";
                const selector = knowledgeBase.selectors[action.target] as string | undefined;
                if (!selector) return "";
                const value = action.dataKey === "empty"
                    ? "''"
                    : `testData.${action.dataKey}`;
                return `await page.locator("${selector}").fill(${value});`;
            }

            case "click": {
                if (!action.target) return "";
                const selector = knowledgeBase.selectors[action.target] as string | undefined;
                if (!selector) return "";
                return `await page.locator("${selector}").click();`;
            }

            default:
                // Step could not be mapped to goto/fill/click — skip it silently.
                // Assertion steps are handled by AssertionGenerator and emitted separately.
                // Phase 4 (auto-POM generation) will extend this to emit pom.assertions.x() calls
                // once the generated spec is wired to a POM fixture instead of raw page.
                return "";
        }
    }
}