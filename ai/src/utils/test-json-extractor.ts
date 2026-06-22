import { JsonExtractor } from "./JsonExtractor.js";

const response = `
\`\`\`json
{
  "validUsername": "alice.smith",
  "validPassword": "SecurePass2024"
}
\`\`\`
`;

const cleaned = JsonExtractor.extract(response);

console.log(cleaned);

console.log(JSON.parse(cleaned));