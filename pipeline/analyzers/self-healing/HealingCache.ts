/**
 * HealingCache — selector-level solution cache.
 *
 * Unlike CachingLLMProvider (which caches by full prompt text), this cache stores
 * validated healing solutions keyed by the broken selector + POM file.  On future
 * runs, if the exact same locator breaks in the same POM the solution is returned
 * instantly — zero AI tokens consumed and zero prompt construction needed.
 *
 * Cache location : .healing-cache/  (project root)
 * Invalidation   : bump CACHE_VERSION or call invalidate(key) after a manual fix.
 */

import { createHash } from "crypto";
import fs from "fs";
import path from "path";

const CACHE_VERSION = "v1";
const DEFAULT_TTL_DAYS = 30; // Entries older than this are ignored

export interface HealingCacheEntry {
  originalLocator: string;
  healedLocator: string;
  pomFile: string;
  locatorPropertyName: string | null;
  confidence: number;
  reasoning: string;
  method: string;
  cachedAt: string;
  rerunPassed: boolean | null;
}

export class HealingCache {
  private readonly cacheDir: string;
  private hits = 0;
  private misses = 0;

  constructor(cacheDir = ".healing-cache") {
    this.cacheDir = path.resolve(cacheDir);
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  /**
   * Look up a cached solution for a broken locator.
   * Returns null if not cached or if entry is stale.
   */
  get(brokenLocator: string, pomFile: string): HealingCacheEntry | null {
    const file = this.cacheFile(brokenLocator, pomFile);
    if (!fs.existsSync(file)) {
      this.misses++;
      return null;
    }

    try {
      const entry = JSON.parse(fs.readFileSync(file, "utf-8")) as HealingCacheEntry;

      // Check TTL
      const cachedAt = new Date(entry.cachedAt).getTime();
      const ageMs = Date.now() - cachedAt;
      const ttlMs = DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000;
      if (ageMs > ttlMs) {
        fs.unlinkSync(file); // Remove stale entry
        this.misses++;
        return null;
      }

      this.hits++;
      return entry;
    } catch {
      this.misses++;
      return null;
    }
  }

  /**
   * Store a validated healing solution.
   * Only call this after a successful heal (optionally after re-run confirmed).
   */
  set(entry: HealingCacheEntry): void {
    const file = this.cacheFile(entry.originalLocator, entry.pomFile);
    fs.writeFileSync(file, JSON.stringify(entry, null, 2), "utf-8");
  }

  /**
   * Invalidate a specific cache entry (e.g., after manual override).
   */
  invalidate(brokenLocator: string, pomFile: string): boolean {
    const file = this.cacheFile(brokenLocator, pomFile);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      return true;
    }
    return false;
  }

  /**
   * Update an existing entry with re-run result.
   */
  updateRerunResult(brokenLocator: string, pomFile: string, passed: boolean): void {
    const entry = this.get(brokenLocator, pomFile);
    if (entry) {
      entry.rerunPassed = passed;
      this.set(entry);
    }
  }

  /** Print cache stats — call at end of pipeline run. */
  logStats(): void {
    const total = this.hits + this.misses;
    if (total === 0) return;
    const pct = total > 0 ? Math.round((this.hits / total) * 100) : 0;
    console.log(
      `🗂️  Healing cache: ${this.hits}/${total} hits (${pct}%) — ${this.misses} AI calls saved`
    );
  }

  /** Number of cache hits in this session. */
  get hitCount(): number { return this.hits; }

  /** Number of cache misses in this session. */
  get missCount(): number { return this.misses; }

  private cacheFile(brokenLocator: string, pomFile: string): string {
    const key = createHash("sha256")
      .update(`${CACHE_VERSION}:${pomFile}:${brokenLocator}`)
      .digest("hex");
    return path.join(this.cacheDir, `${key}.json`);
  }
}
