/**
 * Free Kicks answer timer — scales with how much there is to read.
 *
 * Mirrors backend `src/modules/free-kicks/free-kicks.timing.ts`. Live rounds use
 * the server's `time_limit_ms` (authoritative, measured on the longest locale);
 * this copy only times the practice/sneak-peek runs, which have no server.
 */

/** Visible answer timer for a short question (ranked MCQ timing). */
export const BASE_ANSWER_S = 10;
/** Ceiling for the visible answer timer. */
export const MAX_ANSWER_S = 20;
/** Prompt + options characters the base timer already covers. */
export const FREE_READ_CHARS = 90;
/** Characters per added second of reading time. */
export const READ_CHARS_PER_SECOND = 12;

export function answerSecondsForChars(chars: number): number {
  const extra = Math.ceil(Math.max(0, chars - FREE_READ_CHARS) / READ_CHARS_PER_SECOND);
  return Math.min(MAX_ANSWER_S, BASE_ANSWER_S + extra);
}

/** Visible answer seconds for a question as displayed (prompt + every option). */
export function answerSecondsForQuestion(prompt: string, options: readonly string[]): number {
  const chars = prompt.trim().length + options.reduce((sum, option) => sum + option.trim().length, 0);
  return answerSecondsForChars(chars);
}

/** Live: the server's per-question limit, or the base timer from servers that predate it. */
export function liveAnswerSeconds(timeLimitMs: number | null | undefined): number {
  return typeof timeLimitMs === "number" && Number.isFinite(timeLimitMs) && timeLimitMs > 0
    ? Math.min(MAX_ANSWER_S, Math.max(BASE_ANSWER_S, timeLimitMs / 1000))
    : BASE_ANSWER_S;
}
