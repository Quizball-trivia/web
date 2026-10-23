// PostHog bills per event (identified events ~5x), so events nobody reads are not sent
// (audit 2026-10-21: no saved insight, alert, experiment or recurring report uses them; a few
// appear only in launch funnel specs/checklists that were never queried after August).
// Remove a name here to start collecting it again. Mirrors backend src/core/analytics/disabled-events.ts.
const DISABLED_EVENTS: ReadonlySet<string> = new Set([
  'buscaminas_archive_open',
  'buscaminas_leaderboard_view',
  'draft_completed',
  'draft_started',
  'draft_ui_ready',
  'football_grid_engagement_ended',
  'football_grid_match_found',
  'football_grid_play_started',
  'football_grid_queue_joined',
  'football_grid_queue_left',
  'football_grid_rematch_response',
  'football_grid_viewed',
  'game_card_click',
  'game_exit',
  'game_replay',
  'ggt_guess_submitted',
  'grid_draw_offered',
  'grid_game_completed',
  'grid_series_completed',
  'lobby_left',
  'matchmaking_ai_fallback',
  'mini_game_intro_started',
  'minuto_archive_open',
  'minuto_leaderboard_view',
  'play_card_clicked',
  'ranked_match_found',
  'road_to_goal_question_resolved',
]);

// Per-round events are only needed for occasional difficulty checks; a stable 10% of
// players (or of matches, for two-player events) keeps whole runs analysable.
// Events carry sample_rate so counts can be scaled.
const SAMPLED_EVENTS: ReadonlySet<string> = new Set([
  'buscaminas_round_end',
  'grid_turn_submitted',
  'minuto_round_end',
  'pistas_round_end',
]);
const SAMPLED_BY_MATCH_EVENTS: ReadonlySet<string> = new Set(['grid_turn_submitted']);
export const ROUND_EVENT_SAMPLE_RATE = 0.1;

// Counts daily viewing browsers, not impressions (impressions before 2026-10 were 1:1 with /play views).
const ONCE_PER_DAY_EVENTS: ReadonlySet<string> = new Set(['wl_banner_viewed']);
const ONCE_PER_DAY_STORAGE_PREFIX = 'quizball.analytics.once.';

const claimedDays = new Map<string, string>();

export type AnalyticsSendDecision = { send: false } | { send: true; extraProperties?: Record<string, string | number> };

function inSample(key: string): boolean {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100 < ROUND_EVENT_SAMPLE_RATE * 100;
}

function localDay(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function claimOncePerDay(eventName: string, now: number): boolean {
  const key = ONCE_PER_DAY_STORAGE_PREFIX + eventName;
  const today = localDay(now);
  if (claimedDays.get(key) === today) return false;
  try {
    if (window.localStorage.getItem(key) === today) {
      claimedDays.set(key, today);
      return false;
    }
  } catch { /* storage unavailable: the in-memory claim still dedupes this tab */ }
  claimedDays.set(key, today);
  try {
    window.localStorage.setItem(key, today);
  } catch { /* same as above */ }
  return true;
}

export function decideAnalyticsSend(
  eventName: string,
  getDistinctId: () => string | null | undefined,
  now = Date.now(),
  properties?: Record<string, unknown>,
): AnalyticsSendDecision {
  if (DISABLED_EVENTS.has(eventName)) return { send: false };
  if (SAMPLED_EVENTS.has(eventName)) {
    const matchId = SAMPLED_BY_MATCH_EVENTS.has(eventName) && typeof properties?.match_id === 'string' ? properties.match_id : null;
    const key = matchId ?? getDistinctId();
    return key && inSample(key)
      ? { send: true, extraProperties: { sample_rate: ROUND_EVENT_SAMPLE_RATE } }
      : { send: false };
  }
  if (ONCE_PER_DAY_EVENTS.has(eventName)) {
    return claimOncePerDay(eventName, now) ? { send: true, extraProperties: { count_basis: 'browser_day' } } : { send: false };
  }
  return { send: true };
}

export function resetAnalyticsPolicyForTests(): void {
  claimedDays.clear();
}
