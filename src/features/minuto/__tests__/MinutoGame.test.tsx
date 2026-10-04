import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MinutoRun } from "@/lib/repositories/minuto.repo";

const auth = vi.hoisted(() => ({ status: "unauthenticated" as string, user: null as { id: string } | null }));
const api = vi.hoisted(() => ({ boards: vi.fn(), current: vi.fn(), start: vi.fn(), guess: vi.fn(), next: vi.fn(), review: vi.fn(), leaderboard: vi.fn() }));

vi.mock("@/stores/auth.store", () => ({ useAuthStore: (select: (s: typeof auth) => unknown) => select(auth) }));
vi.mock("@/lib/repositories/minuto.repo", async (importOriginal) => ({ ...(await importOriginal<object>()), minutoApi: api }));
vi.mock("@/lib/preferences/userPreferences", () => ({ useUserPreferences: () => ({ soundEnabled: false }) }));
vi.mock("@/lib/sounds/gameSounds", () => ({ playSfx: vi.fn() }));
vi.mock("@/lib/guest/guestSession", () => ({ peekGuestToken: () => "guest-token" }));
vi.mock("@/features/marketing/public/PublicLinks", () => ({ SignInLink: ({ children }: { children: React.ReactNode }) => <a href="#sign-in">{children}</a> }));
vi.mock("@/features/marketing/public/PublicCards", () => ({ PublicCardGrid: () => null }));
vi.mock("@/features/duel/PlayWithFriendButton", () => ({ PlayWithFriendButton: () => null }));
vi.mock("../MinutoLeaderboard", () => ({ MinutoLeaderboard: () => null }));
vi.mock("../minuto.analytics", () => Object.fromEntries(
  ["trackRoundEnd", "trackRunStart", "trackRunComplete", "trackShare", "trackArchiveOpen", "trackReport", "trackLeaderboardView", "trackActionError", "trackLoadError"].map((name) => [name, vi.fn()]),
));

import { MinutoApiError } from "@/lib/repositories/minuto.repo";
import { MinutoGame } from "../MinutoGame";
import { loadRun } from "../minuto.storage";

const name = (s: string) => ({ es: s, en: s, ka: s, tr: s });
const goal = {
  id: "g20220101-0000000000", tier: "easy", comp: "FIWC", year: 2022, date: "2022-12-18", stage: "final", group: null, leg: null,
  home: { kind: "nation", flag: "ar", name: name("Team A") }, away: { kind: "nation", flag: "fr", name: name("Team B") },
  score: [3, 3], aet: true, pens: [4, 2], side: "home", scorer: { name: name("Scorer"), photo: null }, penalty: false, scoreAfter: [3, 2], image: null,
} as NonNullable<MinutoRun["state"]["goal"]>;

const finishedRun = (day: string, score: number): MinutoRun => ({
  run: { id: "r1", version: 12 },
  state: { day, round: 9, totalRounds: 10, goal: null, settled: null, results: [], done: true, score, exact: 3, ranked: true },
});

describe("MinutoGame", () => {
  beforeEach(() => {
    // 16:00 in Tbilisi: this device's "today" is 3 October.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T12:00:00Z"));
    window.localStorage.clear();
    for (const fn of Object.values(api)) fn.mockReset();
    api.current.mockResolvedValue({ run: null });
    Object.assign(auth, { status: "unauthenticated", user: null });
  });
  afterEach(() => vi.useRealTimers());

  it("a guest refused for a day the server still has open moves to an earlier day, with the sign-in action", async () => {
    api.boards.mockResolvedValue({ days: { "2026-10-01": 1, "2026-10-02": 1 } });
    api.start.mockRejectedValueOnce(new MinutoApiError("sign_in_for_today", 403));
    render(<MinutoGame locale="en" />);
    fireEvent.click(await screen.findByRole("button", { name: "Play" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/previous day's goals/));
    expect(screen.getByRole("alert").querySelector("a")?.textContent).toBe("Play today's");
    api.start.mockResolvedValueOnce({ run: { id: "r2", version: 1 }, state: { ...finishedRun("2026-10-01", 0).state, done: false, round: 0, score: 0 } });
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() => expect(api.start).toHaveBeenLastCalledWith("2026-10-01", 1, "en"));
  });

  it("with no earlier day left the refused day is not offered again: the screen says why and offers sign-in", async () => {
    api.boards.mockResolvedValue({ days: { "2026-10-02": 1 } });
    api.start.mockRejectedValue(new MinutoApiError("sign_in_for_today", 403));
    render(<MinutoGame locale="en" />);
    fireEvent.click(await screen.findByRole("button", { name: "Play" }));
    await screen.findByText(/previous day's goals/);
    expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
    expect(screen.getByRole("link", { name: "Play today's" })).toBeTruthy();
    expect(api.start).toHaveBeenCalledTimes(1);
  });

  it("a refusal lasts until this device's day changes; after the rollover the refused day is offered again", async () => {
    api.boards.mockResolvedValue({ days: { "2026-10-02": 1 } });
    api.start.mockRejectedValueOnce(new MinutoApiError("sign_in_for_today", 403));
    render(<MinutoGame locale="en" />);
    fireEvent.click(await screen.findByRole("button", { name: "Play" }));
    await screen.findByRole("link", { name: "Play today's" });
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    act(() => { window.dispatchEvent(new Event("focus")); });
    api.start.mockResolvedValueOnce({ run: { id: "r3", version: 1 }, state: { ...finishedRun("2026-10-02", 0).state, done: false, round: 0, score: 0, goal } });
    fireEvent.click(await screen.findByRole("button", { name: "Play" }));
    await waitFor(() => expect(api.start).toHaveBeenLastCalledWith("2026-10-02", 1, "en"));
  });

  it("the chosen board is reported for the URL; a day that is not playable falls back to the default board", async () => {
    Object.assign(auth, { status: "authenticated", user: { id: "u1" } });
    api.boards.mockResolvedValue({ days: { "2026-10-01": 1, "2026-10-02": 1 } });
    const onDay = vi.fn();
    const { unmount } = render(<MinutoGame locale="en" initialDay="2026-10-01" onDay={onDay} />);
    await waitFor(() => expect(onDay).toHaveBeenLastCalledWith("2026-10-01"));
    unmount();
    const fallback = vi.fn();
    render(<MinutoGame locale="en" initialDay="2026-12-31" onDay={fallback} />);
    await waitFor(() => expect(fallback).toHaveBeenLastCalledWith("2026-10-02"));
  });

  it("switching boards on the open screen: a late answer for the old board stays there, and is looked up again on return", async () => {
    Object.assign(auth, { status: "authenticated", user: { id: "u1" } });
    api.boards.mockResolvedValue({ days: { "2026-10-01": 1, "2026-10-02": 1 } });
    let answerLate: (run: MinutoRun) => void = () => {};
    api.current.mockImplementationOnce(() => new Promise((resolve) => { answerLate = resolve; }));
    const onDay = vi.fn();
    render(<MinutoGame locale="en" onDay={onDay} />);
    fireEvent.click(await screen.findByRole("button", { name: "Previous days" }));
    fireEvent.click(screen.getByRole("button", { name: /#3/ }));
    await waitFor(() => expect(onDay).toHaveBeenLastCalledWith("2026-10-01"));
    await act(async () => { answerLate(finishedRun("2026-10-02", 21)); });
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
    // Back on 2 October the finished run is asked for again and shown as finished.
    api.current.mockResolvedValueOnce(finishedRun("2026-10-02", 21));
    fireEvent.click(screen.getByRole("button", { name: "Previous days" }));
    fireEvent.click(screen.getByRole("button", { name: /#4/ }));
    await screen.findByRole("button", { name: "See result" });
    expect(api.current).toHaveBeenLastCalledWith("2026-10-02", "en");
  });

  it("another account signing in on this screen never sees (or continues) the previous account's run", async () => {
    Object.assign(auth, { status: "authenticated", user: { id: "u1" } });
    api.boards.mockResolvedValue({ days: { "2026-10-02": 1 } });
    api.start.mockResolvedValueOnce({ run: { id: "r-u1", version: 1 }, state: { ...finishedRun("2026-10-02", 0).state, done: false, round: 0, score: 0, goal } });
    const { rerender } = render(<MinutoGame locale="en" />);
    fireEvent.click(await screen.findByRole("button", { name: "Play" }));
    await screen.findByRole("textbox");
    Object.assign(auth, { user: { id: "u2" } });
    rerender(<MinutoGame locale="en" />);
    await screen.findByRole("button", { name: "Play" });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(loadRun("2026-10-02", 1, "u2")).toBeNull();
  });

  it("a finished run fetched for the old content version never replaces the run being played on the corrected board", async () => {
    Object.assign(auth, { status: "authenticated", user: { id: "u1" } });
    api.boards.mockResolvedValueOnce({ days: { "2026-10-02": 1 } }).mockResolvedValue({ days: { "2026-10-02": 2 } });
    let answerOld: (run: MinutoRun) => void = () => {};
    api.current.mockImplementationOnce(() => new Promise((resolve) => { answerOld = resolve; }));
    api.start.mockRejectedValueOnce(new MinutoApiError("content_changed", 409));
    render(<MinutoGame locale="en" />);
    fireEvent.click(await screen.findByRole("button", { name: "Play" }));
    // The correction reloads the index (version 2) and the player starts the corrected board.
    await waitFor(() => expect(api.boards).toHaveBeenCalledTimes(2));
    api.start.mockResolvedValueOnce({ run: { id: "r2", version: 1 }, state: { ...finishedRun("2026-10-02", 0).state, round: 0, done: false, score: 0, exact: 0, goal } });
    fireEvent.click(await screen.findByRole("button", { name: "Play" }));
    await screen.findByRole("textbox");
    // Only now does the version-1 lookup answer, with a run finished on the old content.
    await act(async () => { answerOld(finishedRun("2026-10-02", 21)); });
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\b21\b/);
    // Nor is the old run cached as the corrected board's.
    expect(loadRun("2026-10-02", 2, "u1")?.state.done).toBe(false);
  });

  describe("playing a member board", () => {
    const playing = (version: number, round = 0): MinutoRun => ({ run: { id: "r9", version }, state: { ...finishedRun("2026-10-02", 0).state, round, done: false, score: 0, exact: 0, goal } });
    const settled = (version: number): MinutoRun => {
      const result = { goal: goal.id, guess: 40, answer: { base: 40, added: 0 }, diff: 0, points: 3 };
      return { run: { id: "r9", version }, state: { ...playing(version).state, settled: result, results: [result], score: 3, exact: 1 } };
    };
    const open = async () => {
      Object.assign(auth, { status: "authenticated", user: { id: "u1" } });
      api.boards.mockResolvedValue({ days: { "2026-10-02": 1 } });
      api.start.mockResolvedValueOnce(playing(1));
      render(<MinutoGame locale="en" />);
      fireEvent.click(await screen.findByRole("button", { name: "Play" }));
      await screen.findByRole("textbox");
    };
    const typeAndConfirm = (value: string) => {
      fireEvent.change(screen.getByRole("textbox"), { target: { value } });
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    };

    it("a double submit sends one guess", async () => {
      await open();
      let answer: (run: MinutoRun) => void = () => {};
      api.guess.mockImplementationOnce(() => new Promise((resolve) => { answer = resolve; }));
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "40" } });
      const form = screen.getByRole("textbox").closest("form")!;
      fireEvent.submit(form);
      fireEvent.submit(form);
      await act(async () => { answer(settled(2)); });
      expect(api.guess).toHaveBeenCalledTimes(1);
      expect(screen.getByText("It was 40'")).toBeTruthy();
    });

    it("a lost answer is looked up before any resend: a guess the server already took is not sent again", async () => {
      await open();
      api.guess.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      api.start.mockResolvedValueOnce(settled(2));
      typeAndConfirm("40");
      await screen.findByText("It was 40'", undefined, { timeout: 3000 });
      expect(api.guess).toHaveBeenCalledTimes(1);
      expect(api.start).toHaveBeenLastCalledWith("2026-10-02", 1, "en");
    });

    it("a stale run (another tab moved on) is re-read from the server instead of failing", async () => {
      await open();
      const { MinutoApiError: ApiError } = await import("@/lib/repositories/minuto.repo");
      api.guess.mockRejectedValueOnce(new ApiError("stale_state", 409));
      api.start.mockResolvedValueOnce(settled(5));
      typeAndConfirm("40");
      await screen.findByText("It was 40'");
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });
});
