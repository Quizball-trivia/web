import { createDailyGameCall } from "@/lib/repositories/dailyGameApi";
import type { FootballGridBoardView, FootballGridOption } from "@/lib/realtime/socket.types";
import type { AvatarCustomization } from "@/types/game";

export interface GridDailyState {
  day: string;
  number: number | null;
  boardId: string | null;
  cells: Array<FootballGridOption | null>;
  guessesLeft: number;
  totalGuesses: number;
  startedAt: number | null;
  finishedAt: number | null;
  done: boolean;
  score: number;
  speed: number;
  ranked: boolean;
  rank?: number;
}

export interface GridDailyRun {
  run: { id: string; version: number };
  state: GridDailyState;
  /** Null until the player kicks off: the squares are not sent before the clock runs. */
  board: FootballGridBoardView | null;
  /** The clock the run's start and finish are stamped with (ms). */
  serverNow: number;
}

export type GridDailyGuess = GridDailyRun & { outcome: "correct" | "wrong" | "ambiguous" | "already_used" };

export interface GridDailyBoardRow {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  avatarCustomization: AvatarCustomization | null;
  country: string | null;
  tier: string | null;
  score: number;
  speed: number;
}

export interface GridDailyBoard {
  day: string;
  players: number;
  top: GridDailyBoardRow[];
  me: GridDailyBoardRow | null;
}

const call = createDailyGameCall("/api/v1/grid-daily");

export const gridDailyApi = {
  boards: (locale: string) => call<{ days: Record<string, number>; rankedFrom: string }>("/boards", "GET", undefined, locale, { identity: "none" }),
  start: (day: string, locale: string) => call<GridDailyRun>("/start", "POST", { day }, locale),
  guess: (input: { day: string; runId: string; version: number; cellIndex: number; text: string }, locale: string) =>
    call<GridDailyGuess>("/guess", "POST", input, locale),
  /**
   * "Think this is right?": a refused name the player says fits the square. Not a move: nothing is spent or given
   * back and the run is untouched. True when the server took the request (it answers 204 whether or not it kept it).
   */
  report: (input: { day: string; cellIndex: number; text: string }, locale: string) =>
    call<null>("/report", "POST", { ...input, text: input.text.slice(0, 60) }, locale).then(() => true, () => false),
  /** Shows the squares and starts the clock. */
  kickOff: (input: { runId: string; version: number }, locale: string) => call<GridDailyRun>("/kickoff", "POST", input, locale),
  finish: (input: { runId: string; version: number }, locale: string) => call<GridDailyRun>("/finish", "POST", input, locale),
  leaderboard: (day: string, locale: string) =>
    call<GridDailyBoard>(`/leaderboard?day=${encodeURIComponent(day)}`, "GET", undefined, locale, { identity: "optional" }),
};
