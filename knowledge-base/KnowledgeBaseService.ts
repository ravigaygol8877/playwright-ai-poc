import fs from "fs";

const REQUIRED_FIELDS = ["pageName", "url", "selectors"] as const;

export class KnowledgeBaseService {
  load(pageName: string) {
    const filePath = `knowledge-base/${pageName}.json`;

    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Knowledge base not found: "${pageName}". ` +
        `Create knowledge-base/${pageName}.json to continue.`
      );
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const kb = JSON.parse(content) as Record<string, unknown>;

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