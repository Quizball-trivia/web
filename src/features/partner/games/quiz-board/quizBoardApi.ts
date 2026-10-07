/** The server's Quiz Board view (backend partner quiz-board module). Answers appear only in events for tiles the
 *  player has already answered. */

export type QuizBoardPhase = "pick" | "answer" | "finished";
/** "player" = answered right, "none" = answered wrong or timed out, null = open. */
export type QuizBoardOwner = "player" | "none" | null;

export interface QuizBoardQuestion {
  tile: number;
  value: number;
  prompt: string;
  image: { url: string; width: number; height: number } | null;
  options: string[];
}

export interface QuizBoardEvent {
  seq: number;
  actor: "player" | "system";
  kind: "pick" | "answer" | "timeout" | "end";
  tile: number | null;
  correct: boolean | null;
  choice: number | null;
  points: number;
  correctIndex?: number;
}

export interface QuizBoardView {
  playId: string;
  phase: QuizBoardPhase;
  turn: number;
  serverNow: string;
  deadlineAt: string | null;
  playerScore: number;
  categories: string[];
  tiles: { tile: number; category: number; row: number; value: number; owner: QuizBoardOwner }[];
  activeTile: number | null;
  /** The active tile's question (never its answer). */
  question: QuizBoardQuestion | null;
  events: QuizBoardEvent[];
  result: { score: number; endReason: "completed" | "left" | "idle" | "cancelled" } | null;
}

export interface QuizBoardResponse {
  board: QuizBoardView | null;
}

/** Server grace after a deadline before it applies the timeout; the view asks again just after it. */
export const QUIZ_BOARD_GRACE_MS = 1_000;

/** A tile shows its owner once the event that decided it has played on screen. */
export function shownOwners(view: QuizBoardView, shownSeq: number): Map<number, QuizBoardOwner> {
  const decidedAt = new Map<number, number>();
  for (const e of view.events) {
    if (e.tile === null || e.kind === "pick" || e.kind === "end") continue;
    decidedAt.set(e.tile, e.seq);
  }
  return new Map(
    view.tiles.map((t) => {
      const seq = decidedAt.get(t.tile);
      return [t.tile, t.owner !== null && seq !== undefined && seq <= shownSeq ? t.owner : null];
    }),
  );
}

/** Points as far as the answers on screen go. */
export function shownScore(view: QuizBoardView, shownSeq: number): number {
  let score = 0;
  for (const e of view.events) {
    if (e.seq > shownSeq) break;
    score += e.points;
  }
  return score;
}

/** A response older than the view on screen (a slow refresh overtaken by a move) must not rewind it. */
export function isStale(current: QuizBoardView | null, next: QuizBoardView): boolean {
  if (!current || current.playId !== next.playId) return false;
  return next.turn < current.turn || (next.turn === current.turn && next.events.length < current.events.length);
}

/**
 * The server clock's offset from this device, as an upper bound: the server stamped `serverNow` somewhere between the
 * request leaving (`sentAt`) and the response arriving, so a slow response never makes the board look earlier than it
 * is. The tightest bound seen wins, unless a sample proves it wrong (the device clock jumped).
 */
export function serverOffset(prev: number | null, serverNow: string, sentAt: number, receivedAt: number): number {
  const stamped = new Date(serverNow).getTime();
  const upper = stamped - sentAt;
  const lower = stamped - receivedAt;
  if (prev === null || lower > prev) return upper;
  return Math.min(prev, upper);
}
