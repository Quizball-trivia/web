import { trackEvent } from "@/lib/posthog";
import type { Difficulty, RoundOutcome } from "./buscaminas.logic";

/** One event per settled round (never per tap): enough to see where the difficulty curve loses people. */
export const trackRoundEnd = (p: { puzzleId: string; contentVersion: number; round: number; difficulty: Difficulty; outcome: RoundOutcome; found: number; points: number }) =>
  trackEvent("buscaminas_round_end", { puzzle_id: p.puzzleId, content_version: p.contentVersion, round_number: p.round, difficulty: p.difficulty, outcome: p.outcome, found: p.found, points: p.points });

export const trackShare = (p: { puzzleId: string; method: "whatsapp" | "native" | "copy"; result: "attempted" | "succeeded" | "cancelled" | "failed"; score: number }) =>
  trackEvent("buscaminas_share", { puzzle_id: p.puzzleId, method: p.method, share_result: p.result, score: p.score });

export const trackArchiveOpen = (p: { puzzleId: string; daysBack: number }) =>
  trackEvent("buscaminas_archive_open", { puzzle_id: p.puzzleId, days_back: p.daysBack });

export const trackReport = (p: { puzzleId: string; contentVersion: number; round: number; roundId: string; playerIds: string[] }) =>
  trackEvent("buscaminas_report", { puzzle_id: p.puzzleId, content_version: p.contentVersion, round_number: p.round, round_id: p.roundId, player_ids: p.playerIds.join(",") });

/** One per run opened: guest vs ranked, fresh vs resumed on this device. */
export const trackRunStart = (p: { puzzleId: string; contentVersion: number; ranked: boolean; resumed: boolean; round: number }) =>
  trackEvent("buscaminas_run_start", { puzzle_id: p.puzzleId, content_version: p.contentVersion, ranked: p.ranked, resumed: p.resumed, round_number: p.round });

export const trackRunComplete = (p: { puzzleId: string; ranked: boolean; score: number; perfects: number; mines: number; rank: number | null }) =>
  trackEvent("buscaminas_run_complete", { puzzle_id: p.puzzleId, ranked: p.ranked, score: p.score, perfect_rounds: p.perfects, mines_hit: p.mines, rank: p.rank });

export const trackLeaderboardView = (p: { puzzleId: string; placement: "page" | "end"; players: number; hasMe: boolean }) =>
  trackEvent("buscaminas_leaderboard_view", { puzzle_id: p.puzzleId, placement: p.placement, players: p.players, has_own_row: p.hasMe });

const NAMED_MOVES = new Set(["start", "bank", "next"]);
/** The action an error happened in: taps are keyed by card id (a short Transfermarkt number), the other moves by name. */
export const actionOf = (key: string): string => (NAMED_MOVES.has(key) ? key : "tap");

export const trackActionError = (p: { puzzleId: string; action: string; status: number | null; code: string | null }) =>
  trackEvent("buscaminas_action_error", { puzzle_id: p.puzzleId, action: p.action, http_status: p.status, error_code: p.code });

export const trackLoadError = (p: { puzzleId: string; status: number | null }) =>
  trackEvent("buscaminas_load_error", { puzzle_id: p.puzzleId, http_status: p.status });
