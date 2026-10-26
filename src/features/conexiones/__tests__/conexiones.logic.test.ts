import { describe, expect, it } from "vitest";
import { inventedBoard } from "@/features/playground/fixtures/conexiones.deck";
import { DUEL_MISSES, SOLO_MISTAKES, duelName, duelNext, duelSubmit, duelTimeout, judge, newDuel, newSolo, soloGuess, starterOf, type CxBoard, type CxDuelState } from "../conexiones.logic";

const b = inventedBoard(0);
const g = (i: number) => [...b.groups[i].members];
const near = (i: number, j: number) => [...g(i).slice(0, 3), g(j)[3]];
const flat = (a: number, c: number) => [...g(a).slice(0, 2), ...g(c).slice(0, 2)];
const keep = <T,>(xs: T[]) => xs;

describe("judge", () => {
  it("right, one away and wrong", () => {
    expect(judge(b, g(0)).verdict).toBe("right");
    expect(judge(b, near(0, 1)).verdict).toBe("oneAway");
    expect(judge(b, flat(0, 1)).verdict).toBe("wrong");
  });
  it("refuses a repeated tile", () => expect(() => judge(b, [g(0)[0], g(0)[0], g(0)[1], g(0)[2]])).toThrow());
});

describe("solo", () => {
  it("a repeated four costs nothing", () => {
    const one = soloGuess(b, newSolo(b, "d", 0), flat(0, 1), 1).state;
    const again = soloGuess(b, one, [...flat(0, 1)].reverse(), 2);
    expect(again.outcome).toBe("repeat");
    expect(again.state.mistakes).toBe(1);
  });
  it("four mistakes lose and reveal the rest", () => {
    let s = newSolo(b, "d", 0);
    for (const t of [flat(0, 1), flat(1, 2), flat(2, 3), near(3, 0)]) s = soloGuess(b, s, t, 1).state;
    expect(s.mistakes).toBe(SOLO_MISTAKES);
    expect(s.status).toBe("lost");
    expect(s.solved.every((x) => x.missed)).toBe(true);
  });
  it("tiles of a solved group cannot be picked again", () => {
    const s = soloGuess(b, newSolo(b, "d", 0), g(0), 1).state;
    expect(soloGuess(b, s, [g(0)[0], ...g(1).slice(0, 3)], 2).state).toBe(s);
  });
  it("four groups win", () => {
    let s = newSolo(b, "d", 0);
    for (let i = 0; i < 4; i++) s = soloGuess(b, s, g(i), 10 + i).state;
    expect(s.status).toBe("won");
    expect(s.endedAt).toBe(13);
  });
});

describe("duel", () => {
  const boards: CxBoard[] = [0, 1, 2, 3, 4].map(inventedBoard);
  const at = (s: CxDuelState) => s.deadline - 1;
  const open = (s: CxDuelState) => s.boards[s.index].groups.filter((x) => !s.solved.some((y) => y.groupId === x.id));

  it("the turn passes on a hit and on a miss", () => {
    let s = newDuel(boards, 0, 0);
    s = duelSubmit(s, 0, [...open(s)[0].members], at(s), keep);
    expect(s.scores).toEqual([1, 0]);
    expect(s.turn).toBe(1);
    const og = open(s);
    s = duelSubmit(s, 1, [...og[0].members.slice(0, 3), og[1].members[0]], at(s), keep);
    expect(s.turn).toBe(0);
    expect(s.last?.kind).toBe("oneAway");
  });

  it("the seat not on turn cannot play", () => {
    const s = newDuel(boards, 0, 0);
    expect(duelSubmit(s, 1, [...open(s)[0].members], at(s), keep)).toBe(s);
  });

  it("the last four are named by the seat on turn; a right name scores", () => {
    let s = newDuel(boards, 0, 0);
    for (let i = 0; i < 3; i++) s = duelSubmit(s, s.turn, [...open(s)[0].members], at(s), keep);
    expect(s.phase).toBe("name");
    expect(s.turn).toBe(1);
    expect(s.nameOptions).toHaveLength(4);
    const right = open(s)[0].link.en;
    s = duelName(s, 1, right, at(s));
    expect(s.scores).toEqual([2, 2]);
    expect(s.phase).toBe("reveal");
  });

  it("a wrong name scores nothing and closes the board", () => {
    let s = newDuel(boards, 0, 0);
    for (let i = 0; i < 3; i++) s = duelSubmit(s, s.turn, [...open(s)[0].members], at(s), keep);
    s = duelName(s, 1, open(s)[0].decoys[0].en, at(s));
    expect(s.scores).toEqual([2, 1]);
    expect(s.solved.at(-1)?.missed).toBe(true);
  });

  it(`${DUEL_MISSES} misses end the board`, () => {
    let s = newDuel(boards, 0, 0);
    for (let k = 0; k < DUEL_MISSES; k++) {
      const og = open(s);
      s = duelSubmit(s, s.turn, [...og[0].members.filter((_, i) => i !== k % 4), og[1 + (k % 3)].members[k % 4]], at(s), keep);
    }
    expect(s.phase).toBe("reveal");
    expect(s.order).toEqual([]);
  });

  it("openers alternate between boards", () => {
    const s = newDuel(boards, 1, 0);
    expect([0, 1, 2, 3, 4].map((i) => starterOf(s, i))).toEqual([1, 0, 1, 0, 1]);
  });

  it("two timeouts in a row forfeit; a real move resets the count", () => {
    let s = newDuel(boards, 0, 0);
    s = duelTimeout(s, s.deadline);
    s = duelSubmit(s, 1, [...open(s)[0].members], at(s), keep);
    s = duelSubmit(s, 0, [...open(s)[0].members], at(s), keep);
    s = duelTimeout(s, s.deadline);
    s = duelTimeout(s, s.deadline);
    expect(s.phase).toBe("turn");
    expect(s.timeouts).toEqual([1, 1]);
    s = duelTimeout(s, s.deadline);
    expect(s.result).toEqual({ winner: 0, reason: "forfeit" });
  });

  it("the match ends after the last board with the higher score", () => {
    let s = newDuel(boards, 0, 0);
    while (s.phase !== "over") {
      if (s.phase === "turn") s = duelSubmit(s, s.turn, [...open(s)[0].members], at(s), keep);
      else if (s.phase === "name") s = duelName(s, s.turn, open(s)[0].link.en, at(s));
      else s = duelNext(s, s.deadline);
    }
    expect(s.scores).toEqual([10, 10]);
    expect(s.result).toEqual({ winner: null, reason: "score" });
  });
});
