import type { RoomClientRules } from "@/features/room/useRoomConnection";
import type { AvatarCustomization } from "@/types/game";
import type { DraftState } from "./race.draft";
import type { PickResult } from "./race.engine";
import type { L10n, RaceMetric, RaceNation } from "./race.rules";
import type { RaceView, RaceWording } from "./race.views";

/**
 * The server's view of a Football Horserace room match (football-race.engine.ts `viewOf`): labels already in the
 * seat's language, values only for picks already revealed.
 */
export interface ServerPick { seat: number; stat: string; auto: boolean; values: number[]; leaders: number[]; details: Array<string | null> }
export interface FootballRaceServerView {
  phase: "draft" | "intro" | "pick" | "reveal" | "over";
  cancelled: boolean;
  format: "duel" | "party";
  round: number;
  target: number;
  tournament: { id: string; label: string };
  source: string;
  cutoff: string;
  eras: Array<{ id: string; label: string }>;
  families: Array<{ id: string; label: string }>;
  metrics: Array<{ id: string; family: string; unwanted: boolean; dir: "high" | "low"; decimals: number; kind: RaceMetric["kind"]; label: string; keywords: string }>;
  stats: Array<{ id: string; scope: string; metric: string; family: string; unwanted: boolean }>;
  nations: Array<{ id: string; code: string; flag: string; name: string }>;
  draft: { order: number[]; turn: number | null; picks: Array<string | null>; auto: boolean[] };
  seats: Array<{ seat: number; status: "in" | "away" | "withdrawn"; nation: string | null; position: number; picked: boolean; quit: boolean }>;
  mySeat: number;
  myPick: string | null;
  history: ServerPick[];
  reveal: { item: ServerPick; index: number; total: number; open: boolean } | null;
  finale: ServerPick | null;
  standings: Array<{ seat: number; points: number; roundWins: number; place: number }> | null;
  winners: number[] | null;
  endedBy: "line" | "stats" | "rounds" | "left" | null;
  deadline: string | null;
}

export type FootballRaceCommand = { type: "draft"; turn: number; nation: string } | { type: "pick"; round: number; stat: string };

/** A draft pick belongs to its turn, a stat pick to its round; each is settled once the server has moved past it. */
export const footballRaceRoomRules: RoomClientRules<FootballRaceCommand> = {
  slot: (command) => (command.type === "draft" ? `d:${command.turn}` : `p:${command.round}`),
  settled: (raw, command) => {
    const view = raw as Partial<FootballRaceServerView>;
    if (command.type === "draft") return view.phase !== "draft" || view.draft?.turn !== command.turn;
    return view.phase !== "pick" || view.round !== command.round || view.myPick === command.stat;
  },
};

/** A label the server already put in the seat's language, in the shape the screens read (any locale shows it). */
const same = (text: string): L10n => ({ en: text, es: text });

const nationOf = (n: FootballRaceServerView["nations"][number], tier: number): RaceNation => ({ id: n.id, code: n.code, flag: n.flag, name: same(n.name), tier });

const pickOf = (p: ServerPick): PickResult => ({
  seat: p.seat, statId: p.stat, auto: p.auto, values: p.values, leaders: p.leaders, details: p.details.map((d) => (d === null ? null : same(d))),
});

/** The wording the screens need, from the server view (labels only). */
export function toServerWording(v: FootballRaceServerView): RaceWording {
  return {
    version: "server", cutoff: v.cutoff, source: same(v.source), real: true,
    nations: v.nations.map(nationOf),
    scopes: v.eras.map((e) => ({ id: e.id, label: same(e.label), tournament: v.tournament.id })),
    families: v.families.map((f) => ({ id: f.id, label: same(f.label) })),
    metrics: v.metrics.map((m) => ({ id: m.id, family: m.family, dir: m.dir, unwanted: m.unwanted, decimals: m.decimals, kind: m.kind, label: same(m.label), keywords: m.keywords })),
    tournaments: [{ id: v.tournament.id, label: same(v.tournament.label), scopes: v.eras.map((e) => e.id), nations: v.nations.map((n) => n.id) }],
  };
}

/** The server view as the screens' RaceView; `people` gives each seat's name and face (from the room snapshot). */
export function toServerRaceView(v: FootballRaceServerView, people: Array<{ name: string; avatar: AvatarCustomization }>): RaceView {
  const nations = new Map(v.nations.map((n, i) => [n.id, nationOf(n, i)]));
  const placeholder: RaceNation = { id: "?", code: "?", name: same("…"), tier: 0 };
  return {
    tournament: same(v.tournament.label),
    phase: v.phase === "draft" ? "intro" : v.phase,
    round: v.round,
    target: v.target,
    finish: "instant",
    suddenDeath: false,
    seats: v.seats.map((s) => ({
      seat: s.seat, name: people[s.seat]?.name ?? "—", avatar: people[s.seat]?.avatar,
      nation: (s.nation && nations.get(s.nation)) || placeholder, position: s.position, picked: s.picked,
      ...(s.status === "away" ? { status: "away" as const } : s.status === "withdrawn" ? { status: "left" as const } : {}),
    })),
    mySeat: v.mySeat,
    myPick: v.myPick,
    scopes: v.eras.map((e) => e.id),
    stats: v.stats,
    history: v.history.map(pickOf),
    reveal: v.reveal ? { item: pickOf(v.reveal.item), index: v.reveal.index, total: v.reveal.total, open: v.reveal.open } : null,
    standings: v.standings ? v.standings.map((s) => {
      const own = v.history.filter((p) => p.seat === s.seat && !p.auto).length;
      return { seat: s.seat, place: s.place, position: s.points, goodCalls: s.roundWins, backfires: own - s.roundWins };
    }) : null,
    winners: v.winners,
    endedBy: v.endedBy,
  };
}

/** The server's draft in the draft screen's shape. */
export const toServerDraft = (v: FootballRaceServerView, deadlineMs: number): DraftState => ({
  order: v.draft.order, picks: v.draft.picks, auto: v.draft.auto, turn: v.draft.turn ?? v.draft.order.length, deadline: deadlineMs, done: v.draft.turn === null,
});
