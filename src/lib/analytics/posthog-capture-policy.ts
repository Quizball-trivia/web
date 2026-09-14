import type { CaptureResult } from 'posthog-js';
import { sanitizePostHogCapture } from './sanitize-url';
import { isSeoAnalyticsPath } from './seo-routes';
import { currentAccessType } from '@/lib/posthog';

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
  if (!sanitized) return sanitized;
  // Always the current session's classification: a value persisted from a
  // previous visit (super properties survive reloads) must not outlive a sign-in or sign-out.
  if (sanitized.properties) {
    sanitized.properties.access_type = currentAccessType();
  }
  if (sanitized.event !== '$web_vitals') return sanitized;

  return isFootballQuizUrl(sanitized.properties?.$current_url) ? sanitized : null;
}
