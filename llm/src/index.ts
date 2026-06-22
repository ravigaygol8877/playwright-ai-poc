import { MockLLMProvider } from "./providers/MockLLMProvider.js";

async function main() {
  const provider = new MockLLMProvider();

  const response = await provider.generateResponse(
    "Generate login test cases"
  );

  console.log(response);
}

main();