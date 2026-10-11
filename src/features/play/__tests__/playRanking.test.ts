import { describe, expect, it } from "vitest";
import { isNewPlayGame, rankPlayGames } from "../playRanking";

const NOW = new Date("2026-10-11T12:00:00Z");
const order = (...args: Parameters<typeof rankPlayGames>) => rankPlayGames(...args).map((row) => row.slug);

describe("isNewPlayGame", () => {
  it("is new for 21 days from the release day, and never without a date", () => {
    expect(isNewPlayGame("2026-10-09", NOW)).toBe(true);
    expect(isNewPlayGame("2026-09-21", NOW)).toBe(true);
    expect(isNewPlayGame("2026-09-20", NOW)).toBe(false);
    expect(isNewPlayGame(undefined, NOW)).toBe(false);
    // A date entered ahead of a release marks nothing until that day comes.
    expect(isNewPlayGame("2026-11-01", NOW)).toBe(false);
  });
});

describe("rankPlayGames", () => {
  it("puts busier games first and keeps the curated order on a tie", () => {
    const stats = { a: { players7d: 50, players3d: 21 }, b: { players7d: 400, players3d: 171 }, c: { players7d: 50, players3d: 21 } };
    expect(order(["a", "b", "c"], stats, {}, NOW)).toEqual(["b", "a", "c"]);
  });

  it("lifts a game released this week into the first three cards even with few players", () => {
    const stats = {
      a: { players7d: 900, players3d: 380 }, b: { players7d: 800, players3d: 340 }, c: { players7d: 700, players3d: 300 },
      d: { players7d: 600, players3d: 250 }, fresh: { players7d: 5, players3d: 5 },
    };
    const ranked = order(["a", "b", "c", "d", "fresh"], stats, { fresh: "2026-10-10" }, NOW);
    expect(ranked.indexOf("fresh")).toBeLessThan(3);
    expect(ranked.slice(0, 2)).toEqual(["a", "b"]);
    expect(new Set(ranked).size).toBe(5);
  });

  it("stops lifting a game once its first week is over", () => {
    const stats = {
      a: { players7d: 900, players3d: 380 }, b: { players7d: 800, players3d: 340 }, c: { players7d: 700, players3d: 300 },
      d: { players7d: 600, players3d: 250 }, older: { players7d: 5, players3d: 2 },
    };
    expect(order(["a", "b", "c", "d", "older"], stats, { older: "2026-09-30" }, NOW).indexOf("older")).toBe(4);
  });

  it("ranks a rising game above a fading one with the same week", () => {
    const stats = { fading: { players7d: 200, players3d: 30 }, rising: { players7d: 200, players3d: 150 } };
    expect(order(["fading", "rising"], stats, {}, NOW)).toEqual(["rising", "fading"]);
  });

  it("keeps every game when there are no numbers at all", () => {
    expect(order(["a", "b", "c"], {}, {}, NOW)).toEqual(["a", "b", "c"]);
  });
});
