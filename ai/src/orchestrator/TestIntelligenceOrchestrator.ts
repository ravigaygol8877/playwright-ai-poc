import { TestCaseGenerator }
    from "../test-case-generator/TestCaseGenerator.js";

import { TestDataGenerator }
    from "../test-data-generator/TestDataGenerator.js";

import { PlaywrightGenerator }
    from "../../../automation/src/generators/PlaywrightGenerator.js";

import { KnowledgeBaseService }
    from "../../../knowledge-base/KnowledgeBaseService.js";

import type { TestGenerationResult }
    from "./TestGenerationResult.js";

export class TestIntelligenceOrchestrator {

    constructor(
        private testCaseGenerator: TestCaseGenerator,
        private testDataGenerator: TestDataGenerator,
        private playwrightGenerator: PlaywrightGenerator
    ) { }

    async generateTests(
        requirement: string
    ): Promise<TestGenerationResult> {

        const testCases =
            await this.testCaseGenerator.generate(
                requirement
            );

        const testData =
            await this.testDataGenerator.generate(
                requirement
            );

        const kbService =
            new KnowledgeBaseService();

        const knowledgeBase =
            kbService.load("login-page");

        const generatedScript =
            await this.playwrightGenerator.generate(
                testCases,
                testData,
                knowledgeBase
            );

        return {
            testCases,
            testData,
            generatedScript
        };
    }
}