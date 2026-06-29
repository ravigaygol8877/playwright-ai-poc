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
  // Invalid/bad variants — check before valid
  [/invalid.*password|wrong.*password|incorrect.*password/i,  "invalidPassword"],
  [/invalid.*user|wrong.*user|incorrect.*user|bad.*user/i,     "invalidUsername"],
  [/invalid.*postal|bad.*postal|wrong.*postal/i,               "invalidPostalCode"],
  // Valid/correct variants
  [/valid.*password|correct.*password/i,                       "validPassword"],
  [/valid.*user|correct.*user/i,                               "validUsername"],
  // Special user states
  [/locked.*(out|user)|banned.*user|suspend/i,                 "lockedOutUsername"],
  [/over.*max|exceed.*limit|too.*long.*user|max.*length/i,     "overMaxLengthUsername"],
  [/upper.*case.*user|all.*caps.*user/i,                       "uppercaseUsername"],
  // Name fields
  [/first.*name/i,                                             "firstName"],
  [/last.*name|surname/i,                                      "lastName"],
  // Financial / transfer fields
  [/transfer.*amount|payment.*amount|amount.*transfer/i,       "amount"],
  [/from.*account/i,                                           "fromAccountId"],
  [/to.*account/i,                                             "toAccountId"],
  [/account.*number/i,                                         "accountNumber"],
  [/\bamount\b/i,                                              "amount"],
  // Bill pay / payee fields
  [/payee.*name|recipient.*name/i,                             "payeeName"],
  [/payee.*street|payee.*address/i,                            "payeeStreet"],
  [/payee.*city/i,                                             "payeeCity"],
  [/payee.*state/i,                                            "payeeState"],
  [/payee.*zip|payee.*postal/i,                                "payeeZip"],
  [/payee.*phone/i,                                            "payeePhone"],
  [/verify.*account/i,                                         "verifyAccount"],
  // Registration fields
  [/phone|telephone/i,                                         "phoneNumber"],
  [/street|address/i,                                          "street"],
  [/city/i,                                                    "city"],
  [/state/i,                                                   "state"],
  [/postal.*code|zip.*code/i,                                  "postalCode"],
  // Generic login fields last
  [/password/i,                                                "validPassword"],
  [/username|email.*address|login.*id/i,                       "validUsername"],
  [/first/i,                                                   "firstName"],
  [/last/i,                                                    "lastName"],
];

function inferDataKey(step: string, fallback: string): string {
  for (const [pattern, key] of DATA_KEY_RULES) {
    if (pattern.test(step)) return key;
  }
  return fallback;
}

// ── Target inference ────────────────────────────────────────────────────────

function inferTarget(step: string, availableTargets: string[]): string {
  const s = step.toLowerCase();

  // Score each available target by how well it matches the step text
  const scored = availableTargets.map(t => {
    const tl = t.toLowerCase();
    // Exact substring match gets highest score
    if (s.includes(tl)) return { t, score: 100 };

    // Split camelCase target name into words and match each.
    // Must split before lowercasing — the regex requires mixed case to detect boundaries.
    const words = t
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase()
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
  /\bwith\b.+\bin\b.+\b(field|input|box|form)\b/i,  // "with X in Y field"
  /\bin\s+\w+\s+(field|input|box)\b/i,               // "in amount field"
];

const CLICK_PATTERNS = [
  /\b(click|press|tap|submit|hit|select|choose|toggle)\b/i,
];

// ── Main classifier ─────────────────────────────────────────────────────────

/**
 * Zero-LLM action classifier using keyword regex rules.
 *
 * Classifies natural-language step descriptions into `goto`, `fill`, `click`, or `noop`
 * ActionModels without any API call — covering roughly 90% of generated steps. For steps
 * that match no rule, it delegates to `AIActionModelGenerator` as a fallback. Target
 * inference uses camelCase decomposition to match step text against available KB selector
 * names; data key inference maps field descriptions to test data keys.
 *
 * @example
 *   const gen = new RuleBasedActionModelGenerator(aiFallback);
 *   const action = await gen.generate("Enter username in email field", ["emailInput", "passwordInput"]);
 *   // => { action: "fill", target: "emailInput", dataKey: "validUsername" }
 */
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
      const target = inferTarget(step, availableTargets);
      return {
        action:  "fill",
        target,
        dataKey: inferDataKey(step, target),
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
