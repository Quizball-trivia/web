import type { CaptureResult } from 'posthog-js';
import { sanitizePostHogCapture } from './sanitize-url';
import { isSeoAnalyticsPath } from './seo-routes';

/** The local games playground is dev tooling: nothing it does is analytics. */
function isDevToolUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  try {
    const path = new URL(value, 'https://quizball.io').pathname;
    return path === '/dev/games' || path.startsWith('/dev/games/');
  } catch {
    return false;
  }
}

function isFootballQuizUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;

  try {
    return isSeoAnalyticsPath(new URL(value, 'https://quizball.io').pathname);
  } catch {
    return false;
  }
}

/**
 * Keep production analytics lean: Core Web Vitals are useful for the public
 * SEO quiz pages and homepages, but not across the much busier game.
 * All other events continue unchanged after URL sanitization.
 */
export function preparePostHogCapture(result: CaptureResult | null): CaptureResult | null {
  const sanitized = sanitizePostHogCapture(result);
  if (sanitized && isDevToolUrl(sanitized.properties?.$current_url)) return null;
  if (!sanitized || sanitized.event !== '$web_vitals') return sanitized;

  return isFootballQuizUrl(sanitized.properties?.$current_url) ? sanitized : null;
}
