import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth.store";
import { useWordDaily } from "../useWordDaily";
import { type WordDailyApi, type WordRun, type WordRunStateBase } from "../wordDaily.api";

const DAY = "2026-10-12";
const CALENDAR = { contentStart: "2026-10-10", rankedStart: "2026-10-11", publishedDays: 30 };
type State = WordRunStateBase & { found: string[] };
const runAt = (version: number, found: string[]): WordRun<State> => ({
  run: { id: "r1", version },
  state: { day: DAY, open: false, deadline: null, serverNow: new Date().toISOString(), done: false, score: found.length, ranked: false, found },
});
const offline = () => new TypeError("Failed to fetch");

function setup(resendLostAnswers: boolean, answer: WordDailyApi<State, "right">["answer"], start: ReturnType<typeof vi.fn>) {
  const api = {
    boards: vi.fn(async () => ({ days: { [DAY]: 1 } })),
    current: vi.fn(async () => ({ run: null })),
    start, answer,
  } as unknown as WordDailyApi<State, "right">;
  return renderHook(() => useWordDaily<State, "right">({ api, calendar: CALENDAR, locale: "en", initialDay: DAY, resendLostAnswers }));
}

async function playTo(hook: ReturnType<typeof setup>) {
  await waitFor(() => expect(hook.result.current.day).toBe(DAY));
  await act(async () => { await hook.result.current.play(); });
  expect(hook.result.current.run?.run.version).toBe(1);
}

describe("useWordDaily: an answer lost on the network", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
    useAuthStore.setState({ status: "authenticated", user: { id: "member-1" } as never });
  });
  afterEach(() => { vi.useRealTimers(); });

  it("is sent again when the re-synced run shows it never landed", async () => {
    const answer = vi.fn()
      .mockRejectedValueOnce(offline())
      .mockImplementation(async (_run: WordRun<State>, text: string) => ({ ...runAt(2, [text]), result: "right" as const }));
    const start = vi.fn().mockResolvedValue(runAt(1, []));
    const hook = setup(true, answer, start);
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B"); });
    expect(answer.mock.calls.map((c) => c[0].run.version)).toEqual([1, 1]);
    expect(hook.result.current.state?.found).toEqual(["B"]);
  });

  it("is not sent again when the re-synced run shows it landed (only the response was lost)", async () => {
    const answer = vi.fn(async () => { throw offline(); });
    const start = vi.fn().mockResolvedValueOnce(runAt(1, [])).mockResolvedValue(runAt(2, ["B"]));
    const hook = setup(true, answer, start);
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B"); });
    expect(answer).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state?.found).toEqual(["B"]);
  });

  it("still offline: waits, then sends it once when the connection is back and the run is unchanged", async () => {
    const answer = vi.fn()
      .mockRejectedValueOnce(offline())
      .mockImplementation(async (_run: WordRun<State>, text: string) => ({ ...runAt(2, [text]), result: "right" as const }));
    const start = vi.fn().mockResolvedValueOnce(runAt(1, [])).mockRejectedValue(offline());
    const hook = setup(true, answer, start);
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B"); });
    expect(answer).toHaveBeenCalledTimes(1);
    expect(hook.result.current.notice).toBe("connection");

    start.mockResolvedValue(runAt(1, []));
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(hook.result.current.state?.found).toEqual(["B"]));
    expect(answer).toHaveBeenCalledTimes(2);
    expect(hook.result.current.notice).toBeNull();
  });

  it("still offline: not sent again when the run read after reconnecting shows it landed", async () => {
    const answer = vi.fn(async () => { throw offline(); });
    const start = vi.fn().mockResolvedValueOnce(runAt(1, [])).mockRejectedValue(offline());
    const hook = setup(true, answer, start);
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B"); });
    start.mockResolvedValue(runAt(2, ["B"]));
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(hook.result.current.run?.run.version).toBe(2));
    expect(answer).toHaveBeenCalledTimes(1);
  });

  it("stops after three sends the server never got, and says so", async () => {
    const answer = vi.fn(async () => { throw offline(); });
    const start = vi.fn().mockResolvedValue(runAt(1, []));
    const hook = setup(true, answer, start);
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B"); });
    expect(answer).toHaveBeenCalledTimes(3);
    expect(hook.result.current.notice).toBe("actionError");
    expect(hook.result.current.pending).toBeNull();
  });

  it("a game without the option only re-syncs", async () => {
    const answer = vi.fn(async () => { throw offline(); });
    const start = vi.fn().mockResolvedValue(runAt(1, []));
    const hook = setup(false, answer, start);
    await playTo(hook);
    await act(async () => { await hook.result.current.answer("B"); });
    expect(answer).toHaveBeenCalledTimes(1);
  });
});
