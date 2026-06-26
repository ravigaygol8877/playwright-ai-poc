/**
 * ArtifactManifest — central state store for all AI-generated artifacts.
 *
 * Persisted in ai-metadata/artifacts.json (committed to git).
 * Separate from .llm-cache/ (raw LLM responses, gitignored).
 *
 * Responsibilities:
 *   - Track per-requirement content hashes → detect new / modified / unchanged / removed
 *   - Store generated test cases inline → return without LLM on unchanged requirements
 *   - Track KB / POM hashes per page → cascade invalidation when source changes
 *   - Track generated spec file paths per page
 */

import { createHash } from "crypto";
import fs             from "fs";
import path           from "path";

import type { TestCase }    from "../models/TestCase.js";
import type { Requirement } from "../../../src/requirements/ExcelReader.js";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RequirementEntry {
  contentHash:   string;     // sha256(description+scenario+feature) — changes when content changes
  page:          string;
  feature:       string;
  scenario:      string;
  descPreview:   string;     // first 100 chars of description (debugging aid)
  testCaseCount: number;
  testCasesHash: string;     // sha256(JSON.stringify(testCases))
  testCases:     TestCase[]; // stored inline — returned without LLM call on cache hit
  generatedAt:   string;
}

interface PageEntry {
  url:           string;     // URL at time of last KB generation — change forces KB regen
  kbHash:        string;     // sha256 of KB file when POM was last generated
  specFiles:     string[];   // paths of generated spec files
  updatedAt:     string;
}

interface ManifestData {
  version:      string;
  requirements: Record<string, RequirementEntry>;
  pages:        Record<string, PageEntry>;
}

// ── Classification result ──────────────────────────────────────────────────────

export type RequirementStatus = "new" | "modified" | "unchanged" | "removed";

export interface ClassifiedRequirement {
  requirement:      Requirement;
  reqId:            string;
  contentHash:      string;
  status:           RequirementStatus;
  cachedTestCases?: TestCase[];  // populated only when status === "unchanged"
}

export interface ClassificationSummary {
  classified:   ClassifiedRequirement[];
  newCount:     number;
  modifiedCount: number;
  unchangedCount: number;
  removedIds:   string[];
  byPage:       Map<string, { new: number; modified: number; unchanged: number }>;
}

// ── Main class ─────────────────────────────────────────────────────────────────

const MANIFEST_VERSION = "1";

/**
 * Central state store for all AI-generated artifacts, persisted in `ai-metadata/artifacts.json`.
 *
 * Tracks per-requirement content hashes so unchanged requirements return cached test cases
 * without any LLM call. Tracks per-page KB and POM hashes to drive cascade invalidation:
 * a URL change forces KB regeneration; a KB file change forces POM regeneration. Committed
 * to git (unlike `.llm-cache/`) so the team shares the same baseline across machines.
 *
 * @example
 *   const manifest = new ArtifactManifest();
 *   const { classified, newCount } = manifest.classifyRequirements(requirements);
 *   // only newCount requirements will trigger LLM calls
 */
export class ArtifactManifest {
  private data:  ManifestData;
  private dirty  = false;
  private readonly manifestPath: string;

  constructor(manifestPath = path.join("ai-metadata", "artifacts.json")) {
    this.manifestPath = manifestPath;
    this.data = this.load();
  }

  // ── Static helpers ─────────────────────────────────────────────────────────

  /**
   * Stable requirement identifier — survives description edits.
   * Changes only when page + feature + scenario changes (i.e. the requirement is replaced).
   */
  static reqId(req: Requirement): string {
    return createHash("sha256")
      .update(`${req.page}:${req.feature}:${req.scenario}`)
      .digest("hex")
      .slice(0, 16);
  }

  /** Hash that changes whenever requirement content changes. */
  static contentHash(req: Requirement): string {
    return createHash("sha256")
      .update(`${req.description}::${req.scenario}::${req.feature}`)
      .digest("hex");
  }

  /** sha256 of a file on disk; returns "" if file is missing. */
  static fileHash(filePath: string): string {
    try {
      return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
    } catch {
      return "";
    }
  }

  // ── Classification ─────────────────────────────────────────────────────────

  /**
   * Compare current Excel requirements against the manifest.
   * Returns a classification of every aiGenerate=true requirement plus
   * a list of reqIds that were in the manifest but are no longer in Excel.
   */
  classifyRequirements(requirements: Requirement[]): ClassificationSummary {
    const classified: ClassifiedRequirement[] = [];
    const seenIds    = new Set<string>();
    const byPage     = new Map<string, { new: number; modified: number; unchanged: number }>();

    const pageCounter = (pageKey: string) => {
      if (!byPage.has(pageKey)) byPage.set(pageKey, { new: 0, modified: 0, unchanged: 0 });
      return byPage.get(pageKey)!;
    };

    for (const req of requirements) {
      if (!req.aiGenerate) continue;

      const reqId       = ArtifactManifest.reqId(req);
      const contentHash = ArtifactManifest.contentHash(req);
      seenIds.add(reqId);

      const existing = this.data.requirements[reqId];

      if (!existing) {
        classified.push({ requirement: req, reqId, contentHash, status: "new" });
        pageCounter(req.page).new++;
      } else if (existing.contentHash !== contentHash) {
        classified.push({ requirement: req, reqId, contentHash, status: "modified" });
        pageCounter(req.page).modified++;
      } else {
        classified.push({
          requirement: req,
          reqId,
          contentHash,
          status: "unchanged",
          cachedTestCases: existing.testCases,
        });
        pageCounter(req.page).unchanged++;
      }
    }

    // Find requirements removed from Excel (present in manifest, absent from current run)
    const removedIds: string[] = [];
    for (const id of Object.keys(this.data.requirements)) {
      if (!seenIds.has(id)) removedIds.push(id);
    }

    return {
      classified,
      newCount:       classified.filter(c => c.status === "new").length,
      modifiedCount:  classified.filter(c => c.status === "modified").length,
      unchangedCount: classified.filter(c => c.status === "unchanged").length,
      removedIds,
      byPage,
    };
  }

  // ── Page-level change detection ────────────────────────────────────────────

  /** True when the URL in Excel differs from what was used to generate the KB. */
  isUrlChanged(pageKey: string, currentUrl: string): boolean {
    const stored = this.data.pages[pageKey];
    return !stored || stored.url !== currentUrl;
  }

  /**
   * True when the KB file on disk has changed since the POM was last generated.
   * Triggers POM regeneration even when the .ts file already exists.
   */
  isKbChangedSincePomGen(pageKey: string, kbFile: string): boolean {
    const stored = this.data.pages[pageKey];
    if (!stored || !stored.kbHash) return true;
    return ArtifactManifest.fileHash(kbFile) !== stored.kbHash;
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  /** Call after KB was generated OR verified (file existed and URL unchanged). */
  setKbVerified(pageKey: string, url: string, kbFile: string): void {
    const entry = this.pageEntry(pageKey, url);
    entry.url   = url;
    this.data.pages[pageKey] = entry;
    // kbHash is updated when POM is generated (not here) so that
    // isKbChangedSincePomGen() correctly detects manual edits between runs.
    this.dirty = true;
  }

  /** Call after POM was successfully generated or regenerated. */
  setPomGenerated(pageKey: string, url: string, kbFile: string): void {
    const entry    = this.pageEntry(pageKey, url);
    entry.url      = url;
    entry.kbHash   = ArtifactManifest.fileHash(kbFile);
    entry.updatedAt = new Date().toISOString();
    this.data.pages[pageKey] = entry;
    this.dirty = true;
  }

  /** Call after test cases were generated for a requirement. */
  setRequirementTestCases(
    reqId:       string,
    contentHash: string,
    req:         Requirement,
    testCases:   TestCase[],
  ): void {
    this.data.requirements[reqId] = {
      contentHash,
      page:          req.page,
      feature:       req.feature,
      scenario:      req.scenario,
      descPreview:   req.description.slice(0, 100),
      testCaseCount: testCases.length,
      testCasesHash: createHash("sha256").update(JSON.stringify(testCases)).digest("hex"),
      testCases,
      generatedAt:   new Date().toISOString(),
    };
    this.dirty = true;
  }

  /** Call after spec files were generated for a page. */
  setPageSpecFiles(pageKey: string, url: string, specFiles: string[]): void {
    const entry     = this.pageEntry(pageKey, url);
    entry.specFiles = specFiles;
    entry.updatedAt = new Date().toISOString();
    this.data.pages[pageKey] = entry;
    this.dirty = true;
  }

  /** Remove a requirement that no longer exists in Excel. */
  removeRequirement(reqId: string): void {
    delete this.data.requirements[reqId];
    this.dirty = true;
  }

  /** Return the stored entry for a requirement, or undefined if not present. */
  getRequirementEntry(reqId: string): RequirementEntry | undefined {
    return this.data.requirements[reqId];
  }

  // ── Persist ────────────────────────────────────────────────────────────────

  save(): void {
    if (!this.dirty) return;
    fs.mkdirSync(path.dirname(this.manifestPath), { recursive: true });
    fs.writeFileSync(this.manifestPath, JSON.stringify(this.data, null, 2));
    this.dirty = false;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private load(): ManifestData {
    try {
      const raw = JSON.parse(fs.readFileSync(this.manifestPath, "utf-8")) as ManifestData;
      return {
        version:      raw.version      ?? MANIFEST_VERSION,
        requirements: raw.requirements ?? {},
        pages:        raw.pages        ?? {},
      };
    } catch {
      return { version: MANIFEST_VERSION, requirements: {}, pages: {} };
    }
  }

  private pageEntry(pageKey: string, url: string): PageEntry {
    return this.data.pages[pageKey] ?? {
      url,
      kbHash:    "",
      specFiles: [],
      updatedAt: new Date().toISOString(),
    };
  }
}
