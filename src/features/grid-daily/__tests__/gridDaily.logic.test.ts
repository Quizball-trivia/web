import { describe, expect, it } from "vitest";
import { candidateDays, elapsedFromSpeed, formatClock, puzzleNumber, shareGrid, CONTENT_START } from "../gridDaily.logic";

describe("daily grid logic", () => {
  const days = { "2026-10-08": 1, "2026-10-09": 2, "2026-10-10": 3 };

  it("gives a member the server's latest day and a guest the one before it, whatever this device's clock says", () => {
    expect(candidateDays(days, true)).toEqual(["2026-10-10", "2026-10-09", "2026-10-08"]);
    expect(candidateDays(days, false)).toEqual(["2026-10-09", "2026-10-08", "2026-10-10"]);
    expect(candidateDays({ "2026-10-10": 3 }, false)).toEqual(["2026-10-10"]);
    expect(candidateDays({}, true)).toEqual([]);
  });

  it("does not invent a time for a run that took over the hour", () => {
    expect(elapsedFromSpeed(3_590)).toBe(10);
    expect(elapsedFromSpeed(0)).toBeNull();
  });

  it("numbers days from the first content day", () => {
    expect(puzzleNumber(CONTENT_START)).toBe(1);
    expect(puzzleNumber("2026-10-10")).toBe(4);
  });

  it("formats the clock and the share squares", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(125_900)).toBe("2:05");
    expect(shareGrid([1, null, 1, null, null, 1, 1, 1, 1])).toBe("🟩⬛🟩\n⬛⬛🟩\n🟩🟩🟩");
  });
});
