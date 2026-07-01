# Getting Started

From a fresh clone to your first AI-generated test run in under 10 minutes.

---

## Prerequisites

- **Node.js 20+** — `node --version`
- **Git**
- One of the following LLM provider credentials:
  - Google Gemini API key (free tier works) — recommended
  - GitHub Personal Access Token (for GitHub Models / GPT-4.1)
  - OpenRouter API key

---

## Step 1 — Clone and Install

```bash
git clone https://github.com/ravigaygol8877/playwright-ai-poc.git
cd playwright-ai-poc
npm install
```

---

## Step 2 — Configure Your API Key

```bash
cp .env.example .env
```

Open `.env` and fill in at least one provider key:

```bash
# Recommended: Gemini (free tier available)
LLM_PROVIDER=gemini
GOOGLE_API_KEY=your-key-here

# Or GitHub Models (free with a PAT)
# LLM_PROVIDER=github-models
# GITHUB_TOKEN=your-github-token-here
```

Save the file. The key is never committed — `.env` is in `.gitignore`.

---

## Step 3 — Install Playwright Browsers

```bash
npx playwright install
```

This downloads Chromium, Firefox, and WebKit (one-time, ~300 MB).

---

## Step 4 — Explore the Example Requirements

Open `requirements/requirements.xlsx`. It contains pre-filled rows for the [ParaBank](https://parabank.parasoft.com) banking demo — a free public test site. No edits needed for a first run.

---

## Step 5 — Run the Full Pipeline

```bash
npm run ai:run
```

The pipeline does 7 things automatically:

1. Reads `requirements/requirements.xlsx`
2. Generates or updates Page Object Models in `support/pages/`
3. Expands blank "test cases" columns using AI
4. Writes `.spec.ts` files to `tests/UI/`
5. Runs Playwright tests
6. Generates a Playwright HTML report
7. Opens the report in your browser

On a first run with no cache expect 12–18 minutes depending on your provider and network. Subsequent runs are fast (2–4 min) because LLM responses are cached in `.llm-cache/`.

---

## Step 6 — View the Results

- **Playwright HTML report:** `npm run report:latest`
- **Raw spec files:** browse `tests/UI/`

---

## Common First-Run Issues

| Error | Fix |
|---|---|
| `GOOGLE_API_KEY is required` | Add your key to `.env` |
| `Cannot find module '...'` | Run `npm install` again |
| `playwright: command not found` | Run `npx playwright install` |
| `quota exhausted — trying next` | Free tier limit hit; wait a minute or switch `LLM_PROVIDER` |
| Tests fail with `locator not found` | The target site changed; run `npm run kb:generate` to refresh selectors |

---

## Next Steps

| What | Command |
|---|---|
| Add requirements for your own app | Edit `requirements/requirements.xlsx` |
| Add a new page to test | See [ONBOARDING.md](ONBOARDING.md) |
| See every available command | See [COMMANDS.md](COMMANDS.md) |
| Run only smoke tests | `npm run test:smoke` |
| Reset and start clean | `npm run project:reset` |
