import type { CaptureResult } from 'posthog-js';
import { sanitizePostHogCapture } from './sanitize-url';

const FOOTBALL_QUIZ_PATH = /^\/(?:en|ka)\/football-quiz(?:\/[^/?#]+)?\/?$/;

function isFootballQuizUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;

  try {
    return FOOTBALL_QUIZ_PATH.test(new URL(value, 'https://quizball.io').pathname);
  } catch {
    return false;
  }
}

/**
 * Keep production analytics lean: Core Web Vitals are useful for the public
 * SEO quiz pages, but would add a billable event across the much busier game.
 * All other events continue unchanged after URL sanitization.
 */
export function preparePostHogCapture(result: CaptureResult | null): CaptureResult | null {
  const sanitized = sanitizePostHogCapture(result);
  if (!sanitized || sanitized.event !== '$web_vitals') return sanitized;

  return isFootballQuizUrl(sanitized.properties?.$current_url) ? sanitized : null;
}
