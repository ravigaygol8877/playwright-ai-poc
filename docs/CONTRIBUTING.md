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

1. Add a JSON knowledge base file to `pipeline/kb/pages/` (name it `<page-key>.json`)
2. Add requirements for the page to `requirements/requirements.xlsx` (set the `Page` column to your page key)
3. Run `npm run ai:run` — the pipeline auto-generates the KB (if missing), POM, test cases, and specs

The pipeline detects the new page via the knowledge base discovery step. No code changes are needed.

## How to add a new AI module

Each AI module follows a 3-file pattern:

1. **Input interface** — `pipeline/models/YourModuleInput.ts`
2. **Output interface** — `pipeline/models/YourModuleOutput.ts`
3. **Module class** — `pipeline/generators/your-module/YourModule.ts` or `pipeline/analyzers/your-module/YourModule.ts`

The module class takes an `LLMProvider` in its constructor and calls `llmProvider.generateResponse(prompt)`. Parse the response with `AIJsonParser.parse<YourModuleOutput>(response)`.

## How to add a new LLM provider

1. Implement the `LLMProvider` interface — `pipeline/providers/interfaces/LLMProvider.ts`
2. Create your provider class in `pipeline/providers/YourProvider.ts`
3. Register it in `pipeline/providers/ProviderFactory.ts` — add a case in the `create()` method and add it to the fallback chain order

## Running the pipeline

```bash
npm run ai:run                              # uses LLM_PROVIDER from .env
LLM_PROVIDER=github-models npm run ai:run  # override provider
npm run cache:clear                         # wipe .llm-cache/ if prompts changed
```

## Running tests

```bash
npm test              # run all generated Playwright tests
npm run test:unit     # run unit tests (vitest)
npm run typecheck     # TypeScript check — must exit 0 before any PR
```

## Code style

- TypeScript strict mode — no `any`, no implicit `undefined`
- No unused variables or parameters
- No comments that just restate what the code does
- Run `npm run typecheck` to verify before committing

### Running Tests by Tag

```bash
npm run test:smoke       # @smoke — sanity checks, fast feedback
npm run test:regression  # @regression — full suite
npm run test:mobile      # @mobile — mobile viewport tests
```

### Adding a New Page Under Test

1. Add a KB JSON to `pipeline/kb/pages/`
2. Run: `npm run ai:run`
3. The pipeline auto-generates: `support/pages/<pageName>.page.ts`, `tests/UI/` specs
4. Enrich the POM with behavior/assertion methods following `support/pages/example.page.ts`
5. Register the new page in `support/fixtures/visitFixture.ts` if you need a custom fixture

## PR checklist

- [ ] `npm run typecheck` exits with 0 errors
- [ ] `npm run test:unit` — all unit tests pass
- [ ] `.env` is not staged (`git status` should not show it)
- [ ] New modules follow the input/output/class pattern
- [ ] New providers are registered in `pipeline/providers/ProviderFactory.ts`
