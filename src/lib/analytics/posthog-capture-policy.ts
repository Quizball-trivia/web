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
 * game_start stays: it is the only web signal for daily and mini-game players
 * (one event per game), and 27 saved active-player insights count it.
 * match_started stays for ranked/friendly, which the server never sends; Tic Tac
 * Toe's copy is dropped because the server already sends that one.
 */
const DB_DUPLICATED_EVENTS = new Set([
  'match_completed',
  'game_complete',
  'game_view',
  'lobby_joined',
  'matchmaking_started',
  'quiz_question_answered',
  'match_results_viewed',
  'wl_banner_viewed',
]);

// Preserve hourly unique-user alerts. Sample subsequent eligible reports so
// diagnostics still include examples from longer outages.
const socketReports = new Map<string, Map<unknown, number>>();
let socketReportHour = -1;

function keepSocketReport(result: CaptureResult): boolean {
  const now = Date.now();
  const hour = Math.floor(now / 3_600_000);
  if (hour !== socketReportHour) {
    socketReports.clear();
    socketReportHour = hour;
  }

  let reports = socketReports.get(result.event);
  if (!reports) {
    reports = new Map();
    socketReports.set(result.event, reports);
  }
  const identity = result.properties?.distinct_id;
  const previous = reports.get(identity);
  if (previous !== undefined && now - previous < 60_000) return false;
  reports.set(identity, now);
  return previous === undefined || Math.random() < 0.1;
}

export function isLoopbackHost(hostname: string): boolean {
  if (hostname.startsWith('127.')) {
    const octets = hostname.split('.');
    return octets.length === 4 && octets.every(octet => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);
  }
  return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '[::1]';
}

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
  if (sanitized.event === 'match_started' && sanitized.properties?.mode === 'football_grid') return null;

  if ((sanitized.event === 'socket_connection_failed' || sanitized.event === 'socket_reconnected')
    && !keepSocketReport(sanitized)) return null;

  if (sanitized.event !== '$web_vitals') return sanitized;
  return isFootballQuizUrl(sanitized.properties?.$current_url) ? sanitized : null;
}
