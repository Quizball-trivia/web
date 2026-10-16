import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth.store";
import { useWordDaily } from "../useWordDaily";
import { DailyGameApiError, type WordDailyApi, type WordRun, type WordRunStateBase } from "../wordDaily.api";

const DAY = "2026-10-12";
const CALENDAR = { contentStart: "2026-10-10", rankedStart: "2026-10-11", publishedDays: 30 };
type State = WordRunStateBase & { found: string[] };
const runAt = (version: number, found: string[]): WordRun<State> => ({
  run: { id: "r1", version },
  state: { day: DAY, open: false, deadline: null, serverNow: new Date().toISOString(), done: false, score: found.length, ranked: false, found },
});
const stale = () => new DailyGameApiError("stale_state", 409);

/** The run on the server: another tab already found "A" (version 2) while this tab still holds version 1. */
function setup(resendStaleAnswers: boolean, answer: WordDailyApi<State, "right">["answer"]) {
  const start = vi.fn()
    .mockResolvedValueOnce(runAt(1, []))
    .mockResolvedValue(runAt(2, ["A"]));
  const api = {
    boards: vi.fn(async () => ({ days: { [DAY]: 1 } })),
    current: vi.fn(async () => ({ run: null })),
    start, answer,
  } as unknown as WordDailyApi<State, "right">;
  const hook = renderHook(() => useWordDaily<State, "right">({ api, calendar: CALENDAR, locale: "en", initialDay: DAY, resendStaleAnswers }));
  return { hook, start, answer };
}

async function playTo(hook: ReturnType<typeof setup>["hook"]) {
  await waitFor(() => expect(hook.result.current.day).toBe(DAY));
  await act(async () => { await hook.result.current.play(); });
  expect(hook.result.current.run?.run.version).toBe(1);
}

describe("useWordDaily: an answer refused as stale", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
    useAuthStore.setState({ status: "authenticated", user: { id: "member-1" } as never });
  });
  afterEach(() => { vi.useRealTimers(); });

  it("is sent once more on the re-synced copy when the game allows it", async () => {
    const answer = vi.fn(async (run: WordRun<State>, text: string) => {
      if (run.run.version !== 2) throw stale();
      return { ...runAt(3, ["A", text]), result: "right" as const };
    });
    const { hook } = setup(true, answer);
    await playTo(hook);
    let out: unknown;
    await act(async () => { out = await hook.result.current.answer("B"); });
    expect(answer.mock.calls.map((c) => c[0].run.version)).toEqual([1, 2]);
    expect(out).not.toBeNull();
    expect(hook.result.current.state?.found).toEqual(["A", "B"]);
  });

  it("is resent at most once (a second stale refusal ends it; the caller gets null)", async () => {
    const answer = vi.fn(async () => { throw stale(); });
    const { hook } = setup(true, answer);
    await playTo(hook);
    let out: unknown = "unset";
    await act(async () => { out = await hook.result.current.answer("B"); });
    expect(answer).toHaveBeenCalledTimes(2);
    expect(out).toBeNull();
  });

  it("is only re-synced (never resent) for a game that does not allow it", async () => {
    const answer = vi.fn(async () => { throw stale(); });
    const { hook, start } = setup(false, answer);
    await playTo(hook);
    let out: unknown = "unset";
    await act(async () => { out = await hook.result.current.answer("B"); });
    expect(answer).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(2);
    expect(out).toBeNull();
    expect(hook.result.current.state?.found).toEqual(["A"]);
  });

  it("is not resent when the re-sync itself fails (the list was corrected meanwhile)", async () => {
    const answer = vi.fn(async () => { throw stale(); });
    const { hook, start } = setup(true, answer);
    start.mockReset();
    start.mockResolvedValueOnce(runAt(1, [])).mockRejectedValue(new DailyGameApiError("content_changed", 409));
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B"); });
    expect(answer).toHaveBeenCalledTimes(1);
    expect(hook.result.current.notice).toBe("restarted");
  });

  it("a lost response (network) is never resent: it may have been judged", async () => {
    const answer = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    const { hook } = setup(true, answer);
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B"); });
    expect(answer).toHaveBeenCalledTimes(1);
  });
});
