import { jsonrepair } from "jsonrepair";

/** Thrown when all JSON repair passes fail — caught by FallbackProvider to switch providers. */
export class JsonRepairError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonRepairError";
  }
}

export class AIJsonParser {

  static parse<T>(
    response: string
  ): T {
    const cleaned = response
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Pass 1 — standard parse (fast path, correct JSON)
    try {
      return JSON.parse(cleaned) as T;
    } catch { /* fall through */ }

    // Pass 2 — jsonrepair handles trailing commas, unescaped quotes, etc.
    try {
      return JSON.parse(jsonrepair(cleaned)) as T;
    } catch { /* fall through */ }

    // Pass 3 — truncation recovery for arrays.
    // Small models sometimes stop mid-object; find the last complete top-level
    // object `}` in the array and close the array there.
    if (cleaned.trimStart().startsWith("[")) {
      const truncated = AIJsonParser.truncateToLastCompleteObject(cleaned);
      if (truncated) {
        try {
          return JSON.parse(truncated) as T;
        } catch { /* fall through */ }

        try {
          return JSON.parse(jsonrepair(truncated)) as T;
        } catch { /* fall through */ }
      }
    }

    throw new JsonRepairError(`AI returned JSON that could not be repaired.\nRaw (first 300 chars): ${cleaned.slice(0, 300)}`);
  }

  // Scan the string and return everything up to (and including) the last
  // top-level `}`, then append `]` to close the array.
  private static truncateToLastCompleteObject(json: string): string | null {
    let depth     = 0;
    let inString  = false;
    let lastClose = -1;

    for (let i = 0; i < json.length; i++) {
      const ch = json[i]!;

      if (inString) {
        if (ch === "\\") { i++; continue; }   // skip escaped char
        if (ch === '"')  { inString = false; }
        continue;
      }

      if (ch === '"') { inString = true;  continue; }
      if (ch === "{") { depth++;          continue; }
      if (ch === "}") {
        depth--;
        if (depth === 0) lastClose = i;   // end of a top-level object
      }
    }

    if (lastClose < 0) return null;
    return json.slice(0, lastClose + 1) + "]";
  }
}
