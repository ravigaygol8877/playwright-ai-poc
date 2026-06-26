/**
 * RequirementExpander — fills blank TestCases cells using AI.
 *
 * For each Requirement with aiGenerate=true, calls the TestCaseGenerator
 * and returns an expanded requirement with the generated test cases attached.
 *
 * When an ArtifactManifest is supplied, requirements whose content hash
 * matches the manifest are returned from cache — no LLM call is made.
 * Only new or modified requirements trigger LLM expansion.
 */

import type { LLMProvider }   from "../../llm/src/interfaces/LLMProvider.js";
import { TestCaseGenerator }  from "../../ai/src/test-case-generator/TestCaseGenerator.js";
import type { Requirement }   from "./ExcelReader.js";
import type { TestCase }      from "../../ai/src/models/TestCase.js";
import { pMap }               from "../../ai/src/utils/concurrency.js";
import { ArtifactManifest }   from "../../ai/src/utils/ArtifactManifest.js";

export interface ExpandedRequirement extends Requirement {
  generatedTestCases: TestCase[];
}

export class RequirementExpander {
  private generator: TestCaseGenerator;

  constructor(llmProvider: LLMProvider) {
    this.generator = new TestCaseGenerator(llmProvider);
  }

  async expand(
    requirement: Requirement,
    knowledgeBase?: Record<string, unknown>,
  ): Promise<ExpandedRequirement> {
    if (!requirement.aiGenerate) {
      return { ...requirement, generatedTestCases: [] };
    }

    const testCases = await this.generator.generate(
      requirement.description,
      knowledgeBase,
    );

    return { ...requirement, generatedTestCases: testCases };
  }

  async expandAll(
    requirements:  Requirement[],
    knowledgeBases: Map<string, Record<string, unknown>>,
    concurrency = 8,
    manifest?: ArtifactManifest,
  ): Promise<ExpandedRequirement[]> {

    // ── Without manifest: original behaviour ──────────────────────────────────
    if (!manifest) {
      return pMap(
        requirements,
        req => this.expand(req, knowledgeBases.get(req.page)),
        concurrency,
      );
    }

    // ── With manifest: classify, skip unchanged, expand only new/modified ─────
    const { classified, newCount, modifiedCount, unchangedCount, removedIds, byPage } =
      manifest.classifyRequirements(requirements);

    // Change summary banner
    const parts: string[] = [];
    if (newCount > 0)        parts.push(`${newCount} new`);
    if (modifiedCount > 0)   parts.push(`${modifiedCount} modified`);
    if (unchangedCount > 0)  parts.push(`${unchangedCount} unchanged`);
    if (removedIds.length > 0) parts.push(`${removedIds.length} removed`);
    console.log(`\n  📊 Requirements change analysis: ${parts.join(", ") || "none"}`);

    // Per-page breakdown (only when something changed)
    if (newCount > 0 || modifiedCount > 0 || removedIds.length > 0) {
      for (const [page, counts] of byPage) {
        const pageParts: string[] = [];
        if (counts.new > 0)       pageParts.push(`${counts.new} new`);
        if (counts.modified > 0)  pageParts.push(`${counts.modified} modified`);
        if (counts.unchanged > 0) pageParts.push(`${counts.unchanged} unchanged`);
        console.log(`       ${page.padEnd(24)}: ${pageParts.join(", ")}`);
      }
    }

    if (newCount === 0 && modifiedCount === 0) {
      console.log("  ⏭   All requirements unchanged — returning cached test cases");
    }

    // Warn about removed requirements
    for (const id of removedIds) {
      const existing = (manifest as any).data?.requirements?.[id] as
        { feature?: string; scenario?: string; page?: string } | undefined;
      const label = existing
        ? `${existing.page} > ${existing.feature} > ${existing.scenario}`
        : id;
      console.log(`  ⚠   Requirement removed from Excel: ${label}`);
      manifest.removeRequirement(id);
    }

    // Expand new/modified; return cache hits instantly
    const results = await pMap(
      classified,
      async (c): Promise<ExpandedRequirement> => {
        // Non-AI rows pass through unchanged
        if (!c.requirement.aiGenerate) {
          return { ...c.requirement, generatedTestCases: [] };
        }

        // Cache hit — return stored test cases without touching the LLM
        if (c.status === "unchanged" && c.cachedTestCases) {
          return { ...c.requirement, generatedTestCases: c.cachedTestCases };
        }

        // Cache miss — generate via LLM
        const label = c.status === "new" ? "new" : "modified";
        process.stdout.write(
          `  ▸ Expanding (${label}): ${c.requirement.feature} > ${c.requirement.scenario} ... `,
        );
        const kb        = knowledgeBases.get(c.requirement.page);
        const testCases = await this.generator.generate(c.requirement.description, kb);
        console.log(`done (${testCases.length} cases)`);

        manifest.setRequirementTestCases(c.reqId, c.contentHash, c.requirement, testCases);
        manifest.save();

        return { ...c.requirement, generatedTestCases: testCases };
      },
      concurrency,
    );

    // Persist any removals
    manifest.save();

    return results;
  }
}
