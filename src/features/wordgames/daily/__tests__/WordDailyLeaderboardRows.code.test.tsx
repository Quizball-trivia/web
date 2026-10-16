import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ t: (key: string) => key }) }));
type TableProps = ComponentProps<typeof import("@/features/leaderboard/components/LeaderboardTable").LeaderboardTable>;
const Table = (props: TableProps) => <div>{props.entries.length}</div>;
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
    let finish!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    const retryFactory = vi.fn(async () => { await gate; return { default: Table }; });
    vi.doUnmock(target);
    vi.doMock(target, retryFactory);
    const retry = code.load();
    expect(retry).not.toBe(failed);
    expect(code.load()).toBe(retry);
    finish();
    expect(await retry).toEqual({ default: Table });
    expect(await code.load()).toEqual({ default: Table });
    expect(retryFactory).toHaveBeenCalledOnce();
  });
});
