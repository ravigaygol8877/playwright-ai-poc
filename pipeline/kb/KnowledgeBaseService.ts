import fs from "fs";
import type { KnowledgeBase } from "../models/KnowledgeBase.js";

const REQUIRED_FIELDS = ["pageName", "url", "selectors"] as const;

export class KnowledgeBaseService {
  load(pageName: string): KnowledgeBase {
    const filePath = `pipeline/kb/pages/${pageName}.json`;

    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Knowledge base not found: "${pageName}". ` +
        `Create pipeline/kb/pages/${pageName}.json to continue.`
      );
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const kb = JSON.parse(content) as KnowledgeBase;

    for (const field of REQUIRED_FIELDS) {
      if (!(field in kb)) {
        throw new Error(
          `Knowledge base "${pageName}" is missing required field: "${field}". ` +
          `Required fields: ${REQUIRED_FIELDS.join(", ")}.`
        );
      }
    }

    return kb;
  }
}