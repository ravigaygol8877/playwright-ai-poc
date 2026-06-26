import type { TestCase }
from "../models/TestCase.js";

import type { TestData }
from "../models/TestData.js";

export interface TestGenerationResult {
  testCases: TestCase[];

  testData: TestData;

  generatedScript: string;
}