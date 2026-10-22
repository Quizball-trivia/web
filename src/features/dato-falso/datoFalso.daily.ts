import { createDailyGameCall } from "@/lib/repositories/dailyGameApi";
import { createWordDailyApi, type WordRun, type WordRunStateBase } from "@/features/wordgames/daily/wordDaily.api";
import { toArt } from "./datoFalso.server";
import type { DfCard, DfCategory, DfJoker, DfSoloState } from "./datoFalso.view";

type Label = { en: string; es: string; tr: string; ru: string; pt?: string; ka: string };
type ServerArt = Parameters<typeof toArt>[0];
interface ServerCard { id: string; category: DfCategory; player: { name: Label; portrait: string | null }; options: Array<{ label: Label; art: ServerArt }> }
interface ServerResult { pick: number | null; cut: boolean; dbl: boolean; right: boolean; pts: number; card: ServerCard | null; fake: number | null; explain: Label | null }

/** Server-held run state (backend dato-falso.rules PublicRunState): an open card never carries its fake. */
export interface DatoFalsoDailyState extends WordRunStateBase {
  card: number;
  totalCards: number;
  cardMs: number;
  current: ServerCard | null;
  removed: number[];
  doubled: boolean;
  jokers: { cut: boolean; double: boolean };
  settled: (ServerResult & { reason: "pick" | "time" }) | null;
  results: ServerResult[];
  rights: number;
  disclosed: boolean;
}
export type DatoFalsoResult = "ok" | "late";

const BASE = "/api/v1/dato-falso";
const base = createWordDailyApi<DatoFalsoDailyState, DatoFalsoResult, { day: string; cards: ServerResult[] }>(BASE);
const request = createDailyGameCall(BASE);

/**
 * The shared word-daily client with this game's moves: an answer is a pick (the option's position), or with
 * `{ move: "joker" }`, a joker (its kind). `next` opens a card as in the other timed dailies.
 */
export const datoFalsoDailyApi: typeof base = {
  ...base,
  answer: (run, value, locale, extra) => {
    const joker = extra?.move === "joker";
    const body = { runId: run.run.id, version: run.run.version, ...(joker ? { kind: value } : { option: Number(value) }) };
    return request<WordRun<DatoFalsoDailyState> & { result: DatoFalsoResult }>(joker ? "/joker" : "/pick", "POST", body, locale, { timeoutMs: 5_000 });
  },
  pass: () => Promise.reject(new Error("unsupported")),
};

const pick = (label: Label, locale: string) => label[locale as keyof Label] ?? label.en;

export const localCard = (c: ServerCard, locale: string): DfCard => ({
  id: c.id,
  category: c.category,
  subject: { name: pick(c.player.name, locale), portrait: c.player.portrait, kind: c.category === "coachedClubs" ? "coach" : "player" },
  options: c.options.map((o, i) => ({ id: String(i), label: pick(o.label, locale), art: toArt(o.art) })),
  level: 2,
});

const jokersOf = (j: { cut: boolean; double: boolean }): DfJoker[] => [...(j.cut ? ["cut" as const] : []), ...(j.double ? ["double" as const] : [])];

/** A finished run whose day was corrected since comes back without cards: its result needs none. */
const NO_CARD: ServerCard = { id: "", category: "clubs", player: { name: { en: "", es: "", tr: "", ru: "", pt: "", ka: "" }, portrait: null }, options: [] };

/** The server run in the screens' shape, in the reader's language. Null before the first card is opened. */
export function toSoloState(s: DatoFalsoDailyState, locale: string): DfSoloState | null {
  const card = s.current ?? s.settled?.card ?? (s.done ? NO_CARD : null);
  if (!card) return null;
  const settled = s.settled;
  return {
    day: s.day,
    total: s.totalCards,
    index: s.card,
    card: localCard(card, locale),
    removed: s.removed.map(String),
    doubled: s.doubled,
    reveal: settled && settled.fake !== null && settled.explain
      ? { fake: String(settled.fake), explain: pick(settled.explain, locale), pick: settled.pick === null ? null : String(settled.pick), points: settled.pts }
      : null,
    jokersUsed: jokersOf(s.jokers),
    marks: s.results.map((r) => ({ right: r.right, points: r.pts, cut: r.cut, double: r.dbl, timedOut: r.pick === null })),
    score: s.score,
    status: s.done ? "done" : "playing",
    ranked: s.ranked,
    rank: s.rank,
    deadline: s.open ? s.deadline : null,
  };
}
