export class AIJsonParser {

  static parse<T>(
    response: string
  ): T {

    const cleaned =
      response
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    return JSON.parse(cleaned);
  }
}