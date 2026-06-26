# Self-Healing Locator Design

## What it does and why

Playwright tests break when the UI changes — a button gets renamed, a form field gains a new wrapper, or an `id` attribute is replaced with a `data-testid`. The `SelfHealingLocatorEngine` recovers from these breaks at runtime by asking an LLM to find the closest matching selector from the page's **knowledge base** (a pre-indexed map of all meaningful UI elements).

The result is a locator that works again, along with a confidence score so the test runner can decide whether to accept the suggestion or escalate to a human.

---

## The `heal()` algorithm

### Inputs

| Field | Type | Description |
|---|---|---|
| `failure.failedLocator` | `string` | The CSS/Playwright selector that threw `locator not found` |
| `failure.pageName` | `string` | The page being tested (used to load the right KB) |
| `knowledgeBase` | `object` | The JSON knowledge base for this page (selectors, labels, roles) |

### LLM prompt approach

The engine sends a single-shot prompt with:
1. The full knowledge base serialised as JSON
2. The failed locator
3. An explicit rule: **only return selectors already present in the KB** — no hallucinated values
4. A strict JSON response schema

By anchoring to the KB, hallucination risk is eliminated. The LLM acts as a fuzzy matcher over a bounded set of known-good selectors rather than generating arbitrary CSS.

### Output — `LocatorHealingResult`

```typescript
interface LocatorHealingResult {
  originalLocator: string;  // what failed
  healedLocator:   string;  // replacement from KB
  confidence:      number;  // 0–100, LLM self-reported
  reasoning:       string;  // human-readable explanation
}
```

Confidence semantics (recommended thresholds — not enforced by the engine):
- **>= 85** — auto-accept, update the test in place
- **60–84** — flag for review, proceed with run
- **< 60** — pause run, require manual fix

---

## Integration pattern

```typescript
import { SelfHealingLocatorEngine } from "./SelfHealingLocatorEngine.js";

// In a Playwright test fixture or base page class:
const engine = new SelfHealingLocatorEngine(llmProvider);

try {
  await page.locator(selector).click();
} catch (e) {
  const result = await engine.heal(
    { failedLocator: selector, pageName: "ae-login" },
    loginPageKnowledgeBase,
  );
  if (result.confidence >= 85) {
    await page.locator(result.healedLocator).click();
  } else {
    throw new Error(`Healing confidence too low (${result.confidence}): ${result.reasoning}`);
  }
}
```

For generated specs, the heal call can be wired into a Playwright fixture so all tests benefit without per-test changes.

---

## Current limitations

1. **Sync with KB required** — if a page gains entirely new elements not yet in the KB, healing will fail. Re-run the pipeline (`npm run ai:run`) after UI changes to refresh the KB.
2. **Confidence is self-reported** — the LLM assigns its own score; it is not validated against ground truth. Treat thresholds as heuristics.
3. **One locator at a time** — there is no batch healing for multiple failures in a single test.
4. **`knowledgeBase: any` typing** — the engine accepts an untyped object. A typed `KnowledgeBase` interface (planned) will catch mismatches at compile time.

---

## Future improvements

- **Auto-KB refresh hook** — detect stale KB (via URL hash change in `ArtifactManifest`) and re-generate before attempting a heal
- **Write-back** — when a high-confidence heal occurs, patch the generated spec file automatically so the fix persists across runs
- **Multi-candidate ranking** — ask the LLM for top 3 candidates and pick the one that resolves in the live DOM
- **Playwright `getByRole` / `getByLabel` preference** — steer the LLM toward accessibility-based selectors, which are more resilient than attribute selectors
