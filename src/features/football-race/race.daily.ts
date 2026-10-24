import type { AvatarCustomization } from "@/types/game";
import { createDailyGameCall } from "@/lib/repositories/dailyGameApi";
import { createWordDailyApi, type WordBoard, type WordBoardRow, type WordRun, type WordRunStateBase } from "@/features/wordgames/daily/wordDaily.api";
import type { WordDailyGame } from "@/features/wordgames/daily/wordDaily.games";
import type { WordDailyCalendar } from "@/features/wordgames/daily/wordDaily.logic";
import { raceCopy } from "./race.copy";
import type { PickResult } from "./race.engine";
import type { L10n, RaceNation } from "./race.rules";
import type { RaceView, RaceWording } from "./race.views";

/** Same calendar as the backend (football-race.days.ts): race #1 is the launch day. */
export const FOOTBALL_RACE_CALENDAR: WordDailyCalendar = { contentStart: "2026-10-17", rankedStart: "2026-10-17", publishedDays: 76 };

export const footballRaceDailyGame = (locale: string): WordDailyGame => {
  const copy = raceCopy(locale);
  return {
    modeId: "footballRace", route: "/horserace", roomGame: "football_race", brand: [copy.brandA, copy.brandB], hero: "/assets/demos/game-modes/football-horserace.webp",
    calendar: FOOTBALL_RACE_CALENDAR, tag: copy.dailyTag, lines: copy.soloRules,
  };
};

/** A label in the backend's four languages (Georgian and Turkish may be missing on a detail line). */
type Label = { en: string; es: string; ka?: string; tr?: string; ru?: string; pt?: string; de?: string };
export interface RaceDailyResult { stat: string; values: number[]; leaders: number[]; details: Array<Label | null> }

/** Server-held run state (backend football-race.types PublicRunState); the race has no clock, so it is never `open`. */
export interface RaceDailyState extends WordRunStateBase {
  release: string;
  cutoff: string;
  source: Label;
  tournament: { id: string; label: Label };
  /** By seat: index 0 is the player's nation (the day's order until one is chosen). */
  racers: Array<{ id: string; code: string; flag: string; name: Label }>;
  /** The nation the player races as; null until chosen (the choice closes at the first pick); absent from an older server. */
  nation?: string | null;
  target: number;
  /** Spaces a rival covers from its head start. */
  rivalTarget: number;
  positions: number[];
  eras: Array<{ id: string; label: Label }>;
  families: Array<{ id: string; label: Label }>;
  metrics: Array<{ id: string; family: string; unwanted: boolean; dir: "high" | "low"; decimals: number; kind: "count" | "rate" | "percent" | "year"; label: Label; keywords: string }>;
  stats: Array<{ id: string; scope: string; metric: string; family: string; unwanted: boolean }>;
  results: RaceDailyResult[];
  result: "won" | "lost" | null;
  picks: number;
}
type ServerState = Omit<RaceDailyState, "open" | "deadline" | "serverNow">;

const BASE = "/api/v1/football-race";
export type RaceMove = "pick" | "choose";
const base = createWordDailyApi<RaceDailyState, RaceMove, unknown>(BASE);
const request = createDailyGameCall(BASE);
// An older server has no choice and no rivalTarget: its rivals start 2 ahead, and the run plays as the day's first nation.
const clockless = <R extends { state: ServerState }>(r: R) => ({
  ...r, state: { ...r.state, rivalTarget: r.state.rivalTarget ?? r.state.target - 2, open: false, deadline: null, serverNow: new Date().toISOString() },
});
const withRun = (data: WordRun<RaceDailyState> | { run: null }) => ("state" in data ? clockless(data as unknown as { run: { id: string; version: number }; state: ServerState }) : data);

/**
 * The shared word-daily client with the race's own moves (no clock, no next, no pass): a pick, or, with
 * `{ move: "choose" }`, the nation to race as.
 */
export const footballRaceDailyApi: typeof base = {
  ...base,
  current: (day, locale) => base.current(day, locale).then(withRun),
  start: (day, contentVersion, locale, timeoutMs) => base.start(day, contentVersion, locale, timeoutMs).then((r) => clockless(r as unknown as { run: WordRun<RaceDailyState>["run"]; state: ServerState })),
  answer: (run, value, locale, extra) => {
    const move: RaceMove = extra?.move === "choose" ? "choose" : "pick";
    const body = { runId: run.run.id, version: run.run.version, ...(move === "choose" ? { nation: value } : { stat: value }) };
    return request<{ run: WordRun<RaceDailyState>["run"]; state: ServerState }>(`/${move}`, "POST", body, locale, { timeoutMs: 8_000 }).then((r) => ({ ...clockless(r), result: move }));
  },
  next: () => Promise.reject(new Error("unsupported")),
  pass: () => Promise.reject(new Error("unsupported")),
};

/** The day's board in picks: a win in fewer picks ranks higher, and every win ranks above every loss (the server's order). */
export const loadRaceBoard = (day: string, locale: string): Promise<WordBoard> => footballRaceDailyApi.leaderboard(day, locale).then((board) => {
  const picks = (row: WordBoardRow) => ({ ...row, score: (row as WordBoardRow & { picks?: number }).picks ?? 0 });
  return { ...board, top: board.top.map(picks), me: board.me && picks(board.me) };
});

const tx = (label: Label, locale: string) => (locale === "ka" || locale === "tr" || locale === "ru" ? label[locale] ?? label.en : locale === "es" ? label.es : locale === "pt" ? label.pt ?? label.en : locale === "de" ? label.de ?? label.en : label.en);
/** A label already in the player's language, in the shape the screens read. */
const same = (text: string): L10n => ({ en: text, es: text });

export function toDailyWording(s: RaceDailyState, locale: string): RaceWording {
  return {
    version: s.release, cutoff: s.cutoff, source: same(tx(s.source, locale)), real: true,
    nations: s.racers.map((n, tier): RaceNation => ({ id: n.id, code: n.code, flag: n.flag, name: same(tx(n.name, locale)), tier })),
    scopes: s.eras.map((e) => ({ id: e.id, label: same(tx(e.label, locale)), tournament: s.tournament.id })),
    families: s.families.map((f) => ({ id: f.id, label: same(tx(f.label, locale)) })),
    metrics: s.metrics.map((m) => ({ ...m, label: same(tx(m.label, locale)) })),
    tournaments: [{ id: s.tournament.id, label: same(tx(s.tournament.label, locale)), scopes: s.eras.map((e) => e.id), nations: s.racers.map((n) => n.id) }],
  };
}

const pickOf = (r: RaceDailyResult, locale: string): PickResult => ({
  seat: 0, statId: r.stat, auto: false, values: r.values, leaders: r.leaders, details: r.details.map((d) => (d ? same(tx(d, locale)) : null)),
});

/** The run as the race screens see it: you are seat 0, the rivals are nations nobody plays. `showing`: the last pick's reveal. */
export function toDailyView(s: RaceDailyState, wording: RaceWording, me: { name: string; avatar: AvatarCustomization }, showing: boolean, locale: string): RaceView {
  const history = s.results.map((r) => pickOf(r, locale));
  const last = history[history.length - 1];
  return {
    tournament: wording.tournaments![0].label,
    phase: showing && last ? "reveal" : s.done ? "over" : "pick",
    round: s.results.length,
    target: s.target, finish: "instant", suddenDeath: false,
    seats: wording.nations.map((nation, seat) => ({
      seat, name: seat === 0 ? me.name : nation.name.en, avatar: seat === 0 ? me.avatar : undefined, nation, position: s.positions[seat], picked: false,
    })),
    mySeat: 0, myPick: null, scopes: s.eras.map((e) => e.id), stats: s.stats, history,
    reveal: showing && last ? { item: last, index: 0, total: 1, open: true } : null,
    standings: null, winners: null, endedBy: null,
  };
}

/** The run before its first pick as it looks racing as `nation`: that nation in seat 0, the rest in the day's order. */
export const asNation = (s: RaceDailyState, nation: string): RaceDailyState => {
  const mine = s.racers.find((r) => r.id === nation);
  return mine ? { ...s, racers: [mine, ...s.racers.filter((r) => r.id !== nation)] } : s;
};

/** 🟩 your nation moved, 🟥 only a rival moved, 🏁 / ❌ how it ended: no stat or nation in it. */
export const dailyShareLine = (s: RaceDailyState) =>
  s.results.map((r) => (r.leaders.includes(0) ? "🟩" : "🟥")).join("") + (s.result === "won" ? "🏁" : s.result === "lost" ? "❌" : "");
