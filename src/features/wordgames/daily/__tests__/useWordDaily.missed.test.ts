import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth.store";
import { useWordDaily, type WordAnswerMissed } from "../useWordDaily";
import { DailyGameApiError, type WordDailyApi, type WordRun, type WordRunStateBase } from "../wordDaily.api";

const DAY = "2026-10-12";
const OTHER_DAY = "2026-10-11";
const CALENDAR = { contentStart: "2026-10-10", rankedStart: "2026-10-11", publishedDays: 30 };
type State = WordRunStateBase & { found: string[] };
const runAt = (version: number, found: string[], day = DAY): WordRun<State> => ({
  run: { id: `r-${day}`, version },
  state: { day, open: false, deadline: null, serverNow: new Date().toISOString(), done: false, score: found.length, ranked: false, found },
});
const stale = () => new DailyGameApiError("stale_state", 409);
const offline = () => new TypeError("Failed to fetch");

function setup(answer: WordDailyApi<State, "right">["answer"], start: ReturnType<typeof vi.fn>) {
  const missed = vi.fn<(m: WordAnswerMissed<State>) => void>();
  const api = {
    boards: vi.fn(async () => ({ days: { [DAY]: 1, [OTHER_DAY]: 1 } })),
    current: vi.fn(async () => ({ run: null })),
    start, answer,
  } as unknown as WordDailyApi<State, "right">;
  const hook = renderHook(() => useWordDaily<State, "right">({ api, calendar: CALENDAR, locale: "en", initialDay: DAY, resendLostAnswers: true, onAnswerNotSaved: missed }));
  return { hook, missed };
}

async function playTo(hook: ReturnType<typeof setup>["hook"]) {
  await waitFor(() => expect(hook.result.current.day).toBe(DAY));
  await act(async () => { await hook.result.current.play(); });
  expect(hook.result.current.run?.run.version).toBe(1);
}

describe("useWordDaily: onAnswerNotSaved", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
    useAuthStore.setState({ status: "authenticated", user: { id: "member-1" } as never });
  });
  afterEach(() => { vi.useRealTimers(); });

  it("a stale refusal: reported once on the re-synced copy, never resent", async () => {
    const answer = vi.fn(async () => { throw stale(); });
    const start = vi.fn().mockResolvedValueOnce(runAt(1, [])).mockResolvedValue(runAt(2, ["A"]));
    const { hook, missed } = setup(answer, start);
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B", { move: "x" }); });
    expect(answer).toHaveBeenCalledTimes(1);
    expect(missed).toHaveBeenCalledTimes(1);
    const m = missed.mock.calls[0][0];
    expect([m.sentOn.run.version, m.fresh.run.version, m.text, m.extra, m.lost]).toEqual([1, 2, "B", { move: "x" }, false]);
    expect(hook.result.current.state?.found).toEqual(["A"]);
  });

  it("a lost reply whose answer landed: reported as lost (the game checks the copy), sent once", async () => {
    const answer = vi.fn(async () => { throw offline(); });
    const start = vi.fn().mockResolvedValueOnce(runAt(1, [])).mockResolvedValue(runAt(2, ["B"]));
    const { hook, missed } = setup(answer, start);
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B"); });
    expect(answer).toHaveBeenCalledTimes(1);
    expect(missed.mock.calls.map((c) => c[0].lost)).toEqual([true]);
    expect(hook.result.current.state?.found).toEqual(["B"]);
  });

  it("a lost answer that never landed is resent, not reported", async () => {
    const answer = vi.fn()
      .mockRejectedValueOnce(offline())
      .mockImplementation(async (_run: WordRun<State>, text: string) => ({ ...runAt(2, [text]), result: "right" as const }));
    const start = vi.fn().mockResolvedValue(runAt(1, []));
    const { hook, missed } = setup(answer, start);
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B"); });
    expect(answer).toHaveBeenCalledTimes(2);
    expect(missed).not.toHaveBeenCalled();
    expect(hook.result.current.state?.found).toEqual(["B"]);
  });

  it("a stale refusal while the re-sync is offline: reported once the connection is back", async () => {
    const answer = vi.fn(async () => { throw stale(); });
    const start = vi.fn().mockResolvedValueOnce(runAt(1, [])).mockRejectedValue(offline());
    const { hook, missed } = setup(answer, start);
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B"); });
    expect(missed).not.toHaveBeenCalled();
    expect(hook.result.current.notice).toBe("connection");
    start.mockResolvedValue(runAt(2, ["A"]));
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(missed).toHaveBeenCalledTimes(1));
    expect(missed.mock.calls[0][0].fresh.run.version).toBe(2);
    expect(answer).toHaveBeenCalledTimes(1);
  });

  it("a newer copy read meanwhile overtakes the recovery's own read: the refusal is still reported, against it", async () => {
    const answer = vi.fn(async () => { throw stale(); });
    let release: (r: WordRun<State>) => void = () => {};
    const start = vi.fn().mockResolvedValueOnce(runAt(1, [])).mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    const missed = vi.fn<(m: WordAnswerMissed<State>) => void>();
    const api = {
      boards: vi.fn(async () => ({ days: { [DAY]: 1 } })),
      current: vi.fn(async () => ({ run: null })),
      start, answer,
    } as unknown as WordDailyApi<State, "right">;
    const hook = renderHook(({ locale }) => useWordDaily<State, "right">({ api, calendar: CALENDAR, locale, initialDay: DAY, onAnswerNotSaved: missed }), { initialProps: { locale: "en" } });
    await waitFor(() => expect(hook.result.current.day).toBe(DAY));
    await act(async () => { await hook.result.current.play(); });
    let done!: Promise<unknown>;
    act(() => { done = hook.result.current.answer("B"); });
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    // The background read (here: a language change) lands v3 before the re-sync's v2.
    (api.current as ReturnType<typeof vi.fn>).mockResolvedValue(runAt(3, ["A", "C"]));
    hook.rerender({ locale: "es" });
    await waitFor(() => expect(hook.result.current.run?.run.version).toBe(3));
    await act(async () => { release(runAt(2, ["A"])); await done; });
    expect(hook.result.current.run?.run.version).toBe(3);
    expect(missed).toHaveBeenCalledTimes(1);
    expect([missed.mock.calls[0][0].fresh.run.version, missed.mock.calls[0][0].lost]).toEqual([3, false]);
    expect(answer).toHaveBeenCalledTimes(1);
  });

  it("an answer waiting for the connection is dropped when the player opens another day", async () => {
    const answer = vi.fn(async () => { throw offline(); });
    const start = vi.fn().mockResolvedValueOnce(runAt(1, [])).mockRejectedValue(offline());
    const { hook, missed } = setup(answer, start);
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B"); });
    act(() => { hook.result.current.openDay(OTHER_DAY); });
    await waitFor(() => expect(hook.result.current.day).toBe(OTHER_DAY));
    start.mockImplementation(async (day: string) => runAt(1, [], day));
    await act(async () => { await hook.result.current.play(); });
    await act(async () => { window.dispatchEvent(new Event("online")); await new Promise((r) => setTimeout(r, 50)); });
    expect(answer).toHaveBeenCalledTimes(1);
    expect(missed).not.toHaveBeenCalled();
  });

  it("an answer waiting for the connection is dropped when another player signs in", async () => {
    const answer = vi.fn(async () => { throw offline(); });
    const start = vi.fn().mockResolvedValueOnce(runAt(1, [])).mockRejectedValue(offline());
    const { hook, missed } = setup(answer, start);
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B"); });
    act(() => { useAuthStore.setState({ status: "authenticated", user: { id: "member-2" } as never }); });
    start.mockResolvedValue(runAt(1, []));
    await act(async () => { await hook.result.current.play(); });
    await act(async () => { window.dispatchEvent(new Event("online")); await new Promise((r) => setTimeout(r, 50)); });
    expect(answer).toHaveBeenCalledTimes(1);
    expect(missed).not.toHaveBeenCalled();
  });

  it("leaving the screen during the recovery: nothing is reported or resent", async () => {
    let refuse: (e: unknown) => void = () => {};
    const answer = vi.fn(() => new Promise<never>((_, reject) => { refuse = reject; }));
    const start = vi.fn().mockResolvedValueOnce(runAt(1, [])).mockResolvedValue(runAt(2, ["A"]));
    const { hook, missed } = setup(answer, start);
    await playTo(hook);
    let pending!: Promise<unknown>;
    act(() => { pending = hook.result.current.answer("B"); });
    hook.unmount();
    await act(async () => { refuse(stale()); await pending; });
    expect(missed).not.toHaveBeenCalled();
    expect(answer).toHaveBeenCalledTimes(1);
  });
});
