/**
 * Centralized Gemini AI configuration and model version guard.
 * Prevents regressions to deprecated models (e.g. gemini-2.5-flash, gemini-1.5-flash).
 */

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export const FALLBACK_GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-pro",
] as const;

export const DEPRECATED_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
] as const;

/**
 * Resolves the appropriate Gemini model to use:
 * 1. Checks explicit parameter or process.env.GEMINI_MODEL
 * 2. Intercepts and warns if a deprecated model is supplied, automatically upgrading to DEFAULT_GEMINI_MODEL
 * 3. Defaults to DEFAULT_GEMINI_MODEL ("gemini-3.8-flash")
 */
export function resolveGeminiModel(preferredModel?: string): string {
  const model = preferredModel?.trim() || process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  const isDeprecated = (DEPRECATED_GEMINI_MODELS as readonly string[]).includes(model) ||
    /^gemini-(?:1\.[0-9]|2\.[0-9])/.test(model);

  if (isDeprecated) {
    console.warn(
      `⚠️ Model "${model}" is deprecated and no longer supported. Automatically upgrading to "${DEFAULT_GEMINI_MODEL}".`
    );
    return DEFAULT_GEMINI_MODEL;
  }

  return model;
}

/**
 * Returns candidate models in priority order for generation retry resilience.
 */
export function getCandidateModels(preferredModel?: string): string[] {
  const primary = resolveGeminiModel(preferredModel);
  const candidates = [primary];

  for (const fallback of FALLBACK_GEMINI_MODELS) {
    if (!candidates.includes(fallback)) {
      candidates.push(fallback);
    }
  }

  return candidates;
}
