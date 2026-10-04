import { describe, expect, it } from "vitest";
import { CONTENT_START, RANKED_START, addDays, formatMinute, isLiveDay, parseMinute, playableDays, puzzleNumber, resultGrid, resultTone } from "../minuto.logic";

describe("minuto logic", () => {
  it("reads a whole minute or added time typed as 90+3, and refuses anything else", () => {
    expect(parseMinute("93")).toBe(93);
    expect(parseMinute(" 90 + 3 ")).toBe(93);
    expect(parseMinute("45+2")).toBe(47);
    expect(parseMinute("1")).toBe(1);
    expect(parseMinute("130")).toBe(130);
    for (const bad of ["", "0", "131", "12.5", "-3", "abc", "90++3", "120+11"]) expect(parseMinute(bad)).toBeNull();
  });

  it("shows added time as 90+3' and tones results like the share squares", () => {
    expect(formatMinute({ base: 90, added: 3 })).toBe("90+3'");
    expect(formatMinute({ base: 116, added: 0 })).toBe("116'");
    expect([0, 2, 5, 6].map((diff) => resultTone({ diff }))).toEqual(["exact", "close", "near", "far"]);
    expect(resultGrid([{ diff: 0 }, { diff: 1 }, { diff: 4 }, { diff: 30 }])).toBe("🟩🟨🟧🟥");
  });

  it("mirrors the backend calendar: numbered from the first content day, never a future day", () => {
    expect(puzzleNumber(CONTENT_START)).toBe(1);
    expect(puzzleNumber(addDays(CONTENT_START, 1000))).toBe(1001);
    expect(playableDays(addDays(CONTENT_START, 200))).toHaveLength(201);
    expect(isLiveDay(addDays(RANKED_START, 200), addDays(RANKED_START, 200))).toBe(true);
    expect(playableDays(addDays(CONTENT_START, 2))).toEqual([addDays(CONTENT_START, 2), addDays(CONTENT_START, 1), CONTENT_START]);
    expect(playableDays(addDays(CONTENT_START, -1))).toEqual([]);
    expect(isLiveDay(CONTENT_START, CONTENT_START)).toBe(false);
  });
});
