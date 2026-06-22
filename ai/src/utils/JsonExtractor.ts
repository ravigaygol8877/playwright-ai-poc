export class JsonExtractor {
  static extract(content: string): string {
    return content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
  }
}