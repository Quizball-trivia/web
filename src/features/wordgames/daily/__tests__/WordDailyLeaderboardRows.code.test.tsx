import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ t: (key: string) => key }) }));
type TableProps = ComponentProps<typeof import("@/features/leaderboard/components/LeaderboardTable").LeaderboardTable>;
const Table = (props: TableProps) => <div>{props.entries.length}</div>;
const target = "../WordDailyLeaderboardTable";

beforeEach(() => vi.resetModules());
afterEach(() => { vi.doUnmock(target); vi.restoreAllMocks(); });

describe("real word leaderboard code cache", () => {
  it("shares an in-flight import and retains only the resolved component", async () => {
    let finish!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    const factory = vi.fn(async () => { await gate; return { default: Table }; });
    vi.doMock(target, factory);
    const { wordLeaderboardTableCode: code } = await import("../WordDailyLeaderboardRows");
    const first = code.load();
    expect(code.load()).toBe(first);
    finish();
    expect(await first).toEqual({ default: Table });
    expect(await code.load()).toEqual({ default: Table });
    expect(factory).toHaveBeenCalledOnce();
  });

  it("clears a rejected in-flight promise so a subsequent import can retry", async () => {
    vi.doMock(target, () => { throw new Error("simulated module download failure"); });
    const { wordLeaderboardTableCode: code } = await import("../WordDailyLeaderboardRows");
    const failed = code.load();
    expect(code.load()).toBe(failed);
    await expect(failed).rejects.toThrow();
    const retryFactory = vi.fn(() => ({ default: Table }));
    vi.doMock(target, retryFactory);
    const retry = code.load();
    expect(retry).not.toBe(failed);
    expect(await retry).toEqual({ default: Table });
    expect(retryFactory).toHaveBeenCalledOnce();
  });
});
