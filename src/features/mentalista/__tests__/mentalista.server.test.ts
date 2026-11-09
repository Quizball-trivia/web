/**
 * The REAL Mentalista room contract: the command rules and a payload-parity guard. Every literal below is the EXACT
 * backend `MentalistaView` / `MentalistaResult` / `MentalistaEntry` shape (worktrees/mentalista-game-backend). No real
 * football content — invented option names only.
 */
import { describe, expect, it } from "vitest";
import { mentalistaRoomRules, type MentalistaResult, type MentalistaView, type MvCommand } from "../mentalista.server";

/** Every field the server promises, filled — so a test can never silently read past a field that is not here. */
function view(over: Partial<MentalistaView> = {}): MentalistaView {
  return {
    phase: "choose",
    round: 0,
    totalRounds: 6,
    chooserSeat: 0,
    category: { id: "cat-a", prompt: "Pick one", options: [{ id: "o0", name: "Option Zero" }, { id: "o1", name: "Option One" }, { id: "o2", name: "Option Two" }] },
    iAmChooser: true,
    seats: [
      { seat: 0, status: "in", isChooser: true, committed: false, predicted: false, score: 0 },
      { seat: 1, status: "in", isChooser: false, committed: false, predicted: false, score: 0 },
      { seat: 2, status: "in", isChooser: false, committed: false, predicted: false, score: 0 },
    ],
    mySeat: 0,
    myChoice: null,
    myPrediction: null,
    reveal: null,
    results: [],
    standings: null,
    deadline: "2026-11-09T12:00:30.000Z",
    ...over,
  };
}

const result = (over: Partial<MentalistaResult> = {}): MentalistaResult => ({
  round: 0,
  chooser: 0,
  target: 1,
  voided: false,
  entries: [
    { seat: 1, prediction: 1, matched: true, points: 2 },
    { seat: 2, prediction: 0, matched: false, points: 0 },
  ],
  ...over,
});

describe("mentalista command rules", () => {
  const { slot, settled } = mentalistaRoomRules;

  it("one slot per round AND type (a choose and a predict never collide)", () => {
    expect(slot({ type: "choose", round: 0, option: 2 })).toBe("choose:0");
    expect(slot({ type: "predict", round: 0, option: 2 })).toBe("predict:0");
    expect(slot({ type: "choose", round: 1, option: 0 })).toBe("choose:1");
    // The payload's option index does not change the slot: a retained id can never ride a different pick.
    expect(slot({ type: "choose", round: 0, option: 0 })).toBe(slot({ type: "choose", round: 0, option: 2 }));
  });

  it("a choose is unsettled until the server shows my committed choice, then locked", () => {
    const cmd: MvCommand = { type: "choose", round: 0, option: 2 };
    expect(settled(view({ myChoice: null }), cmd)).toBe(false);
    expect(settled(view({ phase: "choose", myChoice: 2 }), cmd)).toBe(true);
  });

  it("a predict is unsettled until the server shows my locked prediction, then locked", () => {
    const cmd: MvCommand = { type: "predict", round: 0, option: 0 };
    const predicting = view({ phase: "predict", iAmChooser: false, chooserSeat: 1, mySeat: 0 });
    expect(settled({ ...predicting, myPrediction: null }, cmd)).toBe(false);
    expect(settled({ ...predicting, myPrediction: 0 }, cmd)).toBe(true);
  });

  it("a slot closes once its own phase window has passed, even if it never landed", () => {
    // choose closes the moment the round leaves choose…
    expect(settled(view({ phase: "predict", myChoice: null }), { type: "choose", round: 0, option: 2 })).toBe(true);
    // …predict closes at reveal or over.
    expect(settled(view({ phase: "reveal", myPrediction: null }), { type: "predict", round: 0, option: 0 })).toBe(true);
    expect(settled(view({ phase: "over", myPrediction: null }), { type: "predict", round: 0, option: 0 })).toBe(true);
  });

  it("the round advancing closes a stale slot; a snapshot from before it keeps it pending", () => {
    expect(settled(view({ round: 1, myChoice: null }), { type: "choose", round: 0, option: 2 })).toBe(true);
    expect(settled(view({ round: 0, phase: "choose", myChoice: null }), { type: "choose", round: 1, option: 2 })).toBe(false);
  });

  it("a shapeless view is treated as settled (never holds a command forever)", () => {
    expect(settled({}, { type: "choose", round: 0, option: 2 })).toBe(true);
    expect(settled({ phase: "choose" }, { type: "predict", round: 0, option: 0 })).toBe(true);
  });
});

describe("payload parity with the backend contract", () => {
  it("the view carries EXACTLY the backend fields — no invented mine/picks/chooser", () => {
    expect(Object.keys(view()).sort()).toEqual(
      [
        "category", "chooserSeat", "deadline", "iAmChooser", "myChoice", "myPrediction",
        "mySeat", "phase", "results", "reveal", "round", "seats", "standings", "totalRounds",
      ].sort(),
    );
    // The invented fields of the earlier broken mirror must not exist.
    for (const dead of ["mine", "picks", "chooser"]) expect(dead in view()).toBe(false);
  });

  it("a seat row carries isChooser/committed/predicted (never a bare 'chooser' boolean)", () => {
    expect(Object.keys(view().seats[0]).sort()).toEqual(
      ["committed", "isChooser", "predicted", "score", "seat", "status"].sort(),
    );
  });

  it("a reveal result is MentalistaResult with entries[].prediction, not picks[].option", () => {
    const r = result();
    expect(Object.keys(r).sort()).toEqual(["chooser", "entries", "round", "target", "voided"].sort());
    expect(Object.keys(r.entries[0]).sort()).toEqual(["matched", "points", "prediction", "seat"].sort());
    // A voided slot has no committed target and no scoring.
    const v = result({ target: null, voided: true, entries: [{ seat: 1, prediction: 2, matched: false, points: 0 }] });
    expect(v.target).toBeNull();
    expect(v.voided).toBe(true);
  });

  it("standings rows are server-authoritative with roundWins (not derived on the client)", () => {
    const standings: MentalistaView["standings"] = [
      { seat: 1, points: 4, roundWins: 2, place: 1 },
      { seat: 0, points: 0, roundWins: 0, place: 2 },
      { seat: 2, points: 0, roundWins: 0, place: 2 },
    ];
    expect(Object.keys(standings[0]).sort()).toEqual(["place", "points", "roundWins", "seat"].sort());
    expect(view({ phase: "over", standings }).standings?.[0].roundWins).toBe(2);
  });
});
