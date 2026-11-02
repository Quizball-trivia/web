import { describe, expect, it } from "vitest";
import { pickPracticeDay, picturePracticeState } from "../codenames.practice";
import { soloFlip } from "../codenames.view";
import type { CodenamesReview } from "../codenames.daily";

const L = (en: string) => ({ en, es: `${en}-es`, tr: en, ru: en, ka: en });
const KINDS = [...Array(8).fill("mine"), ...Array(7).fill("theirs"), ...Array(4).fill("neutral"), "owngoal"] as const;
const review: CodenamesReview = {
  day: "2026-10-25",
  cards: KINDS.map((kind, i) => ({ id: `c${i}`, kind })),
  clues: [
    { word: L("Alpha"), count: 4, cards: [0, 1, 2, 3].map((i) => ({ id: `c${i}`, why: L(`why ${i}`) })) },
    { word: L("Beta"), count: 4, cards: [4, 5, 6, 7].map((i) => ({ id: `c${i}`, why: L(`why ${i}`) })) },
  ],
};

describe("picture practice", () => {
  it("draws a closed day, never today, and avoids boards already seen while another is left", () => {
    const days = ["2026-11-02", "2026-11-01", "2026-10-31"];
    expect(pickPracticeDay(days, "2026-11-02", new Set(), () => 0)).toBe("2026-11-01");
    expect(pickPracticeDay(days, "2026-11-02", new Set(["2026-11-01"]), () => 0)).toBe("2026-10-31");
    // Every closed board seen: any closed one again rather than none.
    expect(pickPracticeDay(days, "2026-11-02", new Set(["2026-11-01", "2026-10-31"]), () => 0.99)).toBe("2026-10-31");
    expect(pickPracticeDay(["2026-11-02"], "2026-11-02", new Set())).toBeNull();
  });

  it("plays a closed board in the reader's language, unranked, with every reason for the end", () => {
    const state = picturePracticeState(review, "es")!;
    expect(state).toMatchObject({ day: "2026-10-25", ranked: false, disclosed: true, status: "playing", guessesLeft: 5 });
    expect(state.clues[0]).toMatchObject({ word: "Alpha-es", count: 4 });
    expect(state.clues[1].cards?.[0]).toEqual({ id: "c4", why: "why 4-es" });
    expect(soloFlip(state, "c19")).toMatchObject({ status: "done", endReason: "owngoal" });
  });

  it("refuses a board it cannot play", () => {
    expect(picturePracticeState({ ...review, cards: review.cards.slice(0, 19) }, "en")).toBeNull();
    expect(picturePracticeState({ ...review, clues: [] }, "en")).toBeNull();
  });
});
