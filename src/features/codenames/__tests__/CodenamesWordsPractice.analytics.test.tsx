import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const events: string[] = [];
vi.mock("@/lib/analytics/public-games.analytics", () => ({
  trackGameStart: (p: { sessionId: string }) => events.push(`start:${p.sessionId}`),
  trackGameReplay: (p: { previousSessionId: string }) => events.push(`replay:${p.previousSessionId}`),
  trackGameComplete: (p: { sessionId: string }) => events.push(`complete:${p.sessionId}`),
}));
let n = 0;
vi.mock("@/lib/realtime/command-id", () => ({ createRealtimeCommandId: () => `s${++n}` }));

// INVENTED words (public repo).
const board = () => ({
  lang: "en",
  cards: Array.from({ length: 25 }, (_, i) => ({ id: `w-${i}`, word: `WORD${i}`, kind: i < 9 ? "mine" : i < 17 ? "theirs" : i < 24 ? "neutral" : "owngoal", football: "f", other: "o" })),
  clues: [{ word: "Alpha", count: 9, cards: Array.from({ length: 9 }, (_, i) => ({ id: `w-${i}`, why: "f · o" })) }],
});
const load = vi.fn();
vi.mock("../codenames.practice", async (orig) => ({ ...(await orig<typeof import("../codenames.practice")>()), loadPractice: (...a: unknown[]) => load(...a) }));

import { CodenamesWordsPractice } from "../CodenamesWordsPractice";

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe("Words practice analytics", () => {
  beforeEach(() => { events.length = 0; n = 0; load.mockReset(); });

  it("one session per board: start, then replay + start for a new board", async () => {
    load.mockResolvedValue(board());
    render(<CodenamesWordsPractice locale="en" onExit={() => {}} />);
    await flush();
    expect(events).toEqual(["start:s1"]);
    // Flip the Own Goal (card 24) to end the run: pick, then flip.
    const og = document.querySelector('[data-card="w-24"]') as HTMLElement;
    fireEvent.click(og); fireEvent.click(og);
    await flush();
    expect(events).toEqual(["start:s1", "complete:s1"]);
    fireEvent.click(screen.getByText(/see result/i));
    fireEvent.click(screen.getByText(/new board/i));
    await flush();
    expect(events).toEqual(["start:s1", "complete:s1", "replay:s1", "start:s2"]);
  });

  it("a retry after a failed first load is not a replay", async () => {
    load.mockRejectedValueOnce(Object.assign(new Error("x"), { status: 500 })).mockResolvedValue(board());
    render(<CodenamesWordsPractice locale="en" onExit={() => {}} />);
    await flush();
    expect(events).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    await flush();
    expect(events).toEqual(["start:s1"]);
  });

  it("an answer that arrives after the screen closed starts nothing", async () => {
    let resolve: (v: unknown) => void = () => {};
    load.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { unmount } = render(<CodenamesWordsPractice locale="en" onExit={() => {}} />);
    unmount();
    resolve(board());
    await flush();
    expect(events).toEqual([]);
  });
});
