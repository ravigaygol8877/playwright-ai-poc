# Contributing

## Prerequisites

- Node.js 20+
- npm 10+
- LM Studio (optional — only needed for local LLM usage)
- An LLM API key for at least one provider: Google Gemini, GitHub Models, or OpenRouter

## Setup

```bash
git clone <repo-url>
cd playwright-ai-poc
npm install
cp .env.example .env
# Fill in your API keys in .env
```

## How to add a new target page

1. Add a JSON knowledge base file to `knowledge-base/` (name it `<page-key>.json`)
2. Add requirements for the page to `requirements/requirements.xlsx` (set the `Page` column to your page key)
3. Run `npm run ai:run` — the pipeline auto-generates the KB (if missing), POM, test cases, and specs

The pipeline detects the new page via the knowledge base discovery step. No code changes are needed.

## How to add a new AI module

Each AI module follows a 3-file pattern:

1. **Input interface** — `ai/src/models/YourModuleInput.ts`
2. **Output interface** — `ai/src/models/YourModuleOutput.ts`
3. **Module class** — `ai/src/your-module/YourModule.ts`

The module class takes an `LLMProvider` in its constructor and calls `llmProvider.generateResponse(prompt)`. Parse the response with `AIJsonParser.parse<YourModuleOutput>(response)`.

## How to add a new LLM provider

1. Implement the `LLMProvider` interface in `llm/src/interfaces/LLMProvider.ts`
2. Create your provider class in `llm/src/providers/YourProvider.ts`
3. Register it in `llm/src/ProviderFactory.ts` — add a case in the `create()` method and add it to the fallback chain order

## Running the pipeline

```bash
npm run ai:run                              # uses LLM_PROVIDER from .env
LLM_PROVIDER=github-models npm run ai:run  # override provider
npm run cache:clear                         # wipe .llm-cache/ if prompts changed
```

## Running tests

```bash
npm test              # run all generated Playwright tests
npm run test:headed   # run with browser visible
npm run test:report   # open the HTML report after a run
```

## Opening the demo

Open `demo-presentation.html` directly in any browser. No build step required.

## Code style

- TypeScript strict mode — no `any`, no implicit `undefined`
- No unused variables or parameters
- No comments that just restate what the code does
- Run `npm run build` (or `tsc --noEmit`) to verify before committing

### Running Tests by Tag
Use Playwright's built-in --grep flag to run tagged subsets:
```bash
npm run test:smoke       # @smoke — sanity checks, fast feedback
npm run test:regression  # @regression — full suite
npm run test:mobile      # @mobile — mobile viewport tests
```

### Moving the CI Workflow
The ci-workflow.yml is at the project root due to a permissions issue.
To move it to .github/workflows/ (required for GitHub Actions):
```bash
sudo chown -R $USER .github/
mv ci-workflow.yml .github/workflows/ci.yml
```

### Adding a New Page Under Test
1. Add a KB JSON to knowledge-base/
2. Run: `npm run ai:run`
3. The pipeline auto-generates: support/pages/PageName.ts, tests/e2e/ specs
4. Enrich the POM with behavior/assertion methods following support/pages/AeHomePage.ts
5. Update support/fixtures/visitFixture.ts if you add a new fixture type

## PR checklist

- [ ] `tsc --noEmit` exits with 0 errors
- [ ] `.env` is not staged (`git status` should not show it)
- [ ] New modules follow the 3-file input/output/class pattern
- [ ] New providers are registered in `ProviderFactory.ts`
- [ ] `ai-metadata/artifacts.json` reflects any new generated output
