import type { RoomClientRules } from "@/features/room/useRoomConnection";
import type { ClubView } from "@/features/wordgames/ClubTile";

/** One finished round as the server shows it. */
export interface SharedPlayerResult {
  round: number;
  clubs: [ClubView, ClubView];
  /** Seats that scored, in the order they answered. */
  winners: number[];
  /** The accepted footballer's name per seat, or null. */
  answers: Array<string | null>;
  gains: number[];
  examples: string[];
  total: number;
}

/** The server's per-seat view of a "played for both" room match (never an accepted name before the reveal). */
export interface SharedPlayerView {
  phase: "countdown" | "race" | "settle" | "reveal" | "over";
  round: number;
  totalRounds: number;
  format: "duel" | "party";
  pointsToWin: number;
  /** Null through the countdown: both clubs appear for everyone at the same moment. */
  clubs: [ClubView, ClubView] | null;
  crests: string[];
  seats: Array<{ seat: number; status: "in" | "away" | "withdrawn"; answered: boolean; score: number }>;
  mySeat: number;
  myAttempt: number;
  myLockedUntil: string | null;
  myHit: string | null;
  myLast: { attempt: number; kind: "ok" | "wrong"; text: string } | null;
  reveal: SharedPlayerResult | null;
  results: SharedPlayerResult[];
  standings: Array<{ seat: number; points: number; roundWins: number; place: number }> | null;
  deadline: string | null;
}

export type SharedPlayerCommand = { type: "answer"; round: number; attempt: number; text: string };

/** One answer per attempt, settled once the server has moved past that attempt (or the race is over). */
export const sharedPlayerRoomRules: RoomClientRules<SharedPlayerCommand> = {
  slot: (command) => `${command.round}:${command.attempt}`,
  settled: (raw, command) => {
    const view = raw as Partial<SharedPlayerView>;
    return (view.phase !== "race" && view.phase !== "settle") || view.round !== command.round || view.myAttempt !== command.attempt;
  },
};
