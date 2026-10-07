// Mirrors docs/FREECROCO-INTERNAL-API-V1.md §1 (player API).

export const PARTNER_GAME_IDS = [
  "ranked",
  "countdown",
  "true-false",
  "pick-em",
  "career-path",
  "higher-lower",
  "card-detective",
  "guess-the-goal",
  "road-to-goal",
  "trivia-mines",
  "quiz-board",
] as const;

export type PartnerGameId = (typeof PARTNER_GAME_IDS)[number];

export type PartnerPlayerLanguage = "ka" | "en" | "ru";

export interface RedeemResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  player: { id: string; displayName: string; language: PartnerPlayerLanguage };
  partner: { slug: "freecroco"; name: string };
}

export interface PartnerGameTile {
  gameId: PartnerGameId;
  playsLimit: number;
  playsUsed: number;
  playsLeft: number;
  maxScore: number | null;
  available: boolean;
  /** A started play not finished yet: the tile reopens it even with no plays left. */
  inProgress: boolean;
}

export interface MeGamesResponse {
  partnerDay: string;
  resetsAt: string;
  games: PartnerGameTile[];
}

export type PartnerErrorCode =
  | "token_expired"
  | "token_used"
  | "token_unknown"
  | "player_blocked"
  | "session_ended"
  | "invalid_request"
  | "rate_limited"
  | "maintenance"
  | "internal_error";

export const PARTNER_SESSION_ENDED_REASONS = ["expired", "replaced", "blocked"] as const;
export type PartnerSessionEndedReason = (typeof PARTNER_SESSION_ENDED_REASONS)[number];

/** Every 401 session_ended carries a reason (internal API §1). */
export interface PartnerSessionEndedErrorBody {
  error: { code: "session_ended"; reason: PartnerSessionEndedReason; message: string };
}

export type PartnerErrorBody =
  | PartnerSessionEndedErrorBody
  | { error: { code: Exclude<PartnerErrorCode, "session_ended">; message: string } };

export function isPartnerSessionEndedReason(value: unknown): value is PartnerSessionEndedReason {
  return (PARTNER_SESSION_ENDED_REASONS as readonly unknown[]).includes(value);
}

export function isPartnerGameId(value: string): value is PartnerGameId {
  return (PARTNER_GAME_IDS as readonly string[]).includes(value);
}
