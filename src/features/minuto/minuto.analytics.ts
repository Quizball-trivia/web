import { trackEvent } from "@/lib/posthog";

/** One event per settled goal: shows which goals are too hard or too easy (never the minute itself). */
export const trackRoundEnd = (p: { puzzleId: string; contentVersion: number; round: number; diff: number; points: number }) =>
  trackEvent("minuto_round_end", { puzzle_id: p.puzzleId, content_version: p.contentVersion, round_number: p.round, minutes_off: p.diff, points: p.points });

export const trackRunStart = (p: { puzzleId: string; contentVersion: number; ranked: boolean; resumed: boolean; round: number }) =>
  trackEvent("minuto_run_start", { puzzle_id: p.puzzleId, content_version: p.contentVersion, ranked: p.ranked, resumed: p.resumed, round_number: p.round });

export const trackRunComplete = (p: { puzzleId: string; ranked: boolean; score: number; exact: number; rank: number | null }) =>
  trackEvent("minuto_run_complete", { puzzle_id: p.puzzleId, ranked: p.ranked, score: p.score, exact: p.exact, rank: p.rank });

export const trackShare = (p: { puzzleId: string; method: "whatsapp" | "native" | "copy"; result: "attempted" | "succeeded" | "cancelled" | "failed"; score: number }) =>
  trackEvent("minuto_share", { puzzle_id: p.puzzleId, method: p.method, share_result: p.result, score: p.score });

export const trackArchiveOpen = (p: { puzzleId: string; daysBack: number }) =>
  trackEvent("minuto_archive_open", { puzzle_id: p.puzzleId, days_back: p.daysBack });

export const trackReport = (p: { puzzleId: string; contentVersion: number; round: number; locale: string }) =>
  trackEvent("minuto_report", { puzzle_id: p.puzzleId, content_version: p.contentVersion, round_number: p.round, locale: p.locale });

export const trackLeaderboardView = (p: { puzzleId: string; placement: "page" | "end"; players: number; hasMe: boolean }) =>
  trackEvent("minuto_leaderboard_view", { puzzle_id: p.puzzleId, placement: p.placement, players: p.players, has_own_row: p.hasMe });

export const trackActionError = (p: { puzzleId: string; action: string; status: number | null; code: string | null }) =>
  trackEvent("minuto_action_error", { puzzle_id: p.puzzleId, action: p.action, http_status: p.status, error_code: p.code });

export const trackLoadError = (p: { puzzleId: string; status: number | null }) =>
  trackEvent("minuto_load_error", { puzzle_id: p.puzzleId, http_status: p.status });
