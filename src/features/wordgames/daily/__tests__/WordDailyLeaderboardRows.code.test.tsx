import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ t: (key: string) => key }) }));
const target = "../WordDailyLeaderboardTable";

beforeEach(() => vi.resetModules());
afterEach(() => { vi.doUnmock(target); vi.restoreAllMocks(); });

describe("real word leaderboard code cache", () => {
  // Exercise one real module lifecycle: failure must precede the permanent
  // success cache. resetModules does not clear Vitest's separate mock cache.
  it("shares in-flight imports, retries a rejected chunk and caches only resolved code", async () => {
    vi.doMock(target, () => { throw new Error("simulated module download failure"); });
    const { wordLeaderboardTableCode: code } = await import("../WordDailyLeaderboardRows");
    const failed = code.load();
    expect(code.load()).toBe(failed);
    await expect(failed).rejects.toThrow();
    vi.doUnmock(target);
    const retry = code.load();
    expect(retry).not.toBe(failed);
    expect(code.load()).toBe(retry);
    const resolved = await retry;
    const { LeaderboardTable } = await import("@/features/leaderboard/components/LeaderboardTable");
    expect(resolved.default).toBe(LeaderboardTable);

    const unexpectedImport = vi.fn(() => { throw new Error("reloaded a cached chunk"); });
    vi.doMock(target, unexpectedImport);
    expect(await code.load()).toEqual(resolved);
    expect(unexpectedImport).not.toHaveBeenCalled();
  });
});
