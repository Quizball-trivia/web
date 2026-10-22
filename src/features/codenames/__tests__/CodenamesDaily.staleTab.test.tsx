import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth.store";
import { DailyGameApiError, type WordRun } from "@/features/wordgames/daily/wordDaily.api";
import { addDays } from "@/features/wordgames/daily/wordDaily.logic";
import { CODENAMES_CALENDAR, type CodenamesDailyState } from "../codenames.daily";

/**
 * The same daily open in another tab of the same player moves the server's run on; this tab still shows the older copy.
 * An invented board (no real content): cards c0–c7 ours, c8–c14 rival, c15–c18 neutral, c19 the Own Goal.
 */
/** A closed day of the real calendar (board #1), played three days later. */
const DAY = CODENAMES_CALENDAR.contentStart;
const KEY = [...Array(8).fill("mine"), ...Array(7).fill("theirs"), ...Array(4).fill("neutral"), "owngoal"] as const;
type Kind = (typeof KEY)[number];
const label = (t: string) => ({ en: t, es: t, tr: t, ru: t, ka: t });

const server = vi.hoisted(() => ({
  s: { version: 1, clue: 0, guessesLeft: 4, flips: [] as Array<{ card: number; kind: string; clue: number }>, done: false, end: null as string | null },
  /** The next answer is judged and saved, but its reply never arrives. */
  dropReply: false,
  offline: false,
  /** A stale refusal arrives, and the connection drops right after it (the re-sync cannot read). */
  offlineAfterStale: false,
}));

function view(): WordRun<CodenamesDailyState> {
  const s = server.s;
  const found = s.flips.filter((f) => f.kind === "mine").length;
  return {
    run: { id: "run-1", version: s.version },
    state: {
      day: DAY, open: false, deadline: null, serverNow: new Date().toISOString(), done: s.done, score: found * 100, ranked: false,
      cards: KEY.map((k, i) => ({ id: `c${i}`, kind: s.done || s.flips.some((f) => f.card === i) ? k : null })),
      clues: [0, 1, 2].slice(0, s.clue + 1).map((i) => ({ word: label(`Test clue ${i + 1}`), count: 3 })),
      totalClues: 3, clue: s.clue, guessesLeft: s.guessesLeft,
      flips: s.flips.map((f) => ({ ...f, kind: f.kind as Kind })),
      end: s.end as CodenamesDailyState["end"], found, total: 8, misses: s.flips.length - found,
    },
  };
}
const nextClue = () => {
  server.s.guessesLeft = 4;
  if (server.s.clue === 2) { server.s.done = true; server.s.end = "clues"; } else server.s.clue += 1;
};
/** One move on the server, as the backend judges it (the other tab calls this directly). */
function move(card: number | "stop") {
  const s = server.s;
  s.version += 1;
  if (card === "stop") return nextClue();
  const kind = KEY[card];
  s.flips.push({ card, kind, clue: s.clue });
  if (kind === "owngoal") { s.done = true; s.end = "owngoal"; return; }
  if (kind !== "mine") return nextClue();
  s.guessesLeft -= 1;
  if (s.guessesLeft === 0) nextClue();
}

const api = vi.hoisted(() => ({
  boards: vi.fn(), current: vi.fn(), start: vi.fn(), answer: vi.fn(), leaderboard: vi.fn(), next: vi.fn(), pass: vi.fn(),
}));
vi.mock("../codenames.daily", async (original) => ({ ...(await original<typeof import("../codenames.daily")>()), codenamesDailyApi: api }));
vi.mock("@/lib/sounds/gameSounds", () => ({ playSfx: vi.fn(), preloadSfx: vi.fn() }));

const offline = () => new TypeError("Failed to fetch");
const card = (id: string) => document.querySelector(`[data-card="${id}"]`) as HTMLButtonElement;
const revealed = (id: string) => card(id).getAttribute("data-revealed");
const notice = () => document.querySelector("[data-codenames-notice]")?.textContent ?? "";
const flipsOf = (i: number) => server.s.flips.filter((f) => f.card === i).length;

async function openBoard() {
  const { CodenamesDaily } = await import("../CodenamesDaily");
  const utils = render(<CodenamesDaily locale="en" initialDay={DAY} />);
  fireEvent.click(await screen.findByRole("button", { name: /^play/i }));
  await waitFor(() => expect(card("c0")).toBeTruthy());
  return utils;
}
/** Select, then confirm (the two taps of a guess), and wait until the call and any re-sync are over. */
async function confirm(id: string) {
  const before = api.answer.mock.calls.length;
  fireEvent.click(card(id));
  fireEvent.click(card(id));
  await waitFor(() => expect(api.answer.mock.calls.length).toBeGreaterThan(before));
  await waitFor(() => expect(document.querySelector("[data-codenames-end]") || !card("c17").disabled).toBeTruthy(), { timeout: 3000 });
}

describe("Football Codenames daily: a guess from a tab another tab moved on", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(`${addDays(DAY, 3)}T15:00:00Z`));
    useAuthStore.setState({ status: "authenticated", user: { id: "member-1" } as never });
    server.s = { version: 1, clue: 0, guessesLeft: 4, flips: [], done: false, end: null };
    server.dropReply = false;
    server.offline = false;
    server.offlineAfterStale = false;
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
    api.boards.mockResolvedValue({ days: { [DAY]: 1 } });
    api.current.mockResolvedValue({ run: null });
    api.leaderboard.mockResolvedValue({ day: DAY, players: 0, top: [], me: null });
    api.start.mockImplementation(async () => { if (server.offline) throw offline(); return view(); });
    api.answer.mockImplementation(async (run: WordRun<CodenamesDailyState>, value: string, _l: string, extra?: { move?: string }) => {
      if (server.offline) throw offline();
      if (run.run.version !== server.s.version || run.run.id !== "run-1") {
        if (server.offlineAfterStale) server.offline = true;
        throw new DailyGameApiError("stale_state", 409);
      }
      move(extra?.move === "stop" ? "stop" : Number(value));
      if (server.dropReply) { server.dropReply = false; throw offline(); }
      return { ...view(), result: extra?.move === "stop" ? "stop" : "flip" };
    });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  it("same clue: the pick stays selected, unplayed, and the player is asked to confirm it again", async () => {
    await openBoard();
    move(0);
    await confirm("c1");
    await waitFor(() => expect(revealed("c0")).toBe("mine"));
    expect(revealed("c1")).toBeNull();
    expect(card("c1").getAttribute("aria-pressed")).toBe("true");
    expect(notice()).toMatch(/tap it again to confirm/i);
    expect(flipsOf(1)).toBe(0);

    fireEvent.click(card("c1"));
    await waitFor(() => expect(revealed("c1")).toBe("mine"));
    expect(flipsOf(1)).toBe(1);
    expect(notice()).toBe("");
  });

  it("clue changed: the old pick is dropped with a notice, never played on the new clue", async () => {
    await openBoard();
    move(0);
    move("stop");
    await confirm("c1");
    await waitFor(() => expect(notice()).toMatch(/clue changed in another tab/i));
    expect(revealed("c1")).toBeNull();
    expect(card("c1").getAttribute("aria-pressed")).toBe("false");
    expect(flipsOf(1)).toBe(0);
    expect(api.answer).toHaveBeenCalledTimes(1);
  });

  it("the same card: shown as turned, with a notice; nothing is played twice", async () => {
    await openBoard();
    move(1);
    await confirm("c1");
    await waitFor(() => expect(revealed("c1")).toBe("mine"));
    expect(notice()).toMatch(/already turned in another tab/i);
    expect(flipsOf(1)).toBe(1);
  });

  it("the run finished in another tab: the end is shown with a notice, the pick is not played", async () => {
    await openBoard();
    move(19);
    await confirm("c1");
    await waitFor(() => expect(document.querySelector("[data-codenames-end]")).toBeTruthy());
    expect(notice()).toMatch(/finished in another tab/i);
    expect(server.s.flips.map((f) => f.card)).toEqual([19]);
  });

  it("a guess that landed but lost its reply is shown once, never sent again, with no stale notice", async () => {
    await openBoard();
    server.dropReply = true;
    await confirm("c1");
    await waitFor(() => expect(revealed("c1")).toBe("mine"));
    expect(flipsOf(1)).toBe(1);
    expect(api.answer).toHaveBeenCalledTimes(1);
    expect(notice()).toBe("");
  });

  it("a late recovery never replaces a card the player picked since", async () => {
    await openBoard();
    move(0);
    server.offlineAfterStale = true;
    fireEvent.click(card("c1"));
    fireEvent.click(card("c1"));
    await waitFor(() => expect(notice()).toMatch(/connection/i), { timeout: 5000 });
    await waitFor(() => expect(card("c2").disabled).toBe(false), { timeout: 5000 });
    fireEvent.click(card("c2"));
    expect(card("c2").getAttribute("aria-pressed")).toBe("true");
    server.offline = false;
    await act(async () => { window.dispatchEvent(new Event("online")); await new Promise((r) => setTimeout(r, 400)); });
    await waitFor(() => expect(revealed("c0")).toBe("mine"));
    expect(card("c2").getAttribute("aria-pressed")).toBe("true");
    expect(card("c1").getAttribute("aria-pressed")).toBe("false");
    expect(server.s.flips.map((f) => f.card)).toEqual([0]);
  });

  it("a guess lost while offline is not sent for another player who signs in meanwhile", async () => {
    await openBoard();
    server.offline = true;
    fireEvent.click(card("c1"));
    fireEvent.click(card("c1"));
    await waitFor(() => expect(notice()).toMatch(/connection/i), { timeout: 5000 });
    const sent = api.answer.mock.calls.length;
    useAuthStore.setState({ status: "authenticated", user: { id: "member-2" } as never });
    server.offline = false;
    await act(async () => { window.dispatchEvent(new Event("online")); await new Promise((r) => setTimeout(r, 400)); });
    expect(api.answer).toHaveBeenCalledTimes(sent);
    expect(server.s.flips).toEqual([]);
  });
});
