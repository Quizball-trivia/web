import { describe, expect, it } from "vitest";
import { toSoloState, type CodenamesDailyState } from "../codenames.daily";

const label = (t: string) => ({ en: t, es: t, tr: t, ru: t, ka: t });
/** An invented finished run: two flips on the first clue, then the Own Goal. */
const finished = (disclosed: boolean | undefined): CodenamesDailyState => ({
  day: "2026-10-19", open: false, deadline: null, serverNow: "", done: true, score: 199, ranked: true,
  cards: Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, kind: i === 0 ? "mine" : i === 19 ? "owngoal" : disclosed ? "neutral" : null })),
  clues: disclosed ? [0, 1, 2].map((i) => ({ word: label(`Clue ${i}`), count: 2, cards: [{ id: "c0", why: label("Why") }] })) : [{ word: label("Clue 0"), count: 2 }],
  totalClues: 3, clue: 0, guessesLeft: 0, flips: [{ card: 0, kind: "mine", clue: 0 }, { card: 19, kind: "owngoal", clue: 0 }],
  end: "owngoal", found: 1, total: 8, misses: 1, ...(disclosed === undefined ? {} : { disclosed }),
});

describe("Codenames daily run in the screens' shape", () => {
  it("a finished run of a day still open keeps unflipped cards hidden (never shown as neutral)", () => {
    const s = toSoloState(finished(false), "en");
    expect(s.disclosed).toBe(false);
    expect(s.cards.filter((c) => c.kind !== null).map((c) => c.id)).toEqual(["c0", "c19"]);
    expect(s.clues).toHaveLength(1);
    expect(s.clues[0].cards).toBeUndefined();
  });

  it("a disclosed run shows the whole key, every clue and its reasons", () => {
    const s = toSoloState(finished(true), "en");
    expect(s.disclosed).toBe(true);
    expect(s.cards.every((c) => c.kind !== null)).toBe(true);
    expect(s.clues.map((c) => c.cards?.[0]?.why)).toEqual(["Why", "Why", "Why"]);
  });

  it("an older server without the flag reads as not disclosed", () => {
    expect(toSoloState(finished(undefined), "en").disclosed).toBe(false);
  });
});
