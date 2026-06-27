import type { LLMProvider }
from "../../providers/interfaces/LLMProvider.js";

import { AIJsonParser }
from "../../utils/AIJsonParser.js";

import type { ActionModel }
from "./ActionModel.js";

export class AIActionModelGenerator {

  constructor(
    private llmProvider: LLMProvider
  ) {}

  async generate(
    step: string,
    availableTargets?: string[]
  ): Promise<ActionModel> {

    const targetsSection = availableTargets && availableTargets.length > 0
      ? `\nAvailable target names — use EXACTLY one of these for the "target" field:\n${availableTargets.join("\n")}\n`
      : "";

    const prompt = `
You are a QA automation expert.

Convert the step into JSON.

Allowed actions:
goto
fill
click
noop
${targetsSection}
IMPORTANT: If the step is about OBSERVING, LOCATING, FINDING, VERIFYING, CHECKING, or CONFIRMING something without performing an action (e.g. "locate", "find", "observe", "see", "check", "verify", "confirm", "ensure", "make sure"), return:
{"action":"noop"}

Allowed dataKey values ONLY:

validUsername
invalidUsername
validPassword
invalidPassword
overMaxLengthUsername
uppercaseUsername
firstName
lastName
postalCode
invalidPostalCode
lockedOutUsername
empty

Never invent any other value.
Never return:
maxLengthValidUsername
anyPassword
specialCharacterPassword
usernameWithDifferentCase
SQLInjectionString
zipCode
zip
name

Step:
Enter username as locked_out_user

Output:
{
  "action":"fill",
  "target":"username",
  "dataKey":"lockedOutUsername"
}

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

Step:
Enter the first name

Output:
{
  "action":"fill",
  "target":"firstName",
  "dataKey":"firstName"
}

Step:
Enter the last name

Output:
{
  "action":"fill",
  "target":"lastName",
  "dataKey":"lastName"
}

Step:
Enter the postal code

Output:
{
  "action":"fill",
  "target":"postalCode",
  "dataKey":"postalCode"
}

Step:
Click the continue button

Output:
{
  "action":"click",
  "target":"continueButton"
}

Step:
Click the finish button

Output:
{
  "action":"click",
  "target":"finishButton"
}

Step:
Click the checkout button

Output:
{
  "action":"click",
  "target":"checkoutButton"
}

Return ONLY JSON.

Step:
${step}
`;

    const response =
      await this.llmProvider.generateResponse(
        prompt
      );

    return AIJsonParser.parse(response);
  }
}