import { createDailyGameCall } from "@/lib/repositories/dailyGameApi";
import { createWordDailyApi, type WordRun, type WordRunStateBase } from "@/features/wordgames/daily/wordDaily.api";
import { textIn, type CxBoard, type CxSoloState, type CxSolved, type CxText, type CxTier, type CxVerdict } from "./conexiones.logic";

type Localized = { en: string; es: string; ka: string; tr: string; ru: string; pt?: string; de?: string };
interface ServerTile { id: string; name: { en: string; ka: string; ru: string }; portrait: string | null }
interface ServerGroup { id: string; tier: CxTier; link: Localized; note: Localized | null; members: string[]; missed: boolean }

/** Server-held run state (backend conexiones.rules PublicRunState): an unsolved group never leaves the server while the run is on. */
export interface ConexionesDailyState extends WordRunStateBase {
  opened: boolean;
  tiles: ServerTile[];
  groups: ServerGroup[];
  mistakes: number;
  mistakesLeft: number;
  tries: Array<{ ids: string[]; verdict: CxVerdict }>;
  tiers: (CxTier | null)[][] | null;
  startedAt: string | null;
  won: boolean;
  found: number;
  secs: number;
  disclosed: boolean;
}
export type ConexionesResult = never;

const BASE = "/api/v1/conexiones";
const base = createWordDailyApi<ConexionesDailyState, ConexionesResult, { day: string; groups: ServerGroup[] }>(BASE);
const request = createDailyGameCall(BASE);

/** The shared word-daily client with this game's moves: `next` opens the board (and starts the time), an answer is four tile ids. */
export const conexionesDailyApi: typeof base = {
  ...base,
  next: (run, locale) => request<WordRun<ConexionesDailyState>>("/open", "POST", { runId: run.run.id, version: run.run.version }, locale, { timeoutMs: 5_000 }),
  answer: (run, value, locale) =>
    request<WordRun<ConexionesDailyState> & { result: ConexionesResult }>("/guess", "POST", { runId: run.run.id, version: run.run.version, ids: value.split(",") }, locale, { timeoutMs: 5_000 }),
  pass: () => Promise.reject(new Error("unsupported")),
};

const asText = (t: Localized): CxText => ({ ...t });

/** The board as the screens draw it: every tile, no groups (the server keeps them until they are out). */
export const boardOf = (s: ConexionesDailyState): CxBoard => ({
  id: s.day,
  tiles: s.tiles.map((t) => ({ id: t.id, name: t.name.en, nameKa: t.name.ka, nameRu: t.name.ru, portrait: t.portrait })),
  groups: [],
});

/** The server run in the screens' shape. */
export function toSoloState(s: ConexionesDailyState, locale: string): CxSoloState {
  const solved: CxSolved[] = s.groups.map((g) => ({ groupId: g.id, tier: g.tier, link: asText(g.link), note: g.note ? textIn(asText(g.note), locale) : null, members: g.members, by: g.missed ? null : 0, missed: g.missed }));
  const out = new Set(s.groups.flatMap((g) => g.members));
  const startedAt = s.startedAt ? Date.parse(s.startedAt) : Date.parse(s.serverNow);
  return {
    day: s.day,
    boardId: s.day,
    order: s.done ? [] : s.tiles.map((t) => t.id).filter((id) => !out.has(id)),
    solved,
    mistakes: s.mistakes,
    tries: s.tries.map((t, i) => ({ key: [...t.ids].sort().join("|"), verdict: t.verdict, tiers: s.tiers?.[i] ?? [] })),
    status: !s.done ? "playing" : s.won ? "won" : "lost",
    ranked: s.ranked,
    rank: s.rank,
    startedAt,
    endedAt: s.done ? startedAt + s.secs * 1000 : null,
    found: s.found,
    // No tiles: the day was corrected since, and this run's groups are not served again (so no promise of them).
    groupsLater: s.done && !s.won && !s.disclosed && s.tiles.length > 0,
  };
}

/** The tiles still on the board in the player's own order: a stored order (it can be edited or stale) only says which of them come first, each once. */
export function withArrangement(onBoard: readonly string[], arranged: readonly string[] | null): string[] {
  if (!arranged) return [...onBoard];
  const kept = [...new Set(arranged)].filter((id) => onBoard.includes(id));
  return [...kept, ...onBoard.filter((id) => !kept.includes(id))];
}
