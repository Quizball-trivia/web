import { describe, expect, it } from "vitest";
import { buildModel, matchesFilter, mineOf, NO_FILTER, playerStats } from "../d501.days.model";
import type { D501Days } from "../d501.api";

// Invented clubs only: the repository is public.
const index = (over: Partial<D501Days> = {}): D501Days => ({
  today: "2026-11-25", contentStart: "2026-10-24", rankedFrom: "2026-10-27", todaySeeded: true, tomorrowSeeded: true, seededThrough: "2026-11-28", nextOpensAt: null,
  days: [
    { day: "2026-11-23", number: 31, tier: "easy", closed: true, title: "Invented League apps for Real Brisa", unit: "apps", card: { kind: "apps", competition: "XX1", subject: "Real Brisa", crest: "Real Brisa" }, stats: { players: 9, checkouts: 3, bestDarts: 4 } },
    { day: "2026-11-24", number: 32, tier: "medium", closed: true, title: "Inventaria caps", unit: "caps", card: null, stats: null },
    { day: "2026-11-25", number: 33, tier: "hard", closed: false },
  ],
  ...over,
});

describe("Darts days model", () => {
  it("turns runs into results: checkout, out of darts, gave up, in progress; a corrected unfinished run starts over", () => {
    expect(mineOf({ done: true, checkedOut: true, gaveUp: false, darts: 5, remaining: -2, stale: false })).toEqual({ state: "out", darts: 5 });
    expect(mineOf({ done: true, checkedOut: false, gaveUp: false, darts: 10, remaining: 40, stale: false })).toEqual({ state: "left", left: 40 });
    expect(mineOf({ done: true, checkedOut: false, gaveUp: true, darts: 2, remaining: 300, stale: true })).toEqual({ state: "gaveUp", left: 300 });
    expect(mineOf({ done: false, checkedOut: false, gaveUp: false, darts: 2, remaining: 300, stale: false })).toEqual({ state: "started", left: 300, darts: 2 });
    expect(mineOf({ done: false, checkedOut: false, gaveUp: false, darts: 2, remaining: 300, stale: true })).toEqual({ state: "none" });
    expect(mineOf({ done: false, checkedOut: false, gaveUp: false, darts: 0, remaining: 501, stale: false })).toEqual({ state: "none" });
  });

  it("lists newest first; today stays a secret (no type, subject or title) and never matches a type or text filter", () => {
    const model = buildModel(index(), null);
    expect(model.days.map((d) => d.day)).toEqual(["2026-11-25", "2026-11-24", "2026-11-23"]);
    const today = model.days[0];
    expect(today).toMatchObject({ closed: false, kind: null, subject: null, title: null, competition: null });
    expect(matchesFilter(today, { ...NO_FILTER, kind: "apps" })).toBe(false);
    expect(matchesFilter(today, { ...NO_FILTER, query: "brisa" })).toBe(false);
    expect(matchesFilter(today, { ...NO_FILTER, query: "#33" })).toBe(true);
    expect(model.days[1].kind).toBe("nt");
    expect(matchesFilter(model.days[2], { ...NO_FILTER, query: "brisa" })).toBe(true);
    expect(model).toMatchObject({ lastSeeded: "2026-11-28", todayMissing: false, tomorrowSeeded: true });
  });

  it("no board today: the last day shown is today itself and the gap is flagged", () => {
    const model = buildModel(index({ todaySeeded: false, seededThrough: null, days: index().days.slice(0, 2) }), null);
    expect(model).toMatchObject({ lastSeeded: "2026-11-25", todayMissing: true });
  });

  it("the streak runs back from today, skipping an unplayed today, and stops at the first gap", () => {
    const mine = {
      "2026-11-24": { done: true, checkedOut: true, gaveUp: false, darts: 6, remaining: 0, stale: false },
      "2026-11-23": { done: true, checkedOut: false, gaveUp: true, darts: 1, remaining: 400, stale: false },
    };
    const model = buildModel(index(), mine);
    expect(playerStats(model.days, model.today)).toEqual({ played: 2, total: 3, outs: 1, bestDarts: 6, streak: 2 });
    const gap = buildModel(index(), { "2026-11-23": mine["2026-11-23"] });
    expect(playerStats(gap.days, gap.today).streak).toBe(0);
  });

  it("no board today keeps yesterday's streak alive", () => {
    const noToday = index({ todaySeeded: false, seededThrough: null, days: index().days.slice(0, 2) });
    const model = buildModel(noToday, {
      "2026-11-24": { done: true, checkedOut: true, gaveUp: false, darts: 6, remaining: 0, stale: false },
      "2026-11-23": { done: true, checkedOut: true, gaveUp: false, darts: 7, remaining: 0, stale: false },
    });
    expect(playerStats(model.days, model.today).streak).toBe(2);
  });

  it("results still loading or unavailable are flagged, not shown as unplayed history", () => {
    expect(buildModel(index(), undefined).history).toBe("loading");
    expect(buildModel(index(), null).history).toBe("failed");
    expect(buildModel(index(), {}).history).toBe("ready");
  });
});
