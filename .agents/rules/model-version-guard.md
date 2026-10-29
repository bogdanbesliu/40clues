---
description: Guard against reintroducing deprecated Gemini models and ensure resilient AI model configuration
trigger: always_on
---

# AI Model Version & Resilience Directive

Whenever working on files that interact with Gemini API or AI models (such as `scripts/generate-daily.ts`, API routes, or configuration):

1. **Centralized Configuration**:
   - Always import and use model helpers from `@/config/ai` (`resolveGeminiModel`, `getCandidateModels`, `DEFAULT_GEMINI_MODEL`).
   - Do NOT hardcode deprecated Gemini models (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-*`, `gemini-1.5-*`).
   - Allow runtime model override via `process.env.GEMINI_MODEL` with fallback to `gemini-3.8-flash`.

2. **Fallback Resiliency**:
   - For batch or automated pipelines (like daily clue generation), iterate through candidate models (`getCandidateModels()`) so that a single model deprecation or temporary API 404 does not crash the daily cron.

3. **Verification**:
   - Run `npm run check:models` to verify that no deprecated models have been reintroduced anywhere in the codebase.
