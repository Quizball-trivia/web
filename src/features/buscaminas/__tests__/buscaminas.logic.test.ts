import { describe, expect, it } from "vitest";
import { DAILY_MAX_SCORE, MAX_SCORE, SHORT_RUN_FROM, dailyMaxScore, dailyRoundsFor, dailyRoundsOf, dailyScoreOf, extendedRoundsPlayed, isDailyDone, playableDays, puzzleDayFor, releaseDay, resultGrid } from "../buscaminas.logic";
import { decodeShare, encodeShare } from "../buscaminas.share";
import { streakFrom } from "../buscaminas.storage";

describe("buscaminas result grid and share code", () => {
  const results = Array.from({ length: 20 }, (_, i) => ({ outcome: (i % 5 === 0 ? "mine" : i % 3 === 0 ? "banked" : "perfect") as "mine" | "banked" | "perfect", found: 5, points: i % 5 === 0 ? 0 : i % 3 === 0 ? 5 : 15 }));

  it("prints two rows of ten squares", () => {
    const grid = resultGrid(results).split("\n");
    expect(grid).toHaveLength(2);
    expect([...grid[0]].filter((ch) => ch.trim()).length).toBeGreaterThan(0);
  });

  it("round-trips a finished day and rejects malformed or impossible codes", () => {
    const code = encodeShare(3, results, "es");
    const decoded = decodeShare(code);
    expect(decoded?.number).toBe(3);
    expect(decoded?.score).toBe(results.reduce((sum, r) => sum + r.points, 0));
    expect(decoded?.outcomes).toEqual(results.map((r) => r.outcome));
    expect(decodeShare("3-301-" + "p".repeat(20) + "-es")).toBeNull();
    expect(decodeShare("3-100-" + "p".repeat(19) + "-es")).toBeNull();
    expect(decodeShare("3-100-" + "p".repeat(20) + "-xx")).toBeNull();
    expect(decodeShare("<script>")).toBeNull();
    expect(MAX_SCORE).toBe(300);
  });

  it("shares a daily run as 5 squares on one row, capped at the daily max", () => {
    const daily = results.slice(0, 5);
    expect(resultGrid(daily).split("\n")).toHaveLength(1);
    const decoded = decodeShare(encodeShare(9, daily, "en"));
    expect(decoded).toMatchObject({ number: 9, outcomes: daily.map((r) => r.outcome), locale: "en" });
    expect(DAILY_MAX_SCORE).toBe(75);
    expect(decodeShare("9-75-ppppp-en")?.score).toBe(75);
    expect(decodeShare("9-76-ppppp-en")).toBeNull();
    expect(decodeShare("9-10-pppppp-en")).toBeNull();
  });
});

describe("buscaminas daily run", () => {
  const r = (points: number) => ({ outcome: (points === 15 ? "perfect" : points === 0 ? "mine" : "banked") as "perfect" | "banked" | "mine", found: points, points });
  const base = { day: "2026-11-05", round: 0, results: [] as ReturnType<typeof r>[], settled: null as ReturnType<typeof r> | null, done: false };

  it("trusts the server's daily fields when present", () => {
    expect(isDailyDone({ ...base, dailyDone: true })).toBe(true);
    expect(dailyScoreOf({ ...base, dailyScore: 42 })).toBe(42);
  });

  it("derives them from the results for runs saved before the server sent them", () => {
    const four = [r(15), r(3), r(0), r(15)];
    expect(isDailyDone({ ...base, round: 4, results: four })).toBe(false);
    // The settled 5th round counts toward the daily score before the player moves on.
    expect(dailyScoreOf({ ...base, round: 4, results: four, settled: r(2) })).toBe(35);
    const extended = [...four, r(2), r(15), r(15)];
    expect(isDailyDone({ ...base, round: 7, results: extended })).toBe(true);
    expect(dailyScoreOf({ ...base, round: 7, results: extended, settled: r(6) })).toBe(35);
    expect(extendedRoundsPlayed({ ...base, results: extended })).toBe(2);
  });

  it("a day before SHORT_RUN_FROM keeps the 20-round run when the server does not say otherwise", () => {
    expect(dailyRoundsFor("2026-11-03")).toBe(20);
    expect(dailyRoundsFor(SHORT_RUN_FROM)).toBe(5);
    expect(dailyMaxScore(dailyRoundsFor("2026-11-03"))).toBe(300);
    const old = { ...base, day: "2026-11-03" };
    const seven = [r(15), r(3), r(0), r(15), r(2), r(15), r(15)];
    expect(dailyRoundsOf(old)).toBe(20);
    expect(isDailyDone({ ...old, round: 7, results: seven })).toBe(false);
    expect(dailyScoreOf({ ...old, round: 7, results: seven, settled: r(6) })).toBe(71);
    expect(extendedRoundsPlayed({ ...old, results: seven })).toBe(0);
    // The server's dailyRounds wins over the day rule.
    expect(dailyRoundsOf({ ...old, dailyRounds: 5 })).toBe(5);
  });
});

describe("buscaminas calendar", () => {
  it("uses the Buenos Aires date", () => {
    // 02:00 UTC on the 28th is still the 27th in Buenos Aires (UTC-3).
    expect(releaseDay(new Date("2026-09-28T02:00:00Z"))).toBe("2026-09-27");
    expect(releaseDay(new Date("2026-09-28T03:30:00Z"))).toBe("2026-09-28");
  });

  it("clamps to the published range instead of cycling", () => {
    expect(puzzleDayFor("2026-09-01")).toBe("2026-09-26");
    expect(puzzleDayFor("2026-10-05")).toBe("2026-10-05");
    expect(puzzleDayFor("2027-01-01")).toBe("2026-12-24");
    expect(playableDays("2026-09-29")).toEqual(["2026-09-29", "2026-09-28", "2026-09-27", "2026-09-26"]);
  });

  it("streak counts consecutive finished days and forgives an unplayed today", () => {
    const days = ["2026-10-01", "2026-09-30", "2026-09-29", "2026-09-28"];
    expect(streakFrom(days, { "2026-09-30": 10, "2026-09-29": 5, "2026-09-27": 1 })).toBe(2);
    expect(streakFrom(days, { "2026-10-01": 1, "2026-09-30": 1 })).toBe(2);
    expect(streakFrom(days, {})).toBe(0);
  });
});

describe("buscaminas guest board", () => {
  it("sends guests to yesterday's board while today's is live, and accounts to today's", async () => {
    const { defaultDayFor, GUESTS_PLAY_LIVE } = await import("../buscaminas.logic");
    expect(GUESTS_PLAY_LIVE).toBe(false);
    expect(defaultDayFor("2026-09-30", true)).toBe("2026-09-30");
    expect(defaultDayFor("2026-09-30", false)).toBe("2026-09-29");
    // Launch day has no yesterday: guests see the launch board (the server answers sign_in_for_today).
    expect(defaultDayFor("2026-09-26", false)).toBe("2026-09-26");
    // After the last published day nothing is live, so guests play the last board.
    expect(defaultDayFor("2027-01-10", false)).toBe("2026-12-24");
  });
});
