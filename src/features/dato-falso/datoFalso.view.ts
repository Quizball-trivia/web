/**
 * Dato falso futbolero: a subject (player or coach), a claim ("played for ALL these clubs") and five options. Four are
 * true, one is the fake. Find the fake: +1. Two jokers, once each per run or match: cut (removes two true options) and
 * double (+2 right, −1 wrong). Solo daily = 10 cards; rooms (1v1 and 2–6) = everyone answers the same card at once.
 */

export type DfCategory = "clubs" | "leagues" | "worldCups" | "numbers" | "trophies" | "coachedClubs";

/** How an option is drawn: a crest, flag or trophy image, a shirt with a number, or plain text with a small logo. */
export type DfArt =
  | { kind: "crest" | "flag" | "trophy"; src: string }
  | { kind: "shirt"; number: string }
  | { kind: "text"; src?: string };

export interface DfOption { id: string; label: string; art: DfArt }

/** A card as the client sees it before the reveal: nothing on it says which option is the fake. */
export interface DfCard {
  id: string;
  category: DfCategory;
  subject: { name: string; portrait: string | null; kind: "player" | "coach" };
  options: DfOption[];
  /** 1 easy · 2 medium · 3 hard. */
  level: 1 | 2 | 3;
}

/** Sent only once a card is settled. */
export interface DfReveal { fake: string; explain: string }

export type DfJoker = "cut" | "double";

/** One settled card of a run: the dots on the progress strip and the share grid. Both jokers may be spent on one card. */
export interface DfMark { right: boolean; points: number; cut: boolean; double: boolean; timedOut?: boolean }

export const DF_CARDS_SOLO = 10;
export const DF_CARD_MS_SOLO = 30_000;

export interface DfSoloState {
  day: string;
  total: number;
  /** 0-based card on screen. */
  index: number;
  card: DfCard;
  /** Options taken away by the cut joker on this card. */
  removed: string[];
  /** The double joker is on for this card. */
  doubled: boolean;
  /** Set once the card is settled: the fake, the explanation, what was picked (null = time ran out) and the points. */
  reveal: (DfReveal & { pick: string | null; points: number }) | null;
  jokersUsed: DfJoker[];
  marks: DfMark[];
  score: number;
  status: "playing" | "done";
  ranked: boolean;
  rank?: number;
  deadline: string | null;
}

export const DF_CARD_MS_ROOM = 20_000;
export const DF_REVEAL_MS_ROOM = 6_000;

export interface DfRoomSeat {
  seat: number;
  status: "in" | "away" | "withdrawn";
  score: number;
  right: number;
  /** Locked an answer on the card on screen (the pick itself stays hidden until the reveal). */
  answered: boolean;
  /** Jokers this seat has spent; another seat's are only shown once they are revealed. */
  jokersUsed: DfJoker[];
  /** Missed two cards in a row: the others no longer wait for this seat (a pick brings it back). */
  idle?: boolean;
}

/** The server's view of a room match, for one seat. */
export interface DfRoomView {
  phase: "intro" | "card" | "reveal" | "over";
  index: number;
  total: number;
  format: "duel" | "party";
  cardMs: number;
  card: DfCard | null;
  /** My own cut on this card (other seats' cuts are never sent). */
  removed: string[];
  myDoubled: boolean;
  myPick: string | null;
  seats: DfRoomSeat[];
  mySeat: number;
  reveal: (DfReveal & { picks: Array<{ seat: number; pick: string | null; points: number; cut: boolean; doubled: boolean }> }) | null;
  final: boolean;
  standings: Array<{ seat: number; points: number; roundWins: number; place: number }> | null;
  deadline: string | null;
}

/** What a room seat sends (the server's command shape: cards and options by position). */
export type DfCommand =
  | { type: "joker"; card: number; kind: DfJoker }
  | { type: "pick"; card: number; option: number };

/** Share line of a run: one square per card, ✂ and ×2 where a joker was spent. */
export const dfShareGrid = (marks: readonly DfMark[]) =>
  marks.map((m) => `${m.right ? "🟩" : "🟥"}${m.cut ? "✂️" : ""}${m.double ? "✖️2" : ""}`).join(" ");

export const dfRightCount = (marks: readonly DfMark[]) => marks.filter((m) => m.right).length;
