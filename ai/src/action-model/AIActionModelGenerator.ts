import type { LLMProvider }
from "../../../llm/src/interfaces/LLMProvider.js";

import { AIJsonParser }
from "../utils/AIJsonParser.js";

import type { ActionModel }
from "./ActionModel.js";

export class AIActionModelGenerator {

  constructor(
    private llmProvider: LLMProvider
  ) {}

  async generate(
    step: string
  ): Promise<ActionModel> {

    const prompt = `
You are a QA automation expert.

Convert the step into JSON.

Allowed actions:
goto
fill
click

Allowed dataKey values ONLY:

validUsername
invalidUsername
validPassword
invalidPassword
empty

Never invent any other value.
Never return:
maxLengthValidUsername
anyPassword
specialCharacterPassword
usernameWithDifferentCase
SQLInjectionString

Only use one of the allowed values.

Examples:

Step:
Navigate to login page

Output:
{
  "action":"goto",
  "target":"page"
}

Step:
Enter a valid username

Output:
{
  "action":"fill",
  "target":"username",
  "dataKey":"validUsername"
}

Step:
Enter a valid password

Output:
{
  "action":"fill",
  "target":"password",
  "dataKey":"validPassword"
}

Step:
Click login button

Output:
{
  "action":"click",
  "target":"loginButton"
}

Return ONLY JSON.

Step:
${step}
`;

    const response =
      await this.llmProvider.generateResponse(
        prompt
      );

    const cleaned =
      response
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    return AIJsonParser.parse(response);
  }
}