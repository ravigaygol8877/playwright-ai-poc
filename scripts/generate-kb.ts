/**
 * Knowledge Base Generator runner
 *
 * Opens a real URL with a headless Chromium browser, captures the live DOM,
 * and asks the AI to produce a knowledge-base JSON file automatically.
 *
 * Usage:
 *   npm run kb:generate <url> <page-name>
 *
 * Or with environment override:
 *   ENVIRONMENT=qa npm run kb:generate <url> <page-name>
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { ProviderFactory }   from "../pipeline/providers/ProviderFactory.js";
import { KnowledgeBaseGenerator } from "../pipeline/kb/KnowledgeBaseGenerator.js";

// ─── Load environment-specific .env (e.g. config/environments/qa.env) ─────────

function loadEnvFile(): void {
  const env     = process.env.ENVIRONMENT ?? "development";
  const envFile = path.join("config", "environments", `${env}.env`);
  if (!fs.existsSync(envFile)) return;

  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) continue;
    const key   = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
  console.log(`  Environment : ${env}  (${envFile})`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadEnvFile();


  const url      = process.argv[2];
  const pageName = process.argv[3];

  if (!url || !pageName) {
    console.error("Usage: npm run kb:generate <url> <page-name>");
    console.error("Example: npm run kb:generate https://yourapp.com/login login-page");
    process.exit(1);
  }

  // Pick up HTTP basic auth credentials from environment if present (QA env)
  const httpUsername = process.env.HTTP_USERNAME;
  const httpPassword = process.env.HTTP_PASSWORD;
  const httpCredentials = httpUsername && httpPassword
    ? { username: httpUsername, password: httpPassword }
    : undefined;

  const llmProvider = ProviderFactory.create();
  const generator   = new KnowledgeBaseGenerator(llmProvider);

  console.log("═══════════════════════════════════════════════════");
  console.log("  Knowledge Base Generator — AI Test Platform");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  URL       : ${url}`);
  console.log(`  Page name : ${pageName}`);
  if (httpCredentials) console.log(`  Auth      : HTTP basic (${httpCredentials.username})`);
  console.log("");

  const kb = await generator.generate(url, pageName, httpCredentials);

  console.log("\n  Generated knowledge base:");
  console.log(JSON.stringify(kb, null, 2));

  console.log(`\n  ✅ File saved → pipeline/kb/pages/${pageName}.json`);
  console.log("  Review selectors, then run: npm run generate:from-excel");
}

main().catch(console.error);
