import { trackEvent } from "@/lib/posthog";
import type { RoundOutcome } from "./pistas.logic";

/** One event per settled player (never per keystroke): shows where clue ladders are too hard or too easy. */
export const trackRoundEnd = (p: { puzzleId: string; contentVersion: number; round: number; outcome: RoundOutcome; clues: number; points: number; wrongGuesses: number }) =>
  trackEvent("pistas_round_end", { puzzle_id: p.puzzleId, content_version: p.contentVersion, round_number: p.round, outcome: p.outcome, clues_used: p.clues, points: p.points, wrong_guesses: p.wrongGuesses });

export const trackRunStart = (p: { puzzleId: string; contentVersion: number; ranked: boolean; resumed: boolean; round: number }) =>
  trackEvent("pistas_run_start", { puzzle_id: p.puzzleId, content_version: p.contentVersion, ranked: p.ranked, resumed: p.resumed, round_number: p.round });

export const trackRunComplete = (p: { puzzleId: string; ranked: boolean; score: number; solved: number; rank: number | null }) =>
  trackEvent("pistas_run_complete", { puzzle_id: p.puzzleId, ranked: p.ranked, score: p.score, solved: p.solved, rank: p.rank });

export const trackShare = (p: { puzzleId: string; method: "whatsapp" | "native" | "copy"; result: "attempted" | "succeeded" | "cancelled" | "failed"; score: number }) =>
  trackEvent("pistas_share", { puzzle_id: p.puzzleId, method: p.method, share_result: p.result, score: p.score });

export const trackArchiveOpen = (p: { puzzleId: string; daysBack: number }) =>
  trackEvent("pistas_archive_open", { puzzle_id: p.puzzleId, days_back: p.daysBack });

export const trackReport = (p: { puzzleId: string; contentVersion: number; round: number; revealed: number; locale: string }) =>
  trackEvent("pistas_report", { puzzle_id: p.puzzleId, content_version: p.contentVersion, round_number: p.round, clues_revealed: p.revealed, locale: p.locale });

export const trackLeaderboardView = (p: { puzzleId: string; placement: "page" | "end"; players: number; hasMe: boolean }) =>
  trackEvent("pistas_leaderboard_view", { puzzle_id: p.puzzleId, placement: p.placement, players: p.players, has_own_row: p.hasMe });

export const trackActionError = (p: { puzzleId: string; action: string; status: number | null; code: string | null }) =>
  trackEvent("pistas_action_error", { puzzle_id: p.puzzleId, action: p.action, http_status: p.status, error_code: p.code });

export const trackLoadError = (p: { puzzleId: string; status: number | null }) =>
  trackEvent("pistas_load_error", { puzzle_id: p.puzzleId, http_status: p.status });
