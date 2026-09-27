import { describe, expect, it } from "vitest";
import { MAX_SCORE, playableDays, puzzleDayFor, releaseDay, resultGrid } from "../buscaminas.logic";
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
