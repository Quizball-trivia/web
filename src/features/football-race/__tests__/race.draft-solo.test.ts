import { describe, expect, it } from "vitest";
import { draftPick, draftTick, startDraft } from "../race.draft";
import { compare, dealMatch, type RaceMetric, type RacePack } from "../race.rules";
import { dailyRace, shareLine, soloPick, startSolo, type SoloConfig } from "../race.solo";
import { inventedRacePack } from "@/features/playground/fixtures/football-race";

const NATIONS = ["A", "B", "C", "D"];

describe("nation draft", () => {
  it("orders every seat once, takes turns, and gives the last seat the nation left over", () => {
    let d = startDraft(4, 7, 0, 10_000);
    expect([...d.order].sort()).toEqual([0, 1, 2, 3]);
    const [first, second, third, last] = d.order;
    expect(draftPick(d, NATIONS, second, "A", 10, 10_000).error).toBe("not_your_turn");
    d = draftPick(d, NATIONS, first, "B", 10, 10_000).state;
    expect(draftPick(d, NATIONS, second, "B", 20, 10_000).error).toBe("taken");
    expect(draftPick(d, NATIONS, second, "Z", 20, 10_000).error).toBe("unknown");
    d = draftPick(d, NATIONS, second, "D", 20, 10_000).state;
    d = draftPick(d, NATIONS, third, "A", 30, 10_000).state;
    expect(d.done).toBe(true);
    expect(d.picks[last]).toBe("C");
    expect(draftPick(d, NATIONS, last, "C", 40, 10_000).error).toBe("over");
  });
  it("gives a seat whose clock ran out a free nation, marked automatic", () => {
    const d0 = startDraft(2, 3, 0, 10_000);
    expect(draftTick(d0, ["A", "B"], 3, 9_999, 10_000)).toBe(d0);
    const d = draftTick(d0, ["A", "B"], 3, 10_000, 10_000);
    expect(d.done).toBe(true);
    expect(d.auto[d0.order[0]]).toBe(true);
    expect(new Set(d.picks)).toEqual(new Set(["A", "B"]));
  });
});

const metric = (id: string): RaceMetric => ({ id, family: "results", dir: "high", unwanted: false, decimals: 0, kind: "count", label: { en: id, es: id }, keywords: "" });
const PACK: RacePack = {
  version: "t", cutoff: "2031-01-01", real: false, source: { en: "", es: "" },
  nations: ["Y", "R1", "R2", "R3"].map((id, tier) => ({ id, name: { en: id, es: id }, tier })),
  scopes: [{ id: "S", label: { en: "S", es: "S" } }], families: [{ id: "results", label: { en: "R", es: "R" } }],
  metrics: ["y1", "y2", "y3", "y4", "y5", "r1", "r1b", "r1c", "tie"].map(metric),
  stats: [
    ...["y1", "y2", "y3", "y4", "y5"].map((m) => ({ id: `S:${m}`, scope: "S", metric: m, values: { Y: 9, R1: 1, R2: 2, R3: 3 } })),
    ...["r1", "r1b", "r1c"].map((m) => ({ id: `S:${m}`, scope: "S", metric: m, values: { Y: 1, R1: 9, R2: 2, R3: 3 } })),
    { id: "S:tie", scope: "S", metric: "tie", values: { Y: 9, R1: 9, R2: 2, R3: 3 } },
  ],
};
const cfg: SoloConfig = { pack: PACK, racers: ["Y", "R1", "R2", "R3"], statIds: PACK.stats.map((s) => s.id), target: 5, rivalTarget: 3 };

describe("daily solo race", () => {
  it("starts the rivals two spaces ahead and wins in five right picks", () => {
    let s = startSolo(cfg);
    expect(s.positions).toEqual([0, 2, 2, 2]);
    for (const m of ["y1", "y2", "y3", "y4"]) s = soloPick(s, cfg, `S:${m}`).state;
    expect(s.result).toBeNull();
    s = soloPick(s, cfg, "S:y5").state;
    expect(s.result).toBe("won");
    expect(shareLine(s)).toBe("🟩🟩🟩🟩🟩🏁");
    expect(soloPick(s, cfg, "S:r1").error).toBe("over");
  });
  it("loses when three wrong picks feed the same rival", () => {
    let s = startSolo(cfg);
    for (const m of ["r1", "y1", "r1b"]) s = soloPick(s, cfg, `S:${m}`).state;
    expect(s.result).toBeNull();
    s = soloPick(s, cfg, "S:r1c").state;
    expect(s.result).toBe("lost");
    expect(shareLine(s)).toBe("🟥🟩🟥🟥❌");
  });
  it("a tie that takes you and a rival to the line together is your win", () => {
    let s = startSolo(cfg);
    for (const m of ["y1", "y2", "y3", "y4", "r1", "r1b"]) s = soloPick(s, cfg, `S:${m}`).state;
    expect(s.positions.slice(0, 2)).toEqual([4, 4]);
    s = soloPick(s, cfg, "S:tie").state;
    expect(s.result).toBe("won");
  });
  it("refuses a stat twice or one outside the race", () => {
    const s = soloPick(startSolo(cfg), cfg, "S:y1").state;
    expect(soloPick(s, cfg, "S:y1").error).toBe("stat_used");
    expect(soloPick(s, cfg, "S:nope").error).toBe("unknown_stat");
  });
  it("deals the same race to everyone on the same day, and another the next day", () => {
    const pack = inventedRacePack();
    const a = dailyRace(pack, "2026-10-20"), b = dailyRace(pack, "2026-10-20"), c = dailyRace(pack, "2026-10-21");
    expect(a.racers).toEqual(b.racers);
    expect(a.statIds).toEqual(b.statIds);
    expect(`${a.racers}|${a.scopes}`).not.toEqual(`${c.racers}|${c.scopes}`);
    expect(a.racers).toHaveLength(4);
  });
});

describe("tournaments", () => {
  const withTournaments: RacePack = {
    ...PACK,
    scopes: [{ id: "T1.all", label: { en: "All", es: "All" }, tournament: "T1" }],
    tournaments: [{ id: "T1", label: { en: "Cup", es: "Copa" }, scopes: ["T1.all"], nations: ["Y", "R1", "R2"] }],
    stats: PACK.stats.map((s) => ({ ...s, id: s.id.replace("S:", "T1.all:"), scope: "T1.all" })),
  };
  it("deals only the tournament's nations and plays only its eras", () => {
    const d = dealMatch(withTournaments, 2, 4, { tournament: "T1", minLeads: 1, balance: 0 });
    expect(d.tournament).toBe("T1");
    expect(d.racers.every((r) => ["Y", "R1", "R2"].includes(r))).toBe(true);
    expect(d.scopes).toEqual(["T1.all"]);
    const metricOf = new Map(withTournaments.metrics.map((m) => [m.id, m]));
    for (const id of d.statIds) expect(compare(withTournaments.stats.find((s) => s.id === id)!, metricOf.get(id.split(":")[1])!, d.racers)).not.toBeNull();
  });
});
