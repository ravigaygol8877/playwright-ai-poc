import { AIJsonParser }
from "./AIJsonParser.js";

const response = `
\`\`\`json
{
  "name": "Ravi"
}
\`\`\`
`;

const result =
  AIJsonParser.parse(response);

console.log(result);