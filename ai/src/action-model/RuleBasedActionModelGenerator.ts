/**
 * RuleBasedActionModelGenerator
 *
 * Replaces the LLM-based AIActionModelGenerator for common step patterns.
 * Maps natural-language step descriptions to ActionModel structs using
 * keyword matching — zero LLM calls, zero latency, fully deterministic.
 *
 * Falls back to AIActionModelGenerator for steps it cannot classify.
 */

import type { ActionModel }           from "./ActionModel.js";
import type { AIActionModelGenerator } from "./AIActionModelGenerator.js";

// ── Data key inference ──────────────────────────────────────────────────────

const DATA_KEY_RULES: [RegExp, string][] = [
  [/invalid.*password|wrong.*password|incorrect.*password/i,  "invalidPassword"],
  [/invalid.*user|wrong.*user|incorrect.*user|bad.*user/i,     "invalidUsername"],
  [/valid.*password|correct.*password/i,                       "validPassword"],
  [/valid.*user|correct.*user/i,                               "validUsername"],
  [/locked.*(out|user)|banned.*user|suspend/i,                 "lockedOutUsername"],
  [/over.*max|exceed.*limit|too.*long.*user|max.*length/i,     "overMaxLengthUsername"],
  [/upper.*case.*user|all.*caps.*user/i,                       "uppercaseUsername"],
  [/first.*name/i,                                             "firstName"],
  [/last.*name|surname/i,                                      "lastName"],
  [/invalid.*postal|bad.*postal|wrong.*postal/i,               "invalidPostalCode"],
  [/postal.*code|zip.*code/i,                                  "postalCode"],
  [/password/i,                                                "validPassword"],
  [/username|email.*address|login.*id/i,                       "validUsername"],
  [/first/i,                                                   "firstName"],
  [/last/i,                                                    "lastName"],
];

function inferDataKey(step: string): import("./ActionModel.js").TestDataKey {
  for (const [pattern, key] of DATA_KEY_RULES) {
    if (pattern.test(step)) return key as import("./ActionModel.js").TestDataKey;
  }
  return "validUsername";
}

// ── Target inference ────────────────────────────────────────────────────────

function inferTarget(step: string, availableTargets: string[]): string {
  const s = step.toLowerCase();

  // Score each available target by how well it matches the step text
  const scored = availableTargets.map(t => {
    const tl = t.toLowerCase();
    // Exact substring match gets highest score
    if (s.includes(tl)) return { t, score: 100 };

    // Split camelCase target name into words and match each
    const words = tl
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .split(/\s+/)
      .filter(w => w.length > 2);
    const matched = words.filter(w => s.includes(w)).length;
    return { t, score: matched * 10 };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return best && best.score > 0 ? best.t : (availableTargets[0] ?? "page");
}

// ── Action inference ────────────────────────────────────────────────────────

const NOOP_PATTERNS = [
  /\b(observe|locate|find|see|check|verify|confirm|ensure|make sure|assert|validate|note|look)\b/i,
];

const GOTO_PATTERNS = [
  /\b(navigate|go to|open|launch|visit|load|access)\b/i,
];

const FILL_PATTERNS = [
  /\b(enter|type|input|fill|write|insert|put|provide)\b/i,
];

const CLICK_PATTERNS = [
  /\b(click|press|tap|submit|hit|select|choose|toggle)\b/i,
];

// ── Main classifier ─────────────────────────────────────────────────────────

export class RuleBasedActionModelGenerator {
  constructor(
    private readonly fallback: AIActionModelGenerator,
  ) {}

  async generate(
    step: string,
    availableTargets: string[] = [],
  ): Promise<ActionModel> {
    // 1. Noop — observing/verifying, no UI action
    if (NOOP_PATTERNS.some(p => p.test(step))) {
      return { action: "noop" };
    }

    // 2. Goto — navigation steps
    if (GOTO_PATTERNS.some(p => p.test(step))) {
      return { action: "goto", target: "page" };
    }

    // 3. Fill — entering data into a field
    if (FILL_PATTERNS.some(p => p.test(step))) {
      return {
        action:  "fill",
        target:  inferTarget(step, availableTargets),
        dataKey: inferDataKey(step),
      };
    }

    // 4. Click — button/link interactions
    if (CLICK_PATTERNS.some(p => p.test(step))) {
      return {
        action: "click",
        target: inferTarget(step, availableTargets),
      };
    }

    // 5. Fallback to LLM for steps the rules can't classify
    return this.fallback.generate(step, availableTargets);
  }
}
