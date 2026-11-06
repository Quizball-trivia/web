import { describe, expect, it } from "vitest";
import { checkoutWindow, judgeDart } from "../d501.rules";
import { newRoom, newSolo, roomAnswer, roomTick, soloGiveUp, soloSay, withdraw, type RoomSim, type SimCategory } from "../d501.sim";

/** Invented players only (the repository is public). */
const CAT: SimCategory = {
  id: "aurora", title: "Liga Aurora apps", unit: "apps", asOf: null,
  players: [
    { name: "Tomás Varelo", aliases: [], stat: 180 }, { name: "Iker Montañés", aliases: [], stat: 171 }, { name: "Bruno Salcedal", aliases: [], stat: 140 },
    { name: "Nico Arrizábal", aliases: [], stat: 10 }, { name: "Dante Ferrolo", aliases: [], stat: 12 }, { name: "Lucas Oyarzábal", aliases: [], stat: 260 },
    { name: "Mateo Quirogal", aliases: [], stat: 173 }, { name: "Gael Ortuzar", aliases: [], stat: 30 },
  ],
};
const OTHER: SimCategory = { id: "brisa", title: "Liga Brisa goals", unit: "goals", asOf: null, players: [{ name: "Hugo Maldonar", aliases: [], stat: 50 }] };
const ALL = [CAT, OTHER];

describe("judgeDart", () => {
  it("scores, checks out from 0 to −10, busts past −10 and refuses over 180", () => {
    expect(judgeDart(501, 180)).toEqual({ verdict: "score", after: 321 });
    expect(judgeDart(40, 40)).toEqual({ verdict: "checkout", after: 0 });
    expect(judgeDart(40, 50)).toEqual({ verdict: "checkout", after: -10 });
    expect(judgeDart(40, 51)).toEqual({ verdict: "bust", after: 40 });
    expect(judgeDart(501, 181)).toEqual({ verdict: "over180", after: 501 });
    expect(judgeDart(501, null)).toEqual({ verdict: "miss", after: 501 });
  });
  it("scores bogey totals only without pro rules", () => {
    expect(judgeDart(501, 173).verdict).toBe("score");
    expect(judgeDart(501, 173, true)).toEqual({ verdict: "bogey", after: 501 });
  });
  it("names the checkout window, none above 180", () => {
    expect(checkoutWindow(63)).toEqual({ low: 63, high: 73 });
    expect(checkoutWindow(175)).toEqual({ low: 175, high: 180 });
    expect(checkoutWindow(181)).toBeNull();
  });
});

describe("solo", () => {
  it("counts thrown darts, keeps free answers free and ends on a checkout", () => {
    let s = newSolo(CAT, "2026-11-01");
    s = soloSay(ALL, CAT, s, "Oyarzábal"); // 260: over 180, dart used
    s = soloSay(ALL, CAT, s, "Nobody Known"); // unknown: free
    s = soloSay(ALL, CAT, s, "Hugo Maldonar"); // real, other category: miss
    s = soloSay(ALL, CAT, s, "Varelo"); // 321
    s = soloSay(ALL, CAT, s, "Varelo"); // repeat: free
    s = soloSay(ALL, CAT, s, "Montañés"); // 150
    s = soloSay(ALL, CAT, s, "Salcedal"); // 10
    expect(s.darts.map((d) => d.verdict)).toEqual(["over180", "miss", "score", "score", "score"]);
    expect(s.remaining).toBe(10);
    expect(s.outs).toBe(2); // 10 and 12 check out from 10 (−2 is inside −10)
    s = soloSay(ALL, CAT, s, "Arrizábal");
    expect(s).toMatchObject({ status: "done", endReason: "checkout", remaining: 0 });
  });
  it("shows the finishes left after giving up", () => {
    const s = soloGiveUp(CAT, { ...newSolo(CAT, "2026-11-01"), remaining: 30 });
    expect(s.finishes?.map((f) => f.name)).toEqual(["Gael Ortuzar"]);
  });
});

/** A duel where both seats sit on `left` and seat 0 throws. */
function duelOn(left: [number, number]): RoomSim {
  let sim = newRoom([CAT], 2, 0);
  sim = roomTick(sim, 10_000);
  return { ...sim, view: { ...sim.view, seats: sim.view.seats.map((s, i) => ({ ...s, remaining: left[i] })) } };
}

describe("rooms", () => {
  it("lets the rest of the round throw after a checkout; closest to 0 takes the leg", () => {
    let sim = duelOn([12, 10]);
    sim = roomAnswer(sim, 0, "Gael Ortuzar"); // 12 − 30: bust
    expect(sim.view.turn).toBe(1);
    sim = duelOn([20, 10]);
    sim = roomAnswer(sim, 0, "Dante Ferrolo"); // 20 − 12 = 8: no
    sim = duelOn([10, 10]);
    sim = roomAnswer(sim, 0, "Dante Ferrolo"); // −2: checkout, seat 1 still throws
    expect(sim.view).toMatchObject({ phase: "turn", turn: 1, finishing: [{ seat: 0, at: -2 }] });
    const closer = roomAnswer(sim, 1, "Nico Arrizábal"); // exactly 0
    expect(closer.view.legEnd).toEqual({ winner: 1, reason: "checkout" });
    const miss = roomAnswer(sim, 1, "Bruno Salcedal"); // 10 − 140: bust
    expect(miss.view.legEnd).toEqual({ winner: 0, reason: "checkout" });
  });
  it("gives the leg to the first finisher when the second only ties", () => {
    let sim = duelOn([10, 22]);
    sim = roomAnswer(sim, 0, "Nico Arrizábal"); // 0
    sim = roomAnswer(sim, 1, "Dante Ferrolo"); // 10: no checkout
    expect(sim.view.legEnd?.winner).toBe(0);
  });
  it("does not give the closing seat a throw when the opener checks out last in the round", () => {
    let sim = duelOn([400, 10]);
    sim = roomAnswer(sim, 0, "Varelo"); // 220
    sim = roomAnswer(sim, 1, "Arrizábal"); // seat 1 is the last of the round: the leg ends now
    expect(sim.view.legEnd).toEqual({ winner: 1, reason: "checkout" });
  });
  it("turns a timeout into a no-score dart and a leaver into the rival's win", () => {
    let sim = duelOn([501, 501]);
    sim = roomTick(sim, Date.parse(sim.view.deadline!) + 1);
    expect(sim.view.darts.at(-1)?.verdict).toBe("time");
    expect(sim.view.turn).toBe(1);
    sim = withdraw(sim, 1);
    expect(sim.view.phase).toBe("over");
    expect(sim.view.standings?.find((r) => r.seat === 0)?.place).toBe(1);
  });
});
