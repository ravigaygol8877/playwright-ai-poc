# Onboarding Guide

This repo generates Playwright tests automatically from a requirements spreadsheet using AI. You describe what to test in Excel; the platform writes the code.

## The only file you need to edit

**`requirements/requirements.xlsx`** — add a new row with your page, feature, scenario, and description. The pipeline does the rest.

## Generate everything

```bash
npm run ai:run
```

This produces: knowledge base JSON, Page Object Models, test cases, and Playwright spec files in `tests/e2e/`. Subsequent runs skip anything unchanged — only new or modified requirements trigger LLM calls.

## Run the tests

```bash
npm test
```

## Check results

Open `reports/latest/` — it contains the Playwright HTML report, JSON results, and JUnit XML. Or run:

```bash
npm run test:report
```

to open the HTML report in your browser.

## Knowledge base files

`knowledge-base/` — one JSON file per page. These are auto-generated from the live URL on first run. Edit them manually to add custom selectors or fix AI mistakes.

## When the pipeline fails

| Symptom | Fix |
|---|---|
| `quota/auth exhausted — trying next provider` | Check your API keys in `.env`. Set `LLM_PROVIDER=github-models` and add a `GITHUB_TOKEN`. |
| `ECONNREFUSED` on lm-studio | LM Studio is not running. Start it, or switch to a cloud provider. |
| Pipeline hangs at Step 4 | Rate limit — the fallback chain will switch providers automatically. Wait or switch manually. |
| `tsc` errors after editing `.ts` files | Run `npm run build` to see which file broke, then fix. |

## Where to get help

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup details, how to add a new page, and how to add a new LLM provider.
