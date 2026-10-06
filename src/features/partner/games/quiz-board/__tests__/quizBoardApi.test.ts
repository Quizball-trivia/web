import { describe, expect, it } from "vitest";
import { isStale, serverOffset, shownOwners, shownScore, type QuizBoardEvent, type QuizBoardView } from "../quizBoardApi";

const event = (seq: number, e: Partial<QuizBoardEvent>): QuizBoardEvent => ({
  seq, actor: "player", kind: "answer", tile: null, correct: null, choice: null, points: 0, ...e,
});

const view = (events: QuizBoardEvent[], owners: Record<number, QuizBoardView["tiles"][number]["owner"]>): QuizBoardView => ({
  playId: "p", phase: "pick", turn: 3, serverNow: "", deadlineAt: null, playerScore: 0,
  categories: ["a", "b", "c"],
  tiles: Array.from({ length: 9 }, (_, tile) => ({ tile, category: Math.floor(tile / 3), row: tile % 3, value: (tile % 3 + 1) * 100, owner: owners[tile] ?? null })),
  activeTile: null, question: null, result: null, events,
});

describe("quiz board (solo) view helpers", () => {
  // Right on tile 2 (300), wrong on tile 4, timeout on tile 7.
  const events = [
    event(1, { kind: "pick", tile: 2 }),
    event(2, { kind: "answer", tile: 2, correct: true, choice: 1, correctIndex: 1, points: 300 }),
    event(3, { kind: "pick", tile: 4 }),
    event(4, { kind: "answer", tile: 4, correct: false, choice: 0, correctIndex: 3 }),
    event(5, { kind: "pick", tile: 7 }),
    event(6, { kind: "timeout", tile: 7, correct: false, correctIndex: 2 }),
  ];
  const v = view(events, { 2: "player", 4: "none", 7: "none" });

  it("shows a tile as used only once its answer has been shown", () => {
    expect(shownOwners(v, 1).get(2)).toBeNull();
    expect(shownOwners(v, 2).get(2)).toBe("player");
    expect(shownOwners(v, 3).get(4)).toBeNull();
    expect(shownOwners(v, 4).get(4)).toBe("none");
    expect(shownOwners(v, 6).get(7)).toBe("none");
    expect(shownOwners(v, 6).get(0)).toBeNull();
  });

  it("counts the points as far as the answers on screen go", () => {
    expect(shownScore(v, 1)).toBe(0);
    expect(shownScore(v, 2)).toBe(300);
    expect(shownScore(v, 6)).toBe(300);
  });

  it("drops a response older than the view on screen", () => {
    const older = { ...v, turn: 2, events: events.slice(0, 2) };
    expect(isStale(v, older)).toBe(true);
    expect(isStale(v, { ...v, turn: 3, events: events.slice(0, 4) })).toBe(true);
    expect(isStale(older, v)).toBe(false);
    expect(isStale(v, { ...older, playId: "other" })).toBe(false);
    expect(isStale(null, v)).toBe(false);
  });
});

describe("quiz board timing", () => {
  const T = Date.parse("2026-10-06T10:00:00.000Z");
  const iso = (ms: number) => new Date(T + ms).toISOString();

  it("never trusts a delayed response's serverNow as the time it arrived", () => {
    // Server stamped at T; the response took 25 s to arrive. The device clock equals the server clock.
    const offset = serverOffset(null, iso(0), T - 100, T + 25_000);
    expect(T + 25_000 + offset).toBeGreaterThanOrEqual(T + 25_000);
    const tighter = serverOffset(offset, iso(30_000), T + 29_990, T + 30_010);
    expect(tighter).toBeLessThan(offset);
    expect(Math.abs(tighter)).toBeLessThanOrEqual(20);
    // A sample proving the bound wrong (device clock jumped back 60 s) replaces it.
    expect(serverOffset(tighter, iso(100_000), T + 40_000, T + 40_050)).toBe(60_000);
  });
});
