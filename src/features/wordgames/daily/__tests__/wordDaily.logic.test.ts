import { describe, expect, it } from "vitest";
import { isClosedDay, isLiveDay, lastDayOf, latestDay, playableDays, puzzleNumber, type WordDailyCalendar } from "../wordDaily.logic";

const calendar: WordDailyCalendar = { contentStart: "2026-03-10", rankedStart: "2026-03-12", publishedDays: 5 };

describe("a word-game daily's calendar", () => {
  it("numbers the days from the first board", () => {
    expect(puzzleNumber(calendar, "2026-03-10")).toBe(1);
    expect(puzzleNumber(calendar, "2026-03-14")).toBe(5);
    expect(lastDayOf(calendar)).toBe("2026-03-14");
  });

  it("has no board before the first day and stays on the last one after the run of boards", () => {
    expect(latestDay(calendar, "2026-03-09")).toBeNull();
    expect(latestDay(calendar, "2026-03-12")).toBe("2026-03-12");
    expect(latestDay(calendar, "2026-04-01")).toBe("2026-03-14");
  });

  it("lists every day a player may open, newest first, never ahead of today", () => {
    expect(playableDays(calendar, "2026-03-09")).toEqual([]);
    expect(playableDays(calendar, "2026-03-12")).toEqual(["2026-03-12", "2026-03-11", "2026-03-10"]);
    expect(playableDays(calendar, "2026-04-01")).toHaveLength(5);
  });

  it("ranks only today's board, from the first ranked day to the last published one", () => {
    expect(isLiveDay(calendar, "2026-03-11", "2026-03-11")).toBe(false);
    expect(isLiveDay(calendar, "2026-03-12", "2026-03-12")).toBe(true);
    expect(isLiveDay(calendar, "2026-03-12", "2026-03-13")).toBe(false);
    expect(isLiveDay(calendar, "2026-03-15", "2026-03-15")).toBe(false);
  });

  it("opens a board to guests once its day is over", () => {
    expect(isClosedDay("2026-03-11", "2026-03-12")).toBe(true);
    expect(isClosedDay("2026-03-12", "2026-03-12")).toBe(false);
  });
});
