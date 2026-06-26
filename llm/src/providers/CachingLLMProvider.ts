/**
 * CachingLLMProvider — transparent write-through cache for any LLMProvider.
 *
 * Every prompt is hashed (SHA-256 of cacheVersion + prompt). On a cache hit the
 * response is returned instantly with zero API calls. On a miss the inner provider
 * is called and the result is written to disk before returning.
 *
 * Cache location : .llm-cache/  (project root)
 * Cache version  : bump CACHE_VERSION when prompts change significantly so stale
 *                  entries are automatically ignored.
 *
 * Disable cache  : set LLM_CACHE=false in env (useful for debugging)
 */

import { createHash }    from "crypto";
import fs                from "fs";
import path              from "path";
import type { LLMProvider } from "../interfaces/LLMProvider.js";

const CACHE_VERSION = "v1";

interface CacheEntry {
  response:  string;
  preview:   string;   // first 120 chars of prompt — for debugging
  cachedAt:  string;
}

export class CachingLLMProvider implements LLMProvider {
  private readonly cacheDir: string;
  private hits   = 0;
  private misses = 0;

  constructor(
    private readonly inner: LLMProvider,
    cacheDir = ".llm-cache",
  ) {
    this.cacheDir = path.resolve(cacheDir);
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  async generateResponse(prompt: string): Promise<string> {
    const file = this.cacheFile(prompt);

    if (fs.existsSync(file)) {
      this.hits++;
      const entry = JSON.parse(fs.readFileSync(file, "utf-8")) as CacheEntry;
      return entry.response;
    }

    this.misses++;
    const response = await this.inner.generateResponse(prompt);

    const entry: CacheEntry = {
      response,
      preview:  prompt.slice(0, 120).replace(/\n/g, " "),
      cachedAt: new Date().toISOString(),
    };
    fs.writeFileSync(file, JSON.stringify(entry, null, 2));

    return response;
  }

  /** Print a summary line to stdout — call at end of pipeline run. */
  logStats(): void {
    const total = this.hits + this.misses;
    if (total === 0) return;
    const pct = total > 0 ? Math.round((this.hits / total) * 100) : 0;
    console.log(
      `  📦 LLM cache: ${this.hits} hits / ${this.misses} misses (${pct}% cached) — ` +
      `saved ~${this.hits * 3}s of API time`,
    );
  }

  private cacheFile(prompt: string): string {
    const hash = createHash("sha256")
      .update(`${CACHE_VERSION}:${prompt}`)
      .digest("hex");
    return path.join(this.cacheDir, `${hash}.json`);
  }
}
