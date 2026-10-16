import type { RoomClientRules } from "@/features/room/useRoomConnection";

/**
 * Football Tenable: one hidden top-10 list, answers climb into their ranked slot.
 * Solo daily = one list, 3 lives, score = slots found (x/10). Rooms (1v1 and 2–6) = turns on a shared tower,
 * a slot is worth its number, 2 lives per player per list, 3 lists per match.
 */

/** A slot of the tower. `name` stays null until it is found (or, at the end, revealed with `missed`). */
export interface TenableSlot {
  rank: number;
  name: string | null;
  /** The figure behind the rank, e.g. "141 goals"; shown with the name. */
  detail: string | null;
  /** Seat that found it (solo: 0); null while hidden or when revealed unfound. */
  by: number | null;
  missed?: boolean;
}

/** right / wrong (a real entity not on the list, costs a life) / repeat (already on the tower) / ambiguous / unknown (free); time = a turn ran out. */
export type TenableVerdict = "right" | "wrong" | "repeat" | "repeatWrong" | "ambiguous" | "unknown" | "time";

export interface TenableList {
  title: string;
  /** The ranking rule when the title does not say it (a tie-break). */
  note?: string | null;
  /** "As of" date for lists with active players. */
  asOf: string | null;
  /** What the answers are, and the entity release the suggestions search. */
  kind?: "player" | "manager" | "club" | "nation";
  release?: string;
}

/** The solo daily run as the client sees it. */
export interface TenableSoloState {
  day: string;
  list: TenableList;
  slots: TenableSlot[];
  lives: number;
  maxLives: number;
  /** Wrong answers in order (shown under the tower so the player does not try them twice). */
  misses: string[];
  status: "playing" | "done";
  endReason: "complete" | "lives" | "gaveUp" | null;
  last: { id: number; kind: TenableVerdict; text: string; rank: number | null } | null;
  ranked: boolean;
  rank?: number;
  /** False on today's day: missed slots stay hidden until the day is over (it is still being ranked). */
  disclosed?: boolean;
  /** The server's score; counted from the slots when absent (the playground). */
  score?: number;
}

export const TENABLE_MAX_LIVES_SOLO = 3;

/** The server's view of a room match. Everything on the tower is public; hidden slots carry no name. */
export interface TenableView {
  phase: "intro" | "turn" | "listEnd" | "over";
  /** 0-based list index and the match length. */
  list: number;
  lists: number;
  format: "duel" | "party";
  turnMs: number;
  current: TenableList;
  slots: TenableSlot[];
  turn: number | null;
  /** Names the turn an answer is for; changes with every turn. */
  epoch: number;
  /** Attempts inside one turn (a repeated or ambiguous answer keeps the turn). */
  attempt: number;
  maxLives: number;
  seats: Array<{ seat: number; status: "in" | "away" | "withdrawn"; lives: number; score: number; found: number }>;
  mySeat: number;
  /** `name`: who the answer was read as (a wrong answer shows it). */
  last: { epoch: number; attempt: number; seat: number; kind: TenableVerdict; text: string; name?: string | null; rank: number | null } | null;
  /** Why the list on screen ended. */
  listEnd: { reason: "complete" | "out" } | null;
  /** Points each seat scored on the list that just ended. */
  listPoints: number[] | null;
  final: boolean;
  standings: Array<{ seat: number; points: number; roundWins: number; place: number }> | null;
  deadline: string | null;
}

/** `pick`: the entity id of a chosen suggestion. */
export type TenableCommand = { type: "answer"; epoch: number; attempt: number; text: string; pick?: string | null };

/** One answer per attempt of a turn, settled once the server has moved past it. */
export const tenableRoomRules: RoomClientRules<TenableCommand> = {
  slot: (command) => `${command.epoch}:${command.attempt}`,
  settled: (raw, command) => {
    const view = raw as Partial<TenableView>;
    return view.phase !== "turn" || view.epoch !== command.epoch || view.attempt !== command.attempt;
  },
};

export const emptySlots = (): TenableSlot[] => Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, name: null, detail: null, by: null }));
export const foundCount = (slots: readonly TenableSlot[]) => slots.filter((s) => s.name !== null && !s.missed).length;
