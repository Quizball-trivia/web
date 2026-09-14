import { trackEvent } from "@/lib/posthog";

/**
 * Public (signed-out) games funnel: homepage → game page → practice start →
 * completion → registration. Mode ids are the manifest's stable ids, never
 * translated display text, so locales roll up into one report.
 */
export type PublicSurface = "hub" | "public_home" | "public_game" | "daily_collection";
type Access = "guest" | "member";

export const trackGameCardClick = (p: { modeId: string; surface: PublicSurface; group: string; destination: string }) =>
  trackEvent("game_card_click", { mode_id: p.modeId, source_surface: p.surface, card_group: p.group, destination: p.destination });
export const trackGameView = (p: { modeId: string; locale: string; access: Access }) =>
  trackEvent("game_view", { mode_id: p.modeId, locale: p.locale, access_type: p.access, surface: "public" });
export type SessionKind = "training" | "sample";
export const trackGameStart = (p: { modeId: string; access: Access; sessionId: string; sessionKind: SessionKind }) =>
  trackEvent("game_start", { mode_id: p.modeId, access_type: p.access, game_session_id: p.sessionId, source_surface: "public_game", session_kind: p.sessionKind });
/** What a public-page engine reports when a round ends; the coin sneak peeks add the settlement. */
export type EngineEventDetail = { score?: number; outcome?: "cashed" | "lost"; stake?: number; payout?: number; balance?: number };
export const trackGameComplete = (p: { modeId: string; sessionId: string; durationMs: number; sessionKind: SessionKind } & EngineEventDetail) =>
  trackEvent("game_complete", { mode_id: p.modeId, game_session_id: p.sessionId, outcome: p.outcome ?? "completed", score: p.score ?? null, stake_coins: p.stake ?? null, payout_coins: p.payout ?? null, practice_balance: p.balance ?? null, active_duration_ms: p.durationMs, session_kind: p.sessionKind });
export const trackGameExit = (p: { modeId: string; sessionId: string; sessionKind: SessionKind; stage: "playing" | "results"; durationMs: number }) =>
  trackEvent("game_exit", { mode_id: p.modeId, game_session_id: p.sessionId, session_kind: p.sessionKind, exit_stage: p.stage, active_duration_ms: p.durationMs });
export const trackGameReplay = (p: { modeId: string; previousSessionId: string }) =>
  trackEvent("game_replay", { mode_id: p.modeId, previous_session_id: p.previousSessionId });
export const trackSignupPromptView = (p: { modeId?: string; placement: string; destination: string }) =>
  trackEvent("signup_prompt_view", { mode_id: p.modeId ?? null, placement: p.placement, intended_destination: p.destination });
export const trackGamesSignupClick = (p: { modeId?: string; page: string; placement: string; destination: string }) =>
  trackEvent("games_signup_click", { mode_id: p.modeId ?? null, originating_page: p.page, prompt_placement: p.placement, intended_destination: p.destination });
export const trackPublicGameError = (p: { modeId: string; category: string; stage: string }) =>
  trackEvent("public_game_error", { mode_id: p.modeId, error_category: p.category, stage: p.stage });
