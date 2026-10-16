import { describe, expect, it } from "vitest";
import { standings, startMatch, submitPick, tick, type EngineConfig, type EngineState } from "../race.engine";
import { compare, dealMatch, formatValue, searchStats, targetFor, toPublicStats, type RaceMetric, type RacePack } from "../race.rules";
import { toRaceView, toWording } from "../race.views";
import { inventedRacePack } from "@/features/playground/fixtures/football-race";

const metric = (id: string, extra: Partial<RaceMetric> = {}): RaceMetric =>
  ({ id, family: "results", dir: "high", unwanted: false, decimals: 0, kind: "count", label: { en: id, es: id }, keywords: "", ...extra });

// Three racers; each stat's leader is spelled out by its values.
const PACK: RacePack = {
  version: "t", cutoff: "2031-01-01", real: false, source: { en: "", es: "" },
  nations: ["A", "B", "C"].map((id, tier) => ({ id, name: { en: id, es: id }, tier })),
  scopes: [{ id: "S", label: { en: "Scope", es: "Ámbito" } }], families: [{ id: "results", label: { en: "Results", es: "Resultados" } }],
  metrics: [metric("a1"), metric("a2"), metric("a3"), metric("b1"), metric("b2"), metric("c1"), metric("tie"), metric("low", { dir: "low" }), metric("rate", { decimals: 1, kind: "percent" }), metric("flat")],
  stats: [
    { id: "S:a1", scope: "S", metric: "a1", values: { A: 9, B: 2, C: 1 } },
    { id: "S:a2", scope: "S", metric: "a2", values: { A: 8, B: 2, C: 1 } },
    { id: "S:a3", scope: "S", metric: "a3", values: { A: 7, B: 2, C: 1 } },
    { id: "S:b1", scope: "S", metric: "b1", values: { A: 1, B: 9, C: 2 } },
    { id: "S:b2", scope: "S", metric: "b2", values: { A: 1, B: 8, C: 2 } },
    { id: "S:c1", scope: "S", metric: "c1", values: { A: 1, B: 2, C: 9 } },
    { id: "S:tie", scope: "S", metric: "tie", values: { A: 5, B: 5, C: 1 } },
    { id: "S:low", scope: "S", metric: "low", values: { A: 3, B: 2, C: 1 } },
    { id: "S:rate", scope: "S", metric: "rate", values: { A: 56.25, B: 55.56, C: 40 } },
    { id: "S:flat", scope: "S", metric: "flat", values: { A: 4, B: 4, C: 4 } },
  ],
};
const metricOf = (id: string) => PACK.metrics.find((m) => m.id === id)!;
const statOf = (id: string) => PACK.stats.find((s) => s.id === id)!;
const cfg = (over: Partial<EngineConfig> = {}): EngineConfig => ({
  pack: PACK, racers: ["A", "B", "C"], statIds: PACK.stats.map((s) => s.id).filter((id) => id !== "S:flat"), target: 2, seed: 1,
  introMs: 1000, pickMs: 10_000, revealStepMs: 1000, revealTailMs: 500, maxRounds: 12, finish: "round", ...over,
});
const open = (c: EngineConfig, seats = 3): EngineState => tick(startMatch(seats, c, 0), c, 1000);
const pickAll = (s: EngineState, c: EngineConfig, picks: string[], now: number) => picks.reduce((st, id, seat) => submitPick(st, c, seat, id, now).state, s);

/** Steps the reveal on its own deadlines: `opened` picks with their values out (default: the whole round, into the next phase). */
function reveal(s: EngineState, c: EngineConfig, opened = Infinity): EngineState {
  let state = s;
  const shown = () => (state.phase === "reveal" ? state.revealIndex + (state.revealOpen ? 1 : 0) : Infinity);
  while (state.phase === "reveal" && shown() < opened) state = tick(state, c, state.deadline);
  return state;
}

describe("compare", () => {
  it("names the leader, in either direction", () => {
    expect(compare(statOf("S:a1"), metricOf("a1"), ["A", "B", "C"])?.leaders).toEqual([0]);
    expect(compare(statOf("S:low"), metricOf("low"), ["A", "B", "C"])?.leaders).toEqual([2]);
  });
  it("keeps a tie at the top: every tied leader moves", () => {
    expect(compare(statOf("S:tie"), metricOf("tie"), ["A", "B", "C"])?.leaders).toEqual([0, 1]);
  });
  it("refuses a stat where everyone is level, a value is missing, or the leader and a chaser would show the same number", () => {
    expect(compare(statOf("S:flat"), metricOf("flat"), ["A", "B", "C"])).toBeNull();
    expect(compare(statOf("S:a1"), metricOf("a1"), ["A", "B", "Z"])).toBeNull();
    expect(compare({ ...statOf("S:rate"), values: { A: 56.25, B: 56.26, C: 40 } }, metricOf("rate"), ["A", "B", "C"])).toBeNull();
    expect(compare(statOf("S:rate"), metricOf("rate"), ["A", "B", "C"])?.leaders).toEqual([0]);
  });
  it("judges 'same number on screen' with the rounding the screen uses", () => {
    // 2.55 and 2.56 both show as 2.6 at one decimal: not playable, whatever toFixed would say.
    const m = metricOf("rate");
    expect(formatValue(m, 2.55, "en")).toBe(formatValue(m, 2.56, "en"));
    expect(compare({ ...statOf("S:rate"), values: { A: 2.55, B: 2.56, C: 1 } }, m, ["A", "B", "C"])).toBeNull();
  });
});

describe("race engine", () => {
  it("moves the racer that leads a pick, whoever picked it", () => {
    const c = cfg({ target: 9 });
    // Seat 1 picks a stat seat 0's racer leads: seat 0 moves twice, seat 2 once.
    const s = reveal(pickAll(open(c), c, ["S:a1", "S:a2", "S:c1"], 2000), c, 3);
    expect(s.positions).toEqual([2, 0, 1]);
  });

  it("shows one pick at a time, each step on its own deadline: question, then values and the move", () => {
    const c = cfg({ target: 9 });
    let s = pickAll(open(c), c, ["S:a1", "S:b1", "S:c1"], 2000);
    expect(s).toMatchObject({ phase: "reveal", revealIndex: 0, revealOpen: false, deadline: 2300 });
    expect(s.positions).toEqual([0, 0, 0]);
    expect(tick(s, c, 2299)).toBe(s);
    s = tick(s, c, 2300);
    expect(s).toMatchObject({ revealIndex: 0, revealOpen: true, deadline: 3000 });
    expect(s.positions).toEqual([1, 0, 0]);
    s = tick(s, c, 3000);
    expect(s).toMatchObject({ revealIndex: 1, revealOpen: false });
    expect(s.positions).toEqual([1, 0, 0]);
    // A late wake moves one step per call, never past a step.
    s = tick(s, c, 60_000);
    expect(s).toMatchObject({ phase: "reveal", revealIndex: 1, revealOpen: true });
    expect(reveal(s, c).phase).toBe("pick");
  });

  it("refuses a pick out of turn, repeated, unknown or already played", () => {
    const c = cfg({ target: 9 });
    expect(submitPick(startMatch(3, c, 0), c, 0, "S:a1", 10).error).toBe("not_open");
    let s = open(c);
    s = submitPick(s, c, 0, "S:a1", 2000).state;
    expect(submitPick(s, c, 0, "S:a2", 2100).error).toBe("already_picked");
    expect(submitPick(s, c, 1, "S:nope", 2100).error).toBe("unknown_stat");
    expect(submitPick(s, c, 1, "S:flat", 2100).error).toBe("unknown_stat");
    expect(submitPick(s, c, 1, "S:b1", 20_000).error).toBe("not_open");
    expect(submitPick(s, c, 7, "S:b1", 2100).error).toBe("bad_seat");
    const round2 = reveal(submitPick(submitPick(s, c, 1, "S:b1", 2200).state, c, 2, "S:c1", 2300).state, c);
    expect(round2.phase).toBe("pick");
    expect(submitPick(round2, c, 0, "S:a1", round2.deadline - 1).error).toBe("stat_used");
  });

  it("two seats may pick the same stat in a round: it counts once per pick", () => {
    const c = cfg({ target: 9 });
    const s = reveal(pickAll(open(c), c, ["S:a1", "S:a1", "S:c1"], 2000), c, 3);
    expect(s.positions).toEqual([2, 0, 1]);
    expect(s.used).toEqual(["S:a1", "S:c1"]);
  });

  it("gives a seat that ran out of time a random unused stat, marked automatic", () => {
    const c = cfg({ target: 9 });
    let s = open(c);
    s = submitPick(s, c, 0, "S:a1", 2000).state;
    s = tick(s, c, 11_000);
    expect(s.phase).toBe("reveal");
    expect(s.reveal).toHaveLength(3);
    expect(s.reveal!.filter((r) => r.auto).map((r) => r.seat).sort()).toEqual([1, 2]);
    expect(new Set(s.reveal!.map((r) => r.statId)).size).toBe(3);
  });

  it("with fewer unused stats than seats, the clock doubles up rather than leave a seat without a pick", () => {
    const c = cfg({ target: 9, statIds: ["S:a1", "S:b1"] });
    let s = open(c);
    s = submitPick(s, c, 0, "S:a1", 2000).state;
    s = tick(s, c, 11_000);
    expect(s.reveal).toHaveLength(3);
    expect(s.revealPlanned).toBe(3);
    expect(s.reveal!.every((r) => ["S:a1", "S:b1"].includes(r.statId))).toBe(true);
  });

  it("plays on while a single stat is left, and ends on 'stats' only when none is", () => {
    const c = cfg({ target: 9, statIds: ["S:a1", "S:b1", "S:c1", "S:a2", "S:b2"] });
    let s = reveal(pickAll(open(c), c, ["S:a1", "S:b1", "S:c1"], 2000), c);
    // Two stats left for three seats: still a round (two seats may share a stat).
    expect(s.phase).toBe("pick");
    s = reveal(pickAll(s, c, ["S:a2", "S:b2", "S:b2"], s.deadline - 1), c);
    expect(s).toMatchObject({ phase: "over", endedBy: "stats", winners: [1] });
  });

  it("ends on the round cap with whoever is furthest, and says so", () => {
    const c = cfg({ target: 9, maxRounds: 1 });
    const s = reveal(pickAll(open(c), c, ["S:a1", "S:b1", "S:c1"], 2000), c);
    expect(s).toMatchObject({ phase: "over", endedBy: "rounds", winners: [0, 1, 2] });
  });

  it("ends when one racer is alone in front at the line", () => {
    const c = cfg();
    const s = reveal(pickAll(open(c), c, ["S:a1", "S:a2", "S:c1"], 2000), c);
    expect(s).toMatchObject({ phase: "over", endedBy: "line", winners: [0] });
    expect(standings(s).map((r) => [r.seat, r.place])).toEqual([[0, 1], [2, 2], [1, 3]]);
    expect(standings(s).find((r) => r.seat === 1)).toMatchObject({ goodCalls: 0, backfires: 1 });
  });

  it("round finish: plays on when two racers cross the line level, until one is alone in front", () => {
    const c = cfg({ target: 1 });
    // tie moves seats 0 and 1; low and c1 both move seat 2 → 1, 1, 2: seat 2 alone in front.
    expect(reveal(pickAll(open(c), c, ["S:tie", "S:low", "S:c1"], 2000), c)).toMatchObject({ phase: "over", winners: [2] });
    // 2, 2, 0: level at the line → another round.
    let t = reveal(pickAll(open(c), c, ["S:a1", "S:b1", "S:tie"], 2000), c);
    expect(t).toMatchObject({ phase: "pick", suddenDeath: true });
    t = reveal(pickAll(t, c, ["S:a2", "S:c1", "S:low"], t.deadline - 1), c);
    expect(t).toMatchObject({ phase: "over", endedBy: "line", winners: [0] });
  });
});

describe("reveal order and the instant finish", () => {
  it("reveals the fastest pick first and the clock's picks last", () => {
    const c = cfg({ target: 9 });
    let s = open(c);
    s = submitPick(s, c, 2, "S:c1", 1500).state;
    s = submitPick(s, c, 0, "S:a1", 1800).state;
    s = tick(s, c, 11_000);
    expect(s.reveal!.map((r) => r.seat)).toEqual([2, 0, 1]);
    expect(s.reveal![2].auto).toBe(true);
  });

  it("stops at the pick that puts a racer on the line: later picks are never shown or used", () => {
    const c = cfg({ target: 1, finish: "instant" });
    let s = open(c);
    s = submitPick(s, c, 1, "S:b1", 1500).state;
    s = submitPick(s, c, 0, "S:a1", 1600).state;
    s = submitPick(s, c, 2, "S:c1", 1700).state;
    expect(s.reveal!.map((r) => r.statId)).toEqual(["S:b1"]);
    expect(s.used).toEqual(["S:b1"]);
    expect(reveal(s, c)).toMatchObject({ phase: "over", endedBy: "line", winners: [1] });
  });

  it("shares the win when one tied pick puts two racers on the line together", () => {
    const c = cfg({ target: 1, finish: "instant" });
    let s = open(c);
    s = submitPick(s, c, 2, "S:tie", 1500).state;
    s = reveal(pickAll(s, c, ["S:a1", "S:b1"], 1600), c);
    expect(s).toMatchObject({ phase: "over", winners: [0, 1] });
  });
});

describe("the seat's view", () => {
  const people = [0, 1, 2].map((i) => ({ name: `P${i}`, avatar: {} as never }));
  it("never carries a value before its pick is revealed, and moves the flag only when the values are out", () => {
    const c = cfg({ target: 9 });
    let s = pickAll(open(c), c, ["S:a1", "S:b1", "S:c1"], 2000);
    const early = toRaceView(s, c, ["S"], people, 0);
    expect(early.reveal).toMatchObject({ index: 0, total: 3, open: false });
    expect(early.reveal!.item).toMatchObject({ values: [], leaders: [], details: [] });
    expect(early.seats.map((x) => x.position)).toEqual([0, 0, 0]);
    expect(early.history).toEqual([]);
    expect(JSON.stringify(early)).not.toContain("\"values\":[9");
    s = reveal(s, c, 1);
    const later = toRaceView(s, c, ["S"], people, 0);
    expect(later.reveal).toMatchObject({ index: 0, open: true });
    expect(later.seats.map((x) => x.position)).toEqual([1, 0, 0]);
    expect(later.history).toHaveLength(1);
    s = tick(s, c, s.deadline);
    const second = toRaceView(s, c, ["S"], people, 2);
    expect(second.reveal).toMatchObject({ index: 1, open: false });
    expect(second.reveal!.item.values).toEqual([]);
    expect(second.history).toHaveLength(1);
  });
  it("an instant finish never shows in the count: it stays the number of picks made", () => {
    const c = cfg({ target: 1, finish: "instant" });
    const s = pickAll(open(c), c, ["S:a1", "S:b1", "S:c1"], 2000);
    expect(s.reveal).toHaveLength(1);
    expect(toRaceView(s, c, ["S"], people, 1).reveal).toMatchObject({ index: 0, total: 3, open: false });
  });
  it("carries each racer's detail line with its value, and only once the values are out", () => {
    const pack: RacePack = { ...PACK, stats: PACK.stats.map((st) => (st.id === "S:a1" ? { ...st, details: { A: { en: "9–0 vs Z · 1950", es: "9–0 vs Z · 1950" } } } : st)) };
    const c = cfg({ pack, target: 9 });
    let s = pickAll(open(c), c, ["S:a1", "S:b1", "S:c1"], 2000);
    expect(JSON.stringify(toRaceView(s, c, ["S"], people, 0))).not.toContain("9–0");
    s = reveal(s, c, 1);
    expect(toRaceView(s, c, ["S"], people, 0).reveal!.item.details).toEqual([{ en: "9–0 vs Z · 1950", es: "9–0 vs Z · 1950" }, null, null]);
  });
  it("wording has no values", () => {
    expect(JSON.stringify(toWording(PACK))).not.toContain("values");
    expect(toPublicStats(PACK, ["S:a1"])[0]).toEqual({ id: "S:a1", scope: "S", metric: "a1", family: "results", unwanted: false });
  });
});

describe("dealing and search on the invented fixture", () => {
  const pack = inventedRacePack();
  it("deals distinct racers, the same for the same seed, and only stats playable for them", () => {
    for (const seats of [2, 3, 4, 5, 6]) {
      const deal = dealMatch(pack, seats, 7);
      expect(new Set(deal.racers).size).toBe(seats);
      expect(dealMatch(pack, seats, 7)).toEqual(deal);
      expect(deal.leads).toHaveLength(seats);
      expect(Math.min(...deal.leads)).toBeGreaterThan(0);
      const metrics = new Map(pack.metrics.map((m) => [m.id, m]));
      for (const id of deal.statIds) {
        const stat = pack.stats.find((s) => s.id === id)!;
        expect(compare(stat, metrics.get(stat.metric)!, deal.racers)).not.toBeNull();
      }
    }
  });
  it("prefers deals where no racer leads far more stats than another", () => {
    const deal = dealMatch(pack, 3, 11);
    if (deal.fair) expect(Math.min(...deal.leads)).toBeGreaterThanOrEqual(Math.max(...deal.leads) * 0.6);
    expect(targetFor(2)).toBe(5);
    expect(targetFor(6)).toBe(8);
  });
  it("seats fixed nations in the order given, each once", () => {
    const [a, b] = [pack.nations[3].id, pack.nations[0].id];
    expect(dealMatch(pack, 3, 1, { nations: [a, b] }).racers.slice(0, 2)).toEqual([a, b]);
    const twice = dealMatch(pack, 3, 1, { nations: [a, a, b] }).racers;
    expect(new Set(twice).size).toBe(3);
    expect(twice.slice(0, 2)).toEqual([a, b]);
  });
  it("refuses a deal nobody could play instead of opening an empty match", () => {
    const level: RacePack = { ...PACK, stats: [{ id: "S:flat", scope: "S", metric: "flat", values: { A: 4, B: 4, C: 4 } }] };
    expect(() => dealMatch(level, 3, 1)).toThrow(/no playable deal/);
  });
  it("finds stats by a typed word in either language, ignoring accents", () => {
    const all = toPublicStats(pack, pack.stats.map((s) => s.id));
    expect(searchStats(pack, all, "penales").every((s) => s.metric === "penalty_goals" || s.metric === "shootouts_won")).toBe(true);
    expect(searchStats(pack, all, "PENALTIES").length).toBeGreaterThan(0);
    expect(searchStats(pack, all, "porterias").every((s) => s.metric === "clean_sheets")).toBe(true);
    expect(searchStats(pack, all, "wins copa").every((s) => s.scope === "COPA")).toBe(true);
    expect(searchStats(pack, all, "zzzz")).toEqual([]);
  });
});
