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
 * Gameplay telemetry the production database already records authoritatively
 * (matches, lobbies, mode runs — now surfaced on the CMS "Analytics (live)"
 * page). Sending it to PostHog again only burned the event quota: these were
 * ~45% of client volume when the 2026-10-31 billing cap blinded everything.
 * PostHog keeps what only PostHog can see: pageviews, UTM/referrers, the
 * pre-signup funnel, client api_error, flags and session replay.
 */
const DB_DUPLICATED_EVENTS = new Set([
  'match_started',
  'match_completed',
  'game_start',
  'game_complete',
  'game_view',
  'lobby_joined',
  'matchmaking_started',
  'quiz_question_answered',
  'match_results_viewed',
  'wl_banner_viewed',
]);

/** Retry storms: one client can emit hundreds of socket failures in minutes;
 *  the alert on these counts unique users per hour, so 1/min/event loses nothing. */
const THROTTLED_EVENTS: Record<string, number> = {
  socket_connection_failed: 60_000,
  socket_reconnected: 60_000,
};
const lastSentAt = new Map<string, number>();

/**
 * Keep production analytics lean: Core Web Vitals are useful for the public
 * SEO quiz pages and homepages, but not across the much busier game.
 * All other events continue unchanged after URL sanitization.
 */
export function preparePostHogCapture(result: CaptureResult | null): CaptureResult | null {
  const sanitized = sanitizePostHogCapture(result);
  if (!sanitized) return null;
  if (isDevToolUrl(sanitized.properties?.$current_url)) return null;
  if (DB_DUPLICATED_EVENTS.has(sanitized.event)) return null;

  const throttleMs = THROTTLED_EVENTS[sanitized.event];
  if (throttleMs) {
    const last = lastSentAt.get(sanitized.event) ?? 0;
    const now = Date.now();
    if (now - last < throttleMs) return null;
    lastSentAt.set(sanitized.event, now);
  }

  if (sanitized.event !== '$web_vitals') return sanitized;
  return isFootballQuizUrl(sanitized.properties?.$current_url) ? sanitized : null;
}
