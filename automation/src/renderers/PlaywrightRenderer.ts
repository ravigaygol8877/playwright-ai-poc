import type { ActionModel }
    from "../../../ai/src/action-model/ActionModel.js";

export class PlaywrightRenderer {

    renderAction(
        action: ActionModel,
        knowledgeBase: any
    ): string {

        switch (action.action) {

            case "goto":
                return `
await page.goto(
  '${knowledgeBase.url}'
);
`;

            case "fill": { 

                if (action.dataKey === "empty") {
                    return `
await page.fill(
  '${knowledgeBase.selectors[action.target]}',
  ''
);
`;
                }

                return `
await page.fill(
  '${knowledgeBase.selectors[action.target]}',
  testData.${action.dataKey}
);
`;
            }

            case "click":

                return `
await page.click(
  '${knowledgeBase.selectors[action.target]}'
);
`;

            default:
                throw new Error(
                    `Unsupported action: ${action.action}`
                );
        }
    }
}