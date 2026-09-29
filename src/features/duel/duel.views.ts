/** Game views as the duel engines send them (backend src/modules/duel/engines/*.engine.ts `view`). Seats are 0 | 1. */

export type Seat = 0 | 1;
export type Scores = [number, number];

export interface BuscaminasDuelView {
  phase: "turn" | "reveal" | "over";
  round: number;
  totalRounds: number;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  prompt: string;
  opener: Seat;
  turn: Seat;
  pickIndex: number;
  found: number;
  needed: number;
  cards: Array<{ id: string; name: string; img: string; pick: { seat: Seat; auto: boolean } | null; fits: boolean | null }>;
  results: Array<{ outcome: "mine" | "cleared"; by: Seat | null; points: Scores }>;
  scores: Scores;
  timeouts: [number, number];
}

export interface PistasDuelClue {
  kind: "confed" | "position" | "foot" | "decade" | "fact";
  icon: string | null;
  text: string;
}

export interface PistasDuelView {
  phase: "clue" | "reveal" | "over";
  round: number;
  totalRounds: number;
  difficulty: "easy" | "medium" | "hard";
  clue: number;
  ceiling: number;
  pointsInPlay: number;
  clues: PistasDuelClue[];
  seats: Array<{ locked: boolean; passed: boolean; wrong: string | null }>;
  settled: { winner: Seat | null; clue: number; points: number; answer: string } | null;
  results: Array<{ winner: Seat | null; clue: number; points: number }>;
  scores: Scores;
  idle: [number, number];
}

export interface UltimoDuelView {
  phase: "reveal" | "turn" | "catEnd" | "over";
  category: number;
  totalCategories: number;
  target: number;
  difficulty: "easy" | "medium" | "hard";
  title: string;
  hint: string;
  total: number;
  turn: Seat;
  starter: Seat;
  /** The category's attempt count: a command names it, so a double submit is stale, never a second miss. */
  k: number;
  misses: number;
  turnMs: number;
  said: Array<{ seat: Seat; name: string }>;
  last: null | { seat: Seat; kind: "ok" | "wrong" | "repeat" | "ambiguous"; text: string; name: string | null };
  /** The names nobody said, once the category is over. */
  missing: string[] | null;
  scores: Scores;
  results: Array<{ winner: Seat | null; reason: "time" | "misses" | "complete"; said: number; named: [number, number] }>;
}

export type DuelCommand =
  | { type: "pick"; round: number; at: number; cardId: string }
  | { type: "guess"; round: number; text: string }
  | { type: "pass"; round: number; clue: number }
  | { type: "answer"; cat: number; k: number; text: string };
