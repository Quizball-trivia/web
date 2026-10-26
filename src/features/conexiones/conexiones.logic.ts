/** Conexiones futboleras: 16 players, 4 hidden groups of 4. Pure rules for the daily and the 1v1; no clock or RNG of their own. */

export type CxTier = 1 | 2 | 3 | 4;
export type CxText = { en: string; es?: string } & Partial<Record<string, string>>;

export interface CxTile { id: string; name: string; nameKa?: string | null; nameRu?: string | null; portrait?: string | null }
export interface CxGroup { id: string; tier: CxTier; link: CxText; note?: string | null; members: readonly string[]; decoys: readonly CxText[] }
export interface CxBoard { id: string; tiles: readonly CxTile[]; groups: readonly CxGroup[] }

export interface CxSolved { groupId: string; tier: CxTier; link: CxText; note?: string | null; members: string[]; by: number | null; missed?: boolean }
export type CxVerdict = "right" | "oneAway" | "wrong";

export const SOLO_MISTAKES = 4;
export const DUEL_BOARDS = 5;
export const DUEL_MISSES = 6;
export const TURN_MS = 60_000;
export const NAME_MS = 30_000;
export const REVEAL_MS = 5_000;

export const tryKey = (ids: readonly string[]) => [...ids].sort().join("|");
export const textIn = (t: CxText, locale: string) => t[locale] ?? (locale === "pt" ? t.es : undefined) ?? t.en;
export const tileName = (t: CxTile, locale: string) => (locale === "ka" && t.nameKa) || (locale === "ru" && t.nameRu) || t.name;

export function judge(board: CxBoard, ids: readonly string[]): { verdict: CxVerdict; group?: CxGroup } {
  if (new Set(ids).size !== 4) throw new Error("four distinct tiles");
  let best = 0;
  for (const g of board.groups) {
    const hits = ids.filter((id) => g.members.includes(id)).length;
    if (hits === 4) return { verdict: "right", group: g };
    best = Math.max(best, hits);
  }
  return { verdict: best === 3 ? "oneAway" : "wrong" };
}

const solvedOf = (g: CxGroup, by: number | null, missed = false): CxSolved => ({ groupId: g.id, tier: g.tier, link: g.link, note: g.note, members: [...g.members], by, missed });
const without = (order: readonly string[], ids: readonly string[]) => order.filter((id) => !ids.includes(id));

// ── Solo daily ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface CxSoloState {
  day: string; boardId: string; order: string[]; solved: CxSolved[]; mistakes: number;
  /** A tile's tier is null on a lost daily until its day closes (the server keeps the missed groups until then). */
  tries: { key: string; verdict: CxVerdict; tiers: (CxTier | null)[] }[];
  status: "playing" | "won" | "lost"; ranked: boolean; rank?: number; startedAt: number; endedAt: number | null;
  /** Groups found, as the server counts them (a finished run whose day was corrected comes back without its groups). */
  found?: number;
  /** A lost daily on a day still open: its missed groups come once the day closes. */
  groupsLater?: boolean;
}

export function newSolo(board: CxBoard, day: string, now: number, ranked = true): CxSoloState {
  return { day, boardId: board.id, order: board.tiles.map((t) => t.id), solved: [], mistakes: 0, tries: [], status: "playing", ranked, startedAt: now, endedAt: null };
}

export type CxSoloOutcome = CxVerdict | "repeat";

export function soloGuess(board: CxBoard, s: CxSoloState, ids: readonly string[], now: number): { state: CxSoloState; outcome: CxSoloOutcome } {
  if (s.status !== "playing" || !ids.every((id) => s.order.includes(id))) return { state: s, outcome: "repeat" };
  const key = tryKey(ids);
  if (s.tries.some((t) => t.key === key)) return { state: s, outcome: "repeat" };
  const { verdict, group } = judge(board, ids);
  const tiers = ids.map((id) => board.groups.find((g) => g.members.includes(id))!.tier);
  const tries = [...s.tries, { key, verdict, tiers }];
  if (verdict === "right" && group) {
    const solved = [...s.solved, solvedOf(group, 0)];
    const won = solved.length === board.groups.length;
    return { state: { ...s, tries, solved, order: without(s.order, group.members), status: won ? "won" : "playing", endedAt: won ? now : null }, outcome: verdict };
  }
  const mistakes = s.mistakes + 1;
  if (mistakes < SOLO_MISTAKES) return { state: { ...s, tries, mistakes }, outcome: verdict };
  const rest = board.groups.filter((g) => !s.solved.some((x) => x.groupId === g.id)).sort((a, b) => a.tier - b.tier);
  return { state: { ...s, tries, mistakes, solved: [...s.solved, ...rest.map((g) => solvedOf(g, null, true))], order: [], status: "lost", endedAt: now }, outcome: verdict };
}

export const soloFound = (s: CxSoloState) => s.found ?? s.solved.filter((x) => !x.missed).length;

/** One row per try: the tier of each tile picked, like the other dailies' share grids. */
export function shareGrid(s: CxSoloState): string {
  const sq: Record<CxTier, string> = { 1: "🟨", 2: "🟧", 3: "🟥", 4: "🟪" };
  return s.tries.map((t) => t.tiers.map((x) => (x ? sq[x] : "⬜")).join("")).join("\n");
}

// ── 1v1 duel: one attempt per turn, hit or miss; the last four are named from four links ─────────────────────────

export type CxSeat = 0 | 1;
export interface CxTry { seat: CxSeat; ids: string[]; verdict: CxVerdict | "timeout" }
export interface CxLast { seat: CxSeat; kind: CxVerdict | "timeout" | "named" | "misnamed" | "repeat"; ids?: string[]; groupId?: string; pick?: string }

export interface CxDuelState {
  boards: readonly CxBoard[]; index: number; firstStarter: CxSeat; turn: CxSeat; scores: [number, number];
  order: string[]; solved: CxSolved[]; misses: number; tries: CxTry[];
  phase: "turn" | "name" | "reveal" | "over"; nameOptions: CxText[] | null; namePick: string | null;
  last: CxLast | null; timeouts: [number, number]; deadline: number;
  perBoard: [number, number][];
  result: { winner: CxSeat | null; reason: "score" | "forfeit" } | null;
}

const other = (s: CxSeat): CxSeat => (s === 0 ? 1 : 0);
export const starterOf = (s: Pick<CxDuelState, "firstStarter">, index: number): CxSeat => (index % 2 === 0 ? s.firstStarter : other(s.firstStarter));

function startBoard(s: CxDuelState, index: number, now: number): CxDuelState {
  const board = s.boards[index];
  return {
    ...s, index, turn: starterOf(s, index), order: board.tiles.map((t) => t.id), solved: [], misses: 0, tries: [], phase: "turn",
    nameOptions: null, namePick: null, last: null, deadline: now + TURN_MS, perBoard: [...s.perBoard, [0, 0]],
  };
}

export function newDuel(boards: readonly CxBoard[], firstStarter: CxSeat, now: number): CxDuelState {
  const base: CxDuelState = {
    boards, index: 0, firstStarter, turn: firstStarter, scores: [0, 0], order: [], solved: [], misses: 0, tries: [],
    phase: "turn", nameOptions: null, namePick: null, last: null, timeouts: [0, 0], deadline: now, perBoard: [], result: null,
  };
  return startBoard(base, 0, now);
}

const award = (s: CxDuelState, seat: CxSeat): Pick<CxDuelState, "scores" | "perBoard"> => {
  const scores: [number, number] = [...s.scores];
  scores[seat] += 1;
  const perBoard = s.perBoard.map((p, i) => (i === s.index ? (seat === 0 ? [p[0] + 1, p[1]] : [p[0], p[1] + 1]) : p)) as [number, number][];
  return { scores, perBoard };
};

const toReveal = (s: CxDuelState, now: number): CxDuelState => {
  const board = s.boards[s.index];
  const rest = board.groups.filter((g) => !s.solved.some((x) => x.groupId === g.id)).map((g) => solvedOf(g, null, true));
  return { ...s, solved: [...s.solved, ...rest], order: [], phase: "reveal", deadline: now + REVEAL_MS };
};

/** The options for the last group: its link and its three decoys, in an order fixed by the caller's shuffle. */
function toNaming(s: CxDuelState, now: number, shuffle: <T>(xs: T[]) => T[]): CxDuelState {
  const g = s.boards[s.index].groups.find((x) => !s.solved.some((y) => y.groupId === x.id))!;
  return { ...s, phase: "name", nameOptions: shuffle([g.link, ...g.decoys.slice(0, 3)]), namePick: null, deadline: now + NAME_MS };
}

export function duelSubmit(s: CxDuelState, seat: CxSeat, ids: readonly string[], now: number, shuffle: <T>(xs: T[]) => T[]): CxDuelState {
  if (s.phase !== "turn" || s.turn !== seat || ids.length !== 4 || !ids.every((id) => s.order.includes(id))) return s;
  const key = tryKey(ids);
  if (s.tries.some((t) => t.verdict !== "timeout" && tryKey(t.ids) === key)) return { ...s, last: { seat, kind: "repeat", ids: [...ids] } };
  const board = s.boards[s.index];
  const { verdict, group } = judge(board, ids);
  const timeouts: [number, number] = [...s.timeouts];
  timeouts[seat] = 0;
  const tries = [...s.tries, { seat, ids: [...ids], verdict }];
  const next: CxDuelState = { ...s, tries, timeouts, turn: other(seat), deadline: now + TURN_MS, last: { seat, kind: verdict, ids: [...ids], groupId: group?.id } };
  if (verdict === "right" && group) {
    const solved = [...s.solved, solvedOf(group, seat)];
    const scored: CxDuelState = { ...next, ...award(s, seat), solved, order: without(s.order, group.members) };
    return solved.length === board.groups.length - 1 ? toNaming(scored, now, shuffle) : scored;
  }
  const misses = s.misses + 1;
  return misses >= DUEL_MISSES ? toReveal({ ...next, misses }, now) : { ...next, misses };
}

export function duelName(s: CxDuelState, seat: CxSeat, pick: string, now: number): CxDuelState {
  if (s.phase !== "name" || s.turn !== seat) return s;
  const g = s.boards[s.index].groups.find((x) => !s.solved.some((y) => y.groupId === x.id))!;
  const right = pick === g.link.en;
  const timeouts: [number, number] = [...s.timeouts];
  timeouts[seat] = 0;
  const named: CxDuelState = {
    ...s, ...(right ? award(s, seat) : {}), timeouts, namePick: pick,
    solved: [...s.solved, solvedOf(g, right ? seat : null, !right)], order: [],
    last: { seat, kind: right ? "named" : "misnamed", groupId: g.id, pick },
  };
  return { ...named, phase: "reveal", deadline: now + REVEAL_MS };
}

/** The clock ran out: a turn counts as a miss, a naming as a wrong pick. Two timeouts in a row forfeit the match. */
export function duelTimeout(s: CxDuelState, now: number): CxDuelState {
  if (s.phase === "reveal") return duelNext(s, now);
  if (s.phase !== "turn" && s.phase !== "name") return s;
  const seat = s.turn;
  const timeouts: [number, number] = [...s.timeouts];
  timeouts[seat] += 1;
  if (timeouts[seat] >= 2) return { ...s, timeouts, phase: "over", result: { winner: other(seat), reason: "forfeit" }, last: { seat, kind: "timeout" } };
  if (s.phase === "name") {
    const g = s.boards[s.index].groups.find((x) => !s.solved.some((y) => y.groupId === x.id))!;
    return { ...s, timeouts, solved: [...s.solved, solvedOf(g, null, true)], order: [], phase: "reveal", deadline: now + REVEAL_MS, last: { seat, kind: "timeout" } };
  }
  const misses = s.misses + 1;
  const next: CxDuelState = { ...s, timeouts, misses, turn: other(seat), deadline: now + TURN_MS, tries: [...s.tries, { seat, ids: [], verdict: "timeout" }], last: { seat, kind: "timeout" } };
  return misses >= DUEL_MISSES ? toReveal(next, now) : next;
}

export function duelNext(s: CxDuelState, now: number): CxDuelState {
  if (s.phase !== "reveal") return s;
  if (s.index + 1 < s.boards.length) return startBoard(s, s.index + 1, now);
  const [a, b] = s.scores;
  return { ...s, phase: "over", result: { winner: a === b ? null : a > b ? 0 : 1, reason: "score" } };
}

export function duelForfeit(s: CxDuelState, seat: CxSeat): CxDuelState {
  if (s.phase === "over") return s;
  return { ...s, phase: "over", result: { winner: other(seat), reason: "forfeit" } };
}

/** The tiles a try names, in board order, for the "rival tried…" line. */
export const namesOf = (board: CxBoard, ids: readonly string[], locale: string) =>
  ids.map((id) => board.tiles.find((t) => t.id === id)).filter((t): t is CxTile => Boolean(t)).map((t) => tileName(t, locale));
