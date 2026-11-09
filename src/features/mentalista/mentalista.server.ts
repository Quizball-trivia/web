/**
 * Mentalista Futbolero — the REAL room contract, as the shared `room` runtime sends it. This file mirrors the backend
 * `MentalistaView` / `MentalistaResult` / `MentalistaEntry` and the command shape VERBATIM
 * (worktrees/mentalista-game-backend/src/modules/room/games/mentalista) and nothing else: no local rules engine, no
 * scoring, no clock. The server is the only authority; the screens only draw its view and never recompute a field.
 *
 * Contract this file encodes (never widen it without the backend changing first):
 * - Commands are `{ type: "choose" | "predict", round, option }`. `round` is a 0-based integer; `option` is a 0-based
 *   index into the public category's `options`. The client NEVER sends its own seat — the server knows it from the
 *   socket principal. The command `type` encodes the phase it belongs to (a `choose` is only legal in the choose phase,
 *   a `predict` only in the predict phase), so one slot per round AND type is enough.
 * - One frozen chooser cycle, 3–6 seats at the start. The chooser secretly commits one option; every other seat locks
 *   ONE final prediction — immutable, no revise, no different-id replacement once locked. An exact-index match pays the
 *   predictor; the chooser earns nothing (the reader wins, not the read). The SERVER assigns every point — this file
 *   reads `entries[].points`, `entries[].matched` and `standings[].roundWins`; it never derives them.
 * - Phases: `choose` → `predict` → `reveal` → (next round) … → `over`. Cancellation is the OUTER room status, folded by
 *   the backend into `phase: "over"` (the shell also draws a cancelled match from `snapshot.status`).
 * - A seat's own secret (its committed option as chooser via `myChoice`, or its locked prediction via `myPrediction`)
 *   is visible only to its author until reveal; another seat's open secret is never on the wire. `reveal.target === null`
 *   with `reveal.voided === true` means the round produced no scoring (chooser withdrew or never committed in time).
 * - Deadlines are server ISO timestamps, read against `room.nowMs` (the server clock), never an assumed duration. The
 *   backend's optional custom timing (flat `chooseMs`/`predictMs`/`revealMs`) is not on this view and irrelevant here.
 */

import type { RoomClientRules } from "@/features/room/useRoomConnection";

export type MvPhase = "choose" | "predict" | "reveal" | "over";

/** Seat status as the shared room engine sends it (backend `RoomSeatStatus`). */
export type RoomSeatStatus = "in" | "away" | "withdrawn";

/** A final-table row as the shared room engine sends it (backend `RoomEngineStanding`). */
export interface RoomEngineStanding {
  seat: number;
  points: number;
  /** Rounds this seat "read" the chooser (its own scoring wins) — server-assigned, never recomputed here. */
  roundWins: number;
  /** 1-based place, shared on ties. */
  place: number;
}

/**
 * The round's category as the server sends it (backend `MentalistaPublicCategory`): a prompt and its legal options,
 * each a stable id and a display name. The option at index `i` is what a command's `option: i` refers to.
 */
export interface MentalistaPublicCategory {
  id: string;
  prompt: string;
  options: Array<{ id: string; name: string }>;
}

/** One seat's locked prediction for a revealed round (backend `MentalistaEntry`). */
export interface MentalistaEntry {
  seat: number;
  /** The option index this seat locked, or `null` when it locked none. */
  prediction: number | null;
  /** This prediction matched the chooser's committed pick. */
  matched: boolean;
  /** Points this seat earned in the round — server-assigned. */
  points: number;
}

/** A round's outcome, as the server banks it (backend `MentalistaResult`). */
export interface MentalistaResult {
  round: number;
  /** The seat that chose this round. */
  chooser: number;
  /** The chooser's committed option index, or `null` when the round was voided (no commit). */
  target: number | null;
  /** The round produced no scoring: the chooser withdrew before committing, or none was committed by the deadline. */
  voided: boolean;
  entries: MentalistaEntry[];
}

/**
 * The room view the server sends to ONE seat (backend mentalista.engine `viewOf`). Mirror it EXACTLY — the screens must
 * never read a field the server does not promise, and never a secret it withholds before reveal. Two states that differ
 * only in another seat's open choice or prediction are indistinguishable through this view.
 */
export interface MentalistaView {
  phase: MvPhase;
  /** 0-based index of the round in play. */
  round: number;
  totalRounds: number;
  /** The seat choosing this round. */
  chooserSeat: number;
  category: MentalistaPublicCategory | null;
  /** This viewer is the round's chooser (false once the match is terminal). */
  iAmChooser: boolean;
  seats: Array<{ seat: number; status: RoomSeatStatus; isChooser: boolean; committed: boolean; predicted: boolean; score: number }>;
  mySeat: number;
  /** The viewer's own secret, for them alone: the chooser's committed pick (open rounds), else `null`. */
  myChoice: number | null;
  /** The viewer's own locked prediction, for them alone (predict phase), else `null`. */
  myPrediction: number | null;
  /** The round just revealed (reveal phase only), else `null`. */
  reveal: MentalistaResult | null;
  /** Every banked round so far. */
  results: MentalistaResult[];
  /** The final table, present only once the match is over (or cancelled). */
  standings: RoomEngineStanding[] | null;
  /** ISO server deadline for the running phase; read against `room.nowMs`. `null` when none is running. */
  deadline: string | null;
}

/** What a seat sends: a choice or a prediction, by round and 0-based option index. The seat is never in the payload. */
export type MvCommand =
  | { type: "choose"; round: number; option: number }
  | { type: "predict"; round: number; option: number };

/**
 * One command per round AND type (the `type` encodes the phase). A command is settled once the server confirms the
 * seat's own value for it, OR once the phase/round has moved beyond the window in which it was still legal:
 * - a `choose` is legal only while `phase === "choose"` on its round; once choose is over (predict/reveal/over) or the
 *   round advanced, the slot is closed whether or not it landed;
 * - a `predict` is legal only while `phase === "predict"` on its round; once reveal/over is reached or the round
 *   advanced, the slot is closed.
 * This keeps a lost-broadcast command retained (same id, same payload) only while it could still matter, and never lets
 * a changed payload ride a retained id (the board also disables the controls while a slot is pending).
 */
export const mentalistaRoomRules: RoomClientRules<MvCommand> = {
  slot: (c) => `${c.type}:${c.round}`,
  settled: (raw, c) => {
    const v = raw as Partial<MentalistaView>;
    if (typeof v.round !== "number" || typeof v.phase !== "string") return true;
    // The round moved on: this slot can never open again.
    if (v.round > c.round) return true;
    // A snapshot from before this command's round should keep it pending (we never send ahead of the shown round).
    if (v.round < c.round) return false;
    // Same round: has the window this command belonged to closed?
    const closed = c.type === "choose" ? v.phase !== "choose" : v.phase === "reveal" || v.phase === "over";
    if (closed) return true;
    const own = c.type === "choose" ? v.myChoice : v.myPrediction;
    return own !== null && own !== undefined;
  },
};
