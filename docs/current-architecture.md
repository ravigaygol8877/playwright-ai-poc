AI Test Intelligence Platform - Current Architecture

Overview

The AI Test Intelligence Platform is a modular framework that combines traditional Playwright automation with AI-powered testing capabilities.

The platform focuses on:

* AI-assisted test generation
* AI-assisted test intelligence
* AI-assisted failure analysis
* Knowledge-driven automation
* Provider-independent LLM integration

⸻

Architecture Principles

1. Separation of Concerns

Each module has a single responsibility.

Examples:

* TestCaseGenerator → Generates test cases
* TestDataGenerator → Generates test data
* RegressionSelector → Selects impacted test suites
* FlakyTestAnalyzer → Analyzes flaky executions
* SelfHealingLocatorEngine → Suggests locator fixes
* BugRootCauseAnalyzer → Performs failure analysis

⸻

2. Provider Independence

The platform depends on the LLMProvider interface rather than a specific LLM vendor.

Current implementation:

* OpenRouterProvider

Future support:

* OpenAI
* Claude
* Gemini
* Local LLMs

⸻

3. Knowledge-Driven Generation

AI is constrained using:

* Knowledge Base
* Test Catalog
* Application Metadata

This prevents AI from generating arbitrary automation code.

⸻

4. Human-Controlled AI

AI produces recommendations.

Framework validates recommendations before use.

Examples:

* Locator healing validation
* Root cause confidence validation
* Structured JSON validation

⸻

High Level Architecture

                     +----------------+
                     |  Requirement   |
                     +--------+-------+
                              |
                              v
                  +-----------+------------+
                  | Test Case Generator    |
                  +-----------+------------+
                              |
                              v
                  +-----------+------------+
                  | Test Data Generator    |
                  +-----------+------------+
                              |
                              v
                  +-----------+------------+
                  | Action Model Generator |
                  +-----------+------------+
                              |
                              v
                  +-----------+------------+
                  | Playwright Renderer    |
                  +-----------+------------+
                              |
                              v
                     Generated Tests

⸻

AI Test Generation Layer

TestCaseGenerator

Purpose:

Generate structured test cases from requirements.

Input:

User should be able to login using valid username and password

Output:

[
  {
    "id": "TC_001",
    "title": "Login with valid username and password"
  }
]

⸻

TestDataGenerator

Purpose:

Generate reusable test data.

Output:

{
  "validUsername": "user123",
  "validPassword": "Passw0rd!"
}

⸻

AIActionModelGenerator

Purpose:

Convert natural-language test steps into structured action models.

Example:

{
  "action": "fill",
  "target": "username",
  "dataKey": "validUsername"
}

⸻

PlaywrightRenderer

Purpose:

Convert Action Models into executable Playwright code.

Example:

await page.fill(
  "#username",
  testData.validUsername
);

⸻

AI Test Intelligence Layer

RegressionSelector

Purpose:

Identify impacted test suites based on changed files.

Input:

{
  "changedFiles": [
    "AuthService.ts",
    "LoginController.ts"
  ]
}

Output:

{
  "recommendedTests": [
    "Login Tests",
    "Password Reset Tests"
  ]
}

⸻

FlakyTestAnalyzer

Purpose:

Analyze historical execution failures.

Input:

{
  "retryCount": 3,
  "duration": 45000,
  "failureMessage": "Timeout 30000ms exceeded"
}

Output:

{
  "flakyProbability": 75,
  "recommendation": "Replace fixed waits"
}

⸻

SelfHealingLocatorEngine

Purpose:

Recommend alternative locators when existing locators fail.

Input:

{
  "failedLocator": "#loginBtn"
}

Output:

{
  "healedLocator": "#login",
  "confidence": 95
}

Validation:

* Must exist in Knowledge Base
* AI cannot invent selectors

⸻

BugRootCauseAnalyzer

Purpose:

Analyze failures and suggest probable causes.

Input:

{
  "failureMessage": "Timeout 30000ms exceeded",
  "stackTrace": "locator.click timeout"
}

Output:

{
  "failureType": "Timeout",
  "probableCause": "Element not clickable",
  "recommendation": "Add explicit wait",
  "confidence": 85
}

Validation:

* Required fields validation
* Confidence score validation

⸻

Shared Infrastructure

LLMProvider

Provider abstraction layer.

Current implementation:

* OpenRouterProvider

Future:

* OpenAIProvider
* ClaudeProvider
* GeminiProvider

⸻

AIJsonParser

Single source of truth for AI JSON parsing.

Responsibilities:

* Remove markdown
* Extract JSON
* Parse JSON safely

Used by:

* TestDataGenerator
* AIActionModelGenerator
* RegressionSelector
* FlakyTestAnalyzer
* SelfHealingLocatorEngine
* BugRootCauseAnalyzer

⸻

KnowledgeBaseService

Stores application metadata.

Example:

{
  "pageName": "Login Page",
  "selectors": {
    "username": "#username",
    "password": "#password",
    "loginButton": "#login"
  }
}

⸻

TestCatalogService

Stores available test suites.

Example:

{
  "testSuites": [
    "Login Tests",
    "Registration Tests",
    "Password Reset Tests"
  ]
}

⸻

Current Project Structure

ai/
├── action-model
├── assertion-generator
├── flaky-test-analyzer
├── regression-selector
├── root-cause-analyzer
├── self-healing-locator
├── test-case-generator
├── test-data-generator
└── utils
automation/
├── generators
└── renderers
knowledge-base/
├── KnowledgeBaseService.ts
├── TestCatalogService.ts
└── test-catalog.json
llm/
├── interfaces
└── providers
tests/
└── generated

⸻

Current Platform Capabilities

Completed Modules:

1. Test Case Generator
2. Test Data Generator
3. Action Model Generator
4. Playwright Renderer
5. Regression Selector
6. Flaky Test Analyzer
7. Self-Healing Locator Engine
8. Root Cause Analyzer

⸻

Future Roadmap

Planned Modules:

1. AI Test Coverage Analyzer
2. AI Bug Analysis Assistant
3. Natural Language → Automation Generator
4. Release Risk Predictor
5. Vector Search / RAG Integration
6. Multi-Agent AI Workflows
7. AI-Assisted Test Maintenance

⸻

Current Status

Platform Version:

v1.0 Foundation Complete

Architecture Status:

Stable

Design Pattern:

Input Model → AI Engine → Output Model

Primary Goal:

Production-style AI Test Intelligence Platform for Playwright Automation.