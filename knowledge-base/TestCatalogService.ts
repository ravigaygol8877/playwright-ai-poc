import fs from "fs";

export class TestCatalogService {

  load(): string[] {

    const content = fs.readFileSync(
      "knowledge-base/test-catalog.json",
      "utf-8"
    );

    const catalog = JSON.parse(content);

    return catalog.testSuites;
  }
}