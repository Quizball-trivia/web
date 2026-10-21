import type { AvatarCustomization } from "@/types/game";

export type Team = 0 | 1;
/** Who a card belongs to, as the key card says. */
export type CardKey = "t0" | "t1" | "neutral" | "owngoal";
/** The same, seen from one player's team. */
export type CardKind = "mine" | "theirs" | "neutral" | "owngoal";

export const BOARD_SIZE = 20;
export const STARTING_TEAM_CARDS = 8;
export const OTHER_TEAM_CARDS = 7;

/** Picture cards (20, keyed 8/7/4/1) or word cards like the original game (25, keyed 9/8/7/1). */
export type BoardKind = "pictures" | "words";
export const WORDS_BOARD = { size: 25, starting: 9, other: 8, neutral: 7 } as const;

export const cardArt = (id: string) => `/assets/codenames/cards/${id}.webp`;

export function kindFor(key: CardKey, team: Team): CardKind {
  if (key === "neutral" || key === "owngoal") return key;
  return key === `t${team}` ? "mine" : "theirs";
}

export interface Clue { word: string; count: number }

// ── Solo daily ────────────────────────────────────────────────────────────────────────────────────────────

export interface DailyClue extends Clue {
  /** Once the run is over: the cards the clue meant, each with its football reason. */
  cards?: Array<{ id: string; why: string }>;
}

export interface SoloFlip { cardId: string; kind: CardKind; clue: number }

export interface CodenamesSoloState {
  day: string;
  /** A card's kind once it is flipped, or for every card once the run is disclosed (null: still hidden). */
  cards: { id: string; kind: CardKind | null; word?: string }[];
  /** The clues given so far (all of them once the run is over). */
  clues: DailyClue[];
  totalClues?: number;
  /** Your cards on the board (the server's count: unflipped cards come without their kind). */
  total?: number;
  clue: number;
  guessesLeft: number;
  flips: SoloFlip[];
  status: "playing" | "done";
  endReason: "complete" | "owngoal" | "clues" | null;
  ranked: boolean;
  rank?: number;
  /** False on a day still open: the key, later clues and reasons come when the day closes. Fixtures leave it unset. */
  disclosed?: boolean;
}

export const mineTotal = (s: Pick<CodenamesSoloState, "cards" | "total">) => s.total ?? s.cards.filter((c) => c.kind === "mine").length;
export const soloFound = (s: Pick<CodenamesSoloState, "flips">) => s.flips.filter((f) => f.kind === "mine").length;
export const flipsThisClue = (s: CodenamesSoloState) => s.flips.filter((f) => f.clue === s.clue).length;

export function newSolo(day: string, cards: CodenamesSoloState["cards"], clues: DailyClue[]): CodenamesSoloState {
  return { day, cards, clues, clue: 0, guessesLeft: clues[0].count + 1, flips: [], status: "playing", endReason: null, ranked: true };
}

function nextClue(s: CodenamesSoloState): CodenamesSoloState {
  const clue = s.clue + 1;
  if (clue >= s.clues.length) return { ...s, status: "done", endReason: "clues" };
  return { ...s, clue, guessesLeft: s.clues[clue].count + 1 };
}

/** Codenames rules for one guesser: a right card keeps the clue going (count + 1 guesses), anything else ends it. */
export function soloFlip(s: CodenamesSoloState, cardId: string): CodenamesSoloState {
  if (s.status !== "playing" || s.flips.some((f) => f.cardId === cardId)) return s;
  const kind = s.cards.find((c) => c.id === cardId)?.kind;
  if (!kind) return s;
  const flips = [...s.flips, { cardId, kind, clue: s.clue }];
  const next = { ...s, flips };
  if (kind === "owngoal") return { ...next, status: "done", endReason: "owngoal" };
  if (kind !== "mine") return nextClue(next);
  if (soloFound(next) === mineTotal(next)) return { ...next, status: "done", endReason: "complete" };
  return next.guessesLeft - 1 === 0 ? nextClue(next) : { ...next, guessesLeft: next.guessesLeft - 1 };
}

export function soloStop(s: CodenamesSoloState): CodenamesSoloState {
  if (s.status !== "playing" || flipsThisClue(s) === 0) return s;
  return nextClue(s);
}

const EMOJI: Record<CardKind, string> = { mine: "🟩", theirs: "🟦", neutral: "⬜", owngoal: "🟥" };

/** One row per clue, as in the other dailies' share text. */
export function shareGrid(s: CodenamesSoloState): string {
  return s.clues
    .map((_, i) => s.flips.filter((f) => f.clue === i).map((f) => EMOJI[f.kind]).join(""))
    .filter((row) => row.length > 0)
    .join("\n");
}

// ── Friend room ───────────────────────────────────────────────────────────────────────────────────────────

export interface RoomPlayer {
  seat: number;
  name: string;
  avatar: AvatarCustomization;
  /** Null until the player picks a side on the teams screen. */
  team: Team | null;
  scout: boolean;
  /** Has seen the key (a Scout in play): never guesses on this board. */
  sawKey?: boolean;
  status: "in" | "away" | "withdrawn";
}

export interface RoomCard {
  id: string;
  /** Word boards: the card's word (picture boards draw the card's art from its id). */
  word?: string;
  /** Sent to Scouts during play and to everyone once the game is over; null for guessers. */
  key: CardKey | null;
  revealed: CardKey | null;
  /** Seats of the teammates currently pointing at this card. */
  picks: number[];
}

/** `clue` null: the bot Scout had no safe clue left and passed. */
export interface RoomTurn { team: Team; clue: (Clue & { bot?: boolean }) | null; flips: CardKey[] }

export interface CodenamesRoomView {
  phase: "teams" | "clue" | "guess" | "over";
  /** Unset: pictures. */
  board?: BoardKind;
  mySeat: number;
  /** Who shuffles and kicks off on the teams screen. */
  host: number;
  /** The turn's number: commands carry it. */
  turnNo: number;
  /** Per team: the bot gives the clues. */
  botScout: [boolean, boolean];
  /** Folded spellings already said this game. */
  used: string[];
  players: RoomPlayer[];
  starting: Team;
  turn: Team;
  cards: RoomCard[];
  clue: (Clue & { bot?: boolean }) | null;
  guessesLeft: number | null;
  history: RoomTurn[];
  result: { winner: Team; reason: "cleared" | "owngoal" | "left" } | null;
}

export type CodenamesCommand =
  | { type: "join"; team: Team; scout: boolean }
  | { type: "shuffle" }
  | { type: "kickoff" }
  | { type: "clue"; word: string; count: number }
  | { type: "pick"; cardId: string | null }
  | { type: "flip"; cardId: string }
  | { type: "endTurn" };

export const me = (v: CodenamesRoomView) => v.players.find((p) => p.seat === v.mySeat)!;
/** Everyone has a side once the game starts. */
export const myTeamOf = (v: CodenamesRoomView): Team => me(v).team ?? 0;
export function teamCards(team: Team, starting: Team, board: BoardKind = "pictures"): number {
  if (board === "words") return team === starting ? WORDS_BOARD.starting : WORDS_BOARD.other;
  return team === starting ? STARTING_TEAM_CARDS : OTHER_TEAM_CARDS;
}

export function cardsLeft(v: Pick<CodenamesRoomView, "cards" | "starting" | "board">, team: Team): number {
  return teamCards(team, v.starting, v.board) - v.cards.filter((c) => c.revealed === `t${team}`).length;
}

/** The server's folding: case, accents, Turkish dotted letters, punctuation and spacing never make a clue new. */
export const foldClue = (text: string): string =>
  text.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("en").replace(/ı/g, "i").replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * Word boards: the original rule that a clue may not be a word still showing on the board, or contain one, or be
 * part of one (STONE for STONES, CROSSBAR for BAR). Each word of a two-word clue is checked on its own.
 */
export function clueOnBoard(clue: string, boardWords: string[]): string | null {
  const parts = clue.split(/\s+/).map(foldClue).filter(Boolean);
  for (const word of boardWords) {
    const w = foldClue(word);
    if (parts.some((p) => p === w || (p.length >= 3 && w.includes(p)) || (w.length >= 3 && p.includes(w)))) return word;
  }
  return null;
}
