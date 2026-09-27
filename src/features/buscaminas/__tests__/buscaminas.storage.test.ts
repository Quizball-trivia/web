import { beforeEach, describe, expect, it } from "vitest";
import { clearRun, finishedScores, loadRun, saveRun } from "../buscaminas.storage";
import type { BuscaminasRun } from "@/lib/repositories/buscaminas.repo";

const run = (done: boolean, score = 42): BuscaminasRun => ({
  token: `t-${score}`,
  state: { day: "2026-09-27", round: done ? 19 : 3, picked: [], found: 0, mine: null, settled: null, results: [], done, score, ranked: false },
});

describe("buscaminas saved runs", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps a guest run and each account's run apart", () => {
    saveRun("2026-09-27", 7, run(false, 1), "guest");
    saveRun("2026-09-27", 7, run(false, 2), "user-a");
    expect(loadRun("2026-09-27", 7, "guest")?.token).toBe("t-1");
    expect(loadRun("2026-09-27", 7, "user-a")?.token).toBe("t-2");
    expect(loadRun("2026-09-27", 7, "user-b")).toBeNull();
    clearRun("2026-09-27", "guest");
    expect(loadRun("2026-09-27", 7, "guest")).toBeNull();
    expect(loadRun("2026-09-27", 7, "user-a")).not.toBeNull();
  });

  it("drops a result from before a content correction so the archive stops counting it", () => {
    saveRun("2026-09-27", 7, run(true, 90), "guest");
    expect(finishedScores(["2026-09-27"], "guest")).toEqual({ "2026-09-27": 90 });
    expect(loadRun("2026-09-27", 8, "guest")).toBeNull();
    expect(finishedScores(["2026-09-27"], "guest")).toEqual({});
  });
});

describe("buscaminas archive versions", () => {
  beforeEach(() => window.localStorage.clear());

  it("skips results whose day was corrected, using the published index", () => {
    saveRun("2026-09-27", 7, run(true, 90), "guest");
    saveRun("2026-09-28", 5, run(true, 60), "guest");
    expect(finishedScores(["2026-09-27", "2026-09-28"], "guest", { "2026-09-27": 8, "2026-09-28": 5 })).toEqual({ "2026-09-28": 60 });
  });
});
