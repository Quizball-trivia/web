import { beforeEach, describe, expect, it } from "vitest";
import { finishedFromServer, finishedScores, inProgressDays, loadRun, saveRun, streakFrom } from "../pistas.storage";
import type { PistasRun } from "@/lib/repositories/pistas.repo";

const run = (done: boolean, score: number): PistasRun => ({
  run: { id: "r1", version: 3 },
  state: { day: "2026-09-28", round: 9, totalRounds: 10, clues: [], revealed: 1, pointsInPlay: 10, wrongGuesses: 0, ceiling: null, canReveal: true, settled: null, results: [], done, score, solved: 0, ranked: false },
});

describe("pistas storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps runs per player and drops them when the board is corrected", () => {
    saveRun("2026-09-28", 7, run(true, 55), "guest");
    expect(loadRun("2026-09-28", 7, "guest")?.state.score).toBe(55);
    expect(loadRun("2026-09-28", 7, "user-1")).toBeNull();
    expect(loadRun("2026-09-28", 8, "guest")).toBeNull();
    expect(loadRun("2026-09-28", 7, "guest")).toBeNull();
  });

  it("lists finished and unfinished days and counts the streak", () => {
    saveRun("2026-09-28", 1, run(true, 40), "guest");
    saveRun("2026-09-27", 1, run(false, 10), "guest");
    expect(finishedScores(["2026-09-28", "2026-09-27"], "guest")).toEqual({ "2026-09-28": 40 });
    expect([...inProgressDays(["2026-09-28", "2026-09-27"], "guest")]).toEqual(["2026-09-27"]);
    expect(streakFrom(["2026-09-29", "2026-09-28", "2026-09-27"], { "2026-09-28": 40, "2026-09-27": 12 })).toBe(2);
    expect(streakFrom(["2026-09-29", "2026-09-28"], { "2026-09-29": 1 })).toBe(1);
  });

  it("adopts a run the server finished but this device never saw, and the archive and streak catch up", () => {
    const days = ["2026-09-29", "2026-09-28", "2026-09-27"];
    saveRun("2026-09-28", 1, run(true, 40), "guest");
    expect(finishedScores(days, "guest")).toEqual({ "2026-09-28": 40 });

    const finishedOnServer = run(true, 63);
    const adopted = finishedFromServer(null, finishedOnServer);
    expect(adopted).toBe(finishedOnServer);
    saveRun("2026-09-29", 1, adopted!, "guest");
    expect(finishedScores(days, "guest")).toEqual({ "2026-09-29": 63, "2026-09-28": 40 });
    expect(streakFrom(days, finishedScores(days, "guest"))).toBe(2);
  });

  it("only adopts a server run that is finished and newer than what the device holds", () => {
    expect(finishedFromServer(null, { run: null })).toBeNull();
    expect(finishedFromServer(null, run(false, 12))).toBeNull();
    expect(finishedFromServer(run(false, 12), run(true, 63))?.state.score).toBe(63);
    expect(finishedFromServer(run(true, 55), run(true, 63))).toBeNull();
  });
});
