import { describe, expect, it } from "vitest";
import { CONTENT_START, RANKED_START, addDays, defaultDayFor, isLiveDay, latestDay, normalizeGuess, playableDays, pointsFor, puzzleNumber, resultEmoji, resultGrid } from "../pistas.logic";
import { decodePistasShare, encodePistasShare } from "../pistas.share";

/** The 30th board. The calendar has no fixed end: later days exist once the server lists them. */
const LAST_DAY = addDays(CONTENT_START, 29);

describe("pistas calendar", () => {
  it("never offers a day before its release", () => {
    expect(latestDay(addDays(CONTENT_START, -1))).toBeNull();
    expect(playableDays(addDays(CONTENT_START, -1))).toEqual([]);
    expect(playableDays(CONTENT_START)).toEqual([CONTENT_START]);
    // No fixed end: the newest day the calendar can hold is always today (the board index says whether it is released).
    expect(latestDay(addDays(LAST_DAY, 5))).toBe(addDays(LAST_DAY, 5));
  });

  it("ranks only today's board from the ranked start on", () => {
    expect(isLiveDay(RANKED_START, RANKED_START)).toBe(true);
    expect(isLiveDay(CONTENT_START, CONTENT_START)).toBe(CONTENT_START >= RANKED_START);
    expect(isLiveDay(addDays(RANKED_START, -1), RANKED_START)).toBe(false);
  });

  it("sends guests to the newest closed day and members to today", () => {
    expect(defaultDayFor(RANKED_START, true)).toBe(RANKED_START);
    expect(defaultDayFor(RANKED_START, false)).toBe(addDays(RANKED_START, -1));
    expect(defaultDayFor(CONTENT_START, false)).toBeNull();
    expect(defaultDayFor(addDays(LAST_DAY, 3), false)).toBe(addDays(LAST_DAY, 2));
    expect(isLiveDay(addDays(LAST_DAY, 3), addDays(LAST_DAY, 3))).toBe(true);
  });

  it("numbers boards from the first content day", () => {
    expect(puzzleNumber(CONTENT_START)).toBe(1);
    expect(puzzleNumber(addDays(CONTENT_START, 4))).toBe(5);
  });
});

describe("pistas scoring and share", () => {
  it("pays 10 for the first clue down to 1 for the tenth", () => {
    expect(pointsFor(1)).toBe(10);
    expect(pointsFor(10)).toBe(1);
  });

  it("buckets results into colours", () => {
    expect(resultEmoji({ outcome: "solved", clues: 3, points: 8 })).toBe("🟩");
    expect(resultEmoji({ outcome: "solved", clues: 6, points: 5 })).toBe("🟨");
    expect(resultEmoji({ outcome: "solved", clues: 7, points: 4 })).toBe("🟧");
    expect(resultEmoji({ outcome: "missed", clues: 2, points: 0 })).toBe("🟥");
  });

  it("round-trips a share code and keeps it apart from Buscaminas codes", () => {
    const results = Array.from({ length: 10 }, (_, i) => (i % 3 === 0 ? { outcome: "missed" as const, clues: 10, points: 0 } : { outcome: "solved" as const, clues: i, points: 11 - i }));
    const code = encodePistasShare(4, results, "es");
    expect(code.startsWith("pf-4-")).toBe(true);
    expect(decodePistasShare(code, LAST_DAY)).toMatchObject({ number: 4, score: results.reduce((s, r) => s + r.points, 0), locale: "es" });
    expect(resultGrid(results)).toHaveLength(results.map(resultEmoji).join("").length);
    expect(decodePistasShare("4-61-pbmpbmpbmpbmpbmpbmpb-es", LAST_DAY)).toBeNull();
    expect(decodePistasShare("pf-4-101-gggggggggg-es", LAST_DAY)).toBeNull();
    expect(decodePistasShare("pf-4-50-ggggg-es", LAST_DAY)).toBeNull();
  });

  it("decodes every result the game can produce", () => {
    for (let clues = 1; clues <= 10; clues++) {
      const solved = Array.from({ length: 10 }, () => ({ outcome: "solved" as const, clues, points: pointsFor(clues) }));
      expect(decodePistasShare(encodePistasShare(1, solved, "en"), LAST_DAY)).not.toBeNull();
    }
    const missed = Array.from({ length: 10 }, () => ({ outcome: "missed" as const, clues: 10, points: 0 }));
    expect(decodePistasShare(encodePistasShare(1, missed, "en"), LAST_DAY)).not.toBeNull();
  });

  it("rejects boards that are not released yet", () => {
    const code = (n: number) => `pf-${n}-90-gggggggggg-es`;
    expect(decodePistasShare(code(1), CONTENT_START)).not.toBeNull();
    expect(decodePistasShare(code(2), CONTENT_START)).toBeNull();
    expect(decodePistasShare(code(2), addDays(CONTENT_START, 1))).not.toBeNull();
    expect(decodePistasShare(code(1), addDays(CONTENT_START, -1))).toBeNull();
    expect(decodePistasShare(code(0), LAST_DAY)).toBeNull();
    expect(decodePistasShare(code(99), addDays(LAST_DAY, 30))).toBeNull();
    expect(decodePistasShare(code(5), addDays(LAST_DAY, 30))).not.toBeNull();
  });

  it("round-trips board numbers past 999 (the calendar has no fixed end)", () => {
    const solved = Array.from({ length: 10 }, () => ({ outcome: "solved" as const, clues: 1, points: pointsFor(1) }));
    const code = encodePistasShare(1000, solved, "es");
    expect(decodePistasShare(code, addDays(CONTENT_START, 999))).toMatchObject({ number: 1000 });
    expect(decodePistasShare(code, addDays(CONTENT_START, 998))).toBeNull();
  });

  it("rejects a score the colour grid cannot add up to", () => {
    const at = (score: number, letters: string) => decodePistasShare(`pf-1-${score}-${letters}-en`, LAST_DAY);
    // ten greens pay 80–100
    expect(at(79, "gggggggggg")).toBeNull();
    expect(at(80, "gggggggggg")).not.toBeNull();
    expect(at(100, "gggggggggg")).not.toBeNull();
    expect(at(101, "gggggggggg")).toBeNull();
    // a miss is always 0
    expect(at(0, "rrrrrrrrrr")).not.toBeNull();
    expect(at(1, "rrrrrrrrrr")).toBeNull();
    // ten ambers/oranges pay 10–40
    expect(at(41, "oooooooooo")).toBeNull();
    // gg yy oo rr g y: 41–59
    expect(at(40, "ggyyoorrgy")).toBeNull();
    expect(at(41, "ggyyoorrgy")).not.toBeNull();
    expect(at(59, "ggyyoorrgy")).not.toBeNull();
    expect(at(60, "ggyyoorrgy")).toBeNull();
  });
});

describe("normalizeGuess", () => {
  it("ignores accents, case, punctuation and extra spaces", () => {
    expect(normalizeGuess("  Lorenzón!! ")).toBe("lorenzon");
    expect(normalizeGuess("Da  Síllva")).toBe("da sillva");
    expect(normalizeGuess("Mac-Dermot")).toBe("mac dermot");
  });
});
