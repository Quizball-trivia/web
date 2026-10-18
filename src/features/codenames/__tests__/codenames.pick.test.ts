import { describe, expect, it } from "vitest";
import type { WordRun } from "@/features/wordgames/daily/wordDaily.api";
import type { CodenamesDailyState } from "../codenames.daily";
import { afterMissed, pickOn, reconcilePick } from "../codenames.pick";

type Run = WordRun<CodenamesDailyState>;
/** An invented board: c0–c7 ours, the rest anything; `flips` are board positions turned in order. */
function run(version: number, { clue = 0, flips = [] as number[], done = false, id = "r1" } = {}): Run {
  return {
    run: { id, version },
    state: {
      day: "2026-10-15", open: false, deadline: null, serverNow: "", done, score: 0, ranked: false,
      cards: Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, kind: done || flips.includes(i) ? (i < 8 ? "mine" : "neutral") : null })),
      clues: [], totalClues: 3, clue, guessesLeft: 3,
      flips: flips.map((card) => ({ card, kind: card < 8 ? "mine" : "neutral", clue })),
      end: done ? "clues" : null, found: 0, total: 8, misses: 0,
    },
  };
}
const missed = (sentOn: Run, fresh: Run, text: string, lost = false, extra?: Record<string, unknown>) => ({ sentOn, fresh, text, lost, extra });

describe("Codenames daily pick against a newer copy", () => {
  it("same clue, card still hidden: kept and asked for again", () => {
    const out = afterMissed(missed(run(1), run(2, { flips: [0] }), "1"))!;
    expect(out.pick).toMatchObject({ cardId: "c1", confirmed: true, version: 1 });
    expect(reconcilePick(out.pick!, run(2, { flips: [0] }))).toEqual({ pick: { ...out.pick!, version: 2, confirmed: false }, note: "confirmAgain" });
  });

  it("clue changed: dropped, never carried to the new clue", () => {
    expect(reconcilePick(pickOn(run(1), "c1", true), run(3, { clue: 1, flips: [0] }))).toEqual({ pick: null, note: "clueChanged" });
  });

  it("card already turned: dropped with that note", () => {
    expect(reconcilePick(pickOn(run(1), "c1", true), run(2, { flips: [1] }))).toEqual({ pick: null, note: "cardTaken" });
  });

  it("run finished: dropped with that note", () => {
    expect(reconcilePick(pickOn(run(1), "c1", true), run(2, { done: true, flips: [19] }))).toEqual({ pick: null, note: "finished" });
  });

  it("another run (the day was corrected): dropped without a note of its own (the hook explains the restart)", () => {
    expect(reconcilePick(pickOn(run(1), "c1", true), run(1, { id: "r2" }))).toEqual({ pick: null, note: null });
  });

  it("a confirmed pick on the unchanged copy (dropped while another call was in flight): asked for again", () => {
    expect(reconcilePick(pickOn(run(1), "c1", true), run(1))).toEqual({ pick: pickOn(run(1), "c1"), note: "notSent" });
  });

  it("an unconfirmed pick on the unchanged copy: nothing changes", () => {
    expect(reconcilePick(pickOn(run(1), "c1"), run(1))).toBeNull();
  });

  it("lost reply that landed (its card is the next flip): nothing to explain", () => {
    expect(afterMissed(missed(run(1), run(2, { flips: [1] }), "1", true))).toBeNull();
    expect(afterMissed(missed(run(1, { flips: [0] }), run(3, { flips: [0, 1, 2] }), "1", true))).toBeNull();
  });

  it("lost reply, but the same card was flipped on a later clue (another tab stopped, then flipped it): not ours", () => {
    const later = run(3, { clue: 1, flips: [1] });
    later.state.flips[0].clue = 1;
    expect(afterMissed(missed(run(1), later, "1", true))?.pick).toMatchObject({ cardId: "c1", confirmed: true, clue: 0 });
    expect(reconcilePick(afterMissed(missed(run(1), later, "1", true))!.pick!, later)).toEqual({ pick: null, note: "cardTaken" });
  });

  it("lost reply that never landed while another tab moved on: kept as a refused pick", () => {
    expect(afterMissed(missed(run(1), run(2, { flips: [0] }), "1", true))?.pick).toMatchObject({ cardId: "c1", confirmed: true });
  });

  it("I'm done: landed after a lost reply (next clue), or explained", () => {
    const stop = { move: "stop" };
    expect(afterMissed(missed(run(1, { flips: [0] }), run(2, { clue: 1, flips: [0] }), "", true, stop))).toBeNull();
    expect(afterMissed(missed(run(1, { flips: [0] }), run(2, { flips: [0, 1] }), "", false, stop))).toEqual({ pick: null, note: "stopAgain" });
    expect(afterMissed(missed(run(1, { flips: [0] }), run(2, { clue: 1, flips: [0] }), "", false, stop))).toEqual({ pick: null, note: "clueChanged" });
    expect(afterMissed(missed(run(1, { flips: [0] }), run(2, { done: true }), "", false, stop))).toEqual({ pick: null, note: "finished" });
  });
});
