import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sounds/gameSounds", () => ({ playSfx: vi.fn() }));

import { LocaleProvider } from "@/contexts/LocaleContext";
import { PartnerFakeFactGame } from "../PartnerFakeFactGame";
import type { FakeFactCard, FakeFactState } from "../fakeFactPartner.types";

const label = (text: string) => ({ en: text, es: text, tr: text, ru: text, ka: text });
const card = (id: string): FakeFactCard => ({
  id,
  category: "clubs",
  player: { name: label(`Player ${id}`), portrait: null },
  options: [0, 1, 2, 3, 4].map((n) => ({ label: label(`Club ${id}${n}`), art: { kind: "text" } })),
});
const base = (overrides: Partial<FakeFactState>): FakeFactState => ({
  playId: "play-1",
  step: "card1",
  serverNow: new Date().toISOString(),
  deadline: new Date(Date.now() + 30_000).toISOString(),
  graceMs: 1000,
  cardSeconds: 30,
  score: 0,
  maxScore: 140,
  card: card("a"),
  results: [],
  finished: null,
  ...overrides,
});
const settled = (id: string, pick: number, points: number) => ({
  pick, right: points > 0, points, timedOut: false, card: card(id), fake: 2, explain: label(`Explained ${id}`),
});

function setup(responses: Record<string, unknown>) {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];
  const api = {
    get: vi.fn(async (path: string) => {
      calls.push({ method: "GET", path });
      return responses[`GET ${path}`];
    }),
    post: vi.fn(async (path: string, body?: unknown) => {
      calls.push({ method: "POST", path, body });
      return responses[`POST ${path.replace(/^plays\/[^/]+\//, "")}`];
    }),
  };
  const onFinished = vi.fn();
  const onExit = vi.fn();
  render(
    <LocaleProvider initialLocale="en">
      <PartnerFakeFactGame gameId="fake-fact" api={api as never} onFinished={onFinished} onExit={onExit} />
    </LocaleProvider>,
  );
  return { calls, onFinished, onExit };
}

describe("PartnerFakeFactGame", () => {
  it("plays card 1 and the bonus from the server's state and reports the server's score", async () => {
    const { calls, onFinished } = setup({
      "GET current": { play: null },
      "POST start": base({}),
      "POST answer": base({ step: "between", card: null, score: 100, results: [settled("a", 2, 100)] }),
      "POST next": base({ step: "card2", card: card("b"), score: 100, results: [settled("a", 2, 100)] }),
    });
    fireEvent.click(await screen.findByTestId("ff-start"));
    fireEvent.click(await screen.findByText("Club a2"));
    fireEvent.click(screen.getByText("That's the fake"));
    await screen.findByText("Right! +100");
    expect(screen.getByText("Explained a")).toBeInTheDocument();
    expect(calls.find((c) => c.path.endsWith("/answer"))?.body).toEqual({ card: 0, option: 2 });

    fireEvent.click(screen.getByRole("button", { name: /Bonus card/ }));
    fireEvent.click(await screen.findByText("Club b4"));
    expect(screen.getByText("Bonus card · +40")).toBeInTheDocument();
    expect(screen.queryByText("Club a2")).not.toBeInTheDocument();
  });

  it("shows the result of an ended play and hands its score to the host", async () => {
    const ended = base({
      step: "done", card: null, deadline: null, score: 0, results: [settled("a", 0, 0)],
      finished: { playId: "play-1", score: 0, sent: true },
    });
    const { onFinished } = setup({ "GET current": { play: ended } });
    await screen.findByText("Wrong. The fake was Club a2");
    fireEvent.click(screen.getByText("See result"));
    await waitFor(() => expect(onFinished).toHaveBeenCalledWith({ playId: "play-1", score: 0 }));
  });

  it("leaves without points when a block cancelled the play", async () => {
    const cancelled = base({ step: "done", card: null, deadline: null, finished: { playId: "play-1", score: 0, sent: false } });
    const { onFinished, onExit } = setup({ "GET current": { play: cancelled } });
    fireEvent.click(await screen.findByText("See result"));
    expect(onExit).toHaveBeenCalled();
    expect(onFinished).not.toHaveBeenCalled();
  });
});

describe("PartnerFakeFactGame expiry", () => {
  it("asks again when the read at 0 fails, until the server settles the card", async () => {
    const open = base({ deadline: new Date(Date.now() + 300).toISOString() });
    const ended = base({ step: "done", card: null, deadline: null, results: [{ ...settled("a", 0, 0), pick: null, timedOut: true }], finished: { playId: "play-1", score: 0, sent: true } });
    let reads = 0;
    const api = {
      get: vi.fn(async (path: string) => {
        if (path === "current") return { play: open };
        reads += 1;
        if (reads === 1) throw new Error("network");
        return ended;
      }),
      post: vi.fn(),
    };
    render(
      <LocaleProvider initialLocale="en">
        <PartnerFakeFactGame gameId="fake-fact" api={api as never} onFinished={vi.fn()} onExit={vi.fn()} />
      </LocaleProvider>,
    );
    expect(await screen.findByText("Time's up. The fake was Club a2", undefined, { timeout: 8_000 })).toBeInTheDocument();
    expect(reads).toBe(2);
  }, 12_000);
});

describe("PartnerFakeFactGame recovery", () => {
  it("shows today's last result when a start finds no plays left (the sweeper ended it first)", async () => {
    const { PartnerApiError } = await import("../../../api/partnerApiClient");
    const last = base({ step: "done", card: null, deadline: null, score: 100, results: [settled("a", 2, 100)], finished: { playId: "play-1", score: 100, sent: true } });
    const api = {
      get: vi.fn(async () => ({ play: null, last })),
      post: vi.fn(async () => {
        throw new PartnerApiError(409, "quota_exhausted", "No plays left");
      }),
    };
    render(
      <LocaleProvider initialLocale="en">
        <PartnerFakeFactGame gameId="fake-fact" api={api as never} onFinished={vi.fn()} onExit={vi.fn()} />
      </LocaleProvider>,
    );
    fireEvent.click(await screen.findByTestId("ff-start"));
    expect(await screen.findByText("Right! +100")).toBeInTheDocument();
  });

  it("drops a slow response older than what is on screen", async () => {
    let releaseRead: (value: FakeFactState) => void = () => {};
    // The bonus window is about to close, so the screen's expiry read starts; it answers only after the bonus opened.
    const between = base({ step: "between", card: null, score: 100, results: [settled("a", 2, 100)], deadline: new Date(Date.now() + 200).toISOString() });
    const bonus = base({ step: "card2", card: card("b"), score: 100, results: [settled("a", 2, 100)] });
    const api = {
      get: vi.fn(async (path: string) => (path === "current" ? { play: between } : new Promise<FakeFactState>((r) => { releaseRead = r; }))),
      post: vi.fn(async () => bonus),
    };
    render(
      <LocaleProvider initialLocale="en">
        <PartnerFakeFactGame gameId="fake-fact" api={api as never} onFinished={vi.fn()} onExit={vi.fn()} />
      </LocaleProvider>,
    );
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2), { timeout: 4_000 });
    fireEvent.click(screen.getByRole("button", { name: /Bonus card/ }));
    expect(await screen.findByText("Club b0")).toBeInTheDocument();
    releaseRead(between);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText("Club b0")).toBeInTheDocument();
  }, 10_000);
});
