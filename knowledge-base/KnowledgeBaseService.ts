import fs from "fs";

export class KnowledgeBaseService {
  load(pageName: string) {
    const filePath =
      `knowledge-base/${pageName}.json`;

    const content =
      fs.readFileSync(filePath, "utf-8");

    return JSON.parse(content);
  }
}