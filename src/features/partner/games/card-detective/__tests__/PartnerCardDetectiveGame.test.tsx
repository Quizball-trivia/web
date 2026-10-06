import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The partner game must never ship the bundled FIFA card dataset (names + stats = every answer).
vi.mock("@/features/mini-games/data/guessFifaCard", () => {
  throw new Error("the FIFA card dataset was imported by the partner Card Detective");
});
vi.mock("@/lib/sounds/gameSounds", () => ({ playSfx: vi.fn() }));
// Reduced motion: the deal reel hands over after 400 ms instead of waiting on an animation jsdom never runs.
vi.mock("motion/react", async (importOriginal) => ({ ...(await importOriginal<object>()), useReducedMotion: () => true }));

import { LocaleProvider } from "@/contexts/LocaleContext";
import { PartnerCardDetectiveGame } from "../PartnerCardDetectiveGame";
import { PartnerApiError } from "../../../api/partnerApiClient";
import type { CdPlayState } from "../cardDetectivePartner.types";

const COSTS = { rating: 25, club: 20, league: 15, nation: 10, position: 10, pac: 5, sho: 5, pas: 5, dri: 5, def: 5, phy: 5 };
const state = (overrides: Partial<CdPlayState> = {}): CdPlayState => ({
  playId: "play-1",
  version: 0,
  state: "active",
  cardCount: 10,
  index: 0,
  score: 0,
  startPoints: 100,
  clueCosts: COSTS,
  wrongGuessCost: 15,
  current: { ref: "a1b2c3d4e5f60718", points: 100, wrongGuesses: 0, open: ["position", "pac", "sho"], clues: { position: "ST", pac: 91, sho: 88 } },
  resolved: [],
  finished: null,
  ...overrides,
});

function setup(responses: Record<string, unknown>, onExit = vi.fn()) {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];
  const api = {
    get: vi.fn(async (path: string) => {
      calls.push({ method: "GET", path });
      const reply = responses[`GET ${path}`];
      if (reply instanceof Error) throw reply;
      return reply;
    }),
    post: vi.fn(async (path: string, body?: unknown) => {
      calls.push({ method: "POST", path, body });
      const reply = responses[`POST ${path.replace(/^plays\/[^/]+\//, "")}`];
      if (reply instanceof Error) throw reply;
      return reply;
    }),
  };
  const onFinished = vi.fn();
  render(
    <LocaleProvider>
      <PartnerCardDetectiveGame gameId="card-detective" api={api as never} onFinished={onFinished} onExit={onExit} />
    </LocaleProvider>,
  );
  return { api, calls, onFinished };
}

describe("PartnerCardDetectiveGame", () => {
  it("plays from the server's state: starts, buys clues and sends guesses with the card ref and version", async () => {
    const { calls } = setup({
      "GET current": { play: null },
      "POST start": state(),
      "POST reveal": state({ version: 1, current: { ...state().current!, points: 75, open: ["position", "pac", "sho", "rating"], clues: { ...state().current!.clues, rating: 90 } } }),
      "POST guess": { correct: false, state: state({ version: 2, current: { ...state().current!, points: 60 } }) },
    });
    fireEvent.click(await screen.findByTestId("cd-start"));
    // The deal animation hands over to the board.
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
    await waitFor(() => expect(screen.getByTestId("cd-card-points").textContent).toContain("100"));
    fireEvent.click(screen.getByRole("button", { name: /OVR/ }));
    await waitFor(() => expect(screen.getByTestId("cd-card-points").textContent).toContain("75"));
    fireEvent.change(screen.getByTestId("cd-guess-input"), { target: { value: "Someone" } });
    fireEvent.submit(screen.getByTestId("cd-guess-input").closest("form")!);
    await waitFor(() => expect(screen.getByTestId("cd-card-points").textContent).toContain("60"));
    expect(calls.filter((c) => c.method === "POST").map((c) => [c.path, c.body])).toEqual([
      ["start", { clientNonce: expect.any(String) }],
      ["plays/play-1/reveal", { ref: "a1b2c3d4e5f60718", version: 0, clue: "rating" }],
      ["plays/play-1/guess", { ref: "a1b2c3d4e5f60718", version: 1, name: "Someone" }],
    ]);
  }, 15_000);

  it("reports the server's score when the last card resolves", async () => {
    const card = { name: "Revealed Name", editionLabel: "FC 24", overall: 90, position: "ST", nation: "Testland", nationCode: "tl", league: "L", club: "C", stats: { pac: 1, sho: 2, pas: 3, dri: 4, def: 5, phy: 6 }, faceUrl: null };
    const { onFinished } = setup({
      "GET current": { play: state({ index: 9 }) },
      "POST skip": state({ state: "finished", index: 10, current: null, score: 120, resolved: [{ ref: "a1b2c3d4e5f60718", solved: false, points: 0, card }], finished: { playId: "play-1", score: 120, sent: true } }),
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
    fireEvent.click(await screen.findByTestId("cd-give-up"));
    expect((await screen.findAllByText(/Revealed Name/)).length).toBeGreaterThan(0);
    await waitFor(() => expect(onFinished).toHaveBeenCalledWith({ playId: "play-1", score: 120 }), { timeout: 4000 });
  }, 15_000);

  it("recovers a lost or refused final action through the play itself and reports its result", async () => {
    const finished = state({ state: "finished", index: 10, current: null, score: 75, finished: { playId: "play-1", score: 75, sent: true } });
    const { calls, onFinished } = setup({
      "GET current": { play: state({ index: 9 }) },
      "POST skip": new PartnerApiError(409, "stale_version", "stale"),
      "GET plays/play-1": finished,
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
    fireEvent.click(await screen.findByTestId("cd-give-up"));
    await waitFor(() => expect(onFinished).toHaveBeenCalledWith({ playId: "play-1", score: 75 }));
    expect(calls.map((c) => `${c.method} ${c.path}`)).toContain("GET plays/play-1");
  }, 15_000);

  it("leaves for the partner home when the play was cancelled by a block", async () => {
    const onExit = vi.fn();
    const { onFinished } = setup({
      "GET current": { play: state() },
      "POST skip": new PartnerApiError(409, "play_not_active", "gone"),
      "GET plays/play-1": state({ state: "finished", current: null, finished: { playId: "play-1", score: 0, sent: false } }),
    }, onExit);
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
    fireEvent.click(await screen.findByTestId("cd-give-up"));
    await waitFor(() => expect(onExit).toHaveBeenCalled());
    expect(onFinished).not.toHaveBeenCalled();
  }, 15_000);
});
