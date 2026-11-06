/**
 * Relaxed practice of the name chain: no clock, no score, no leaderboard. The browser holds the chain; the server
 * (POST /api/v1/name-chain/practice, backend name-chain-daily.practice) only judges each step with the daily's rules.
 */

export type PracticeVerdict = "ok" | "unknown" | "letter" | "repeat";
export interface PracticeLink { pid: string; name: string; game: string; given: boolean }

/** The server's answer to one practice step. */
export interface PracticeStepResponse {
  alphabet: "latin" | "cyrillic";
  result: PracticeVerdict | null;
  links: PracticeLink[];
  letter: string;
  last: { kind: PracticeVerdict; text: string; name: string | null; starts: string[] } | null;
  could: string[];
  exhausted: boolean;
}

export type PracticeRequest =
  | { op: "start"; locale: string; used: string[] }
  | { op: "answer"; locale: string; used: string[]; tail: string; answer: string }
  | { op: "pass"; locale: string; used: string[]; tail: string };

export interface PracticeState {
  links: PracticeLink[];
  /** Every footballer of this practice session (all its chains): a name is not used twice until the list is trimmed. */
  used: string[];
  letter: string;
  last: PracticeStepResponse["last"];
  /** Set once the player ends the chain (or the release has nobody left). */
  ended: { could: string[]; named: number } | null;
  /** Names the player said in each finished chain; the best one is shown, nothing is ranked. */
  results: number[];
  /** Bumps on every answer judged, so the same refusal twice still animates. */
  attempt: number;
}

/** The server takes at most this many used ids; older ones fall off (and those names become free again). */
export const PRACTICE_USED_MAX = 300;

export const emptyPractice = (): PracticeState => ({ links: [], used: [], letter: "", last: null, ended: null, results: [], attempt: 0 });

export const namedIn = (s: PracticeState): number => s.links.filter((link) => !link.given).length;
export const bestOf = (s: PracticeState): number => Math.max(0, namedIn(s), ...s.results);

const trimUsed = (used: string[]): string[] => (used.length > PRACTICE_USED_MAX ? used.slice(-PRACTICE_USED_MAX) : used);
const withUsed = (used: string[], links: PracticeLink[]): string[] => trimUsed([...used, ...links.map((link) => link.pid).filter((pid) => !used.includes(pid))]);

/** The request for the next step. */
export function practiceRequest(s: PracticeState, locale: string, action: { op: "start" } | { op: "pass" } | { op: "answer"; answer: string }): PracticeRequest | null {
  const used = trimUsed(s.used);
  if (action.op === "start") return { op: "start", locale, used };
  const tail = s.links.at(-1)?.pid;
  if (!tail || s.ended) return null;
  return action.op === "pass" ? { op: "pass", locale, used, tail } : { op: "answer", locale, used, tail, answer: action.answer.slice(0, 60) };
}

/** Folds one server step into the practice. A start replaces the chain (finishing the one on screen, if any). */
export function applyPractice(s: PracticeState, op: PracticeRequest["op"], res: PracticeStepResponse): PracticeState {
  if (op === "start") {
    const results = s.links.length > 0 && !s.ended ? [...s.results, namedIn(s)] : s.results;
    if (res.exhausted || res.links.length === 0) return { ...s, results, links: [], letter: "", last: null, ended: { could: [], named: 0 } };
    return { ...s, results, links: res.links, used: withUsed(s.used, res.links), letter: res.letter, last: null, ended: null };
  }
  if (op === "pass") {
    const named = namedIn(s);
    return { ...s, ended: { could: res.could, named }, results: [...s.results, named], last: null };
  }
  const links = [...s.links, ...res.links];
  const next = { ...s, links, used: withUsed(s.used, res.links), last: res.last, attempt: s.attempt + 1, letter: res.result === "ok" ? res.letter : s.letter };
  if (res.exhausted) {
    const named = namedIn(next);
    return { ...next, letter: "", ended: { could: [], named }, results: [...s.results, named] };
  }
  return next;
}
