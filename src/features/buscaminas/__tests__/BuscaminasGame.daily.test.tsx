import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/es/juegos-de-futbol/buscaminas-futbolero", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/image", () => ({ default: (props: { alt: string }) => <span data-img={props.alt} /> }));
vi.mock("@/lib/sounds/gameSounds", () => ({ playSfx: vi.fn() }));
vi.mock("../buscaminas.analytics", async (importOriginal) => {
  const real = await importOriginal<typeof import("../buscaminas.analytics")>();
  const spies = Object.fromEntries(Object.keys(real).filter((k) => k.startsWith("track")).map((k) => [k, vi.fn()]));
  return { ...real, ...spies };
});
const api = vi.hoisted(() => ({ start: vi.fn(), tap: vi.fn(), bank: vi.fn(), next: vi.fn(), leaderboard: vi.fn() }));
vi.mock("@/lib/repositories/buscaminas.repo", async (importOriginal) => ({ ...(await importOriginal<object>()), buscaminasApi: api }));

import { BuscaminasGame } from "../BuscaminasGame";
import * as analytics from "../buscaminas.analytics";
import { useAuthStore } from "@/stores/auth.store";

const board = (day: string) => ({
  day, number: 3, contentVersion: 7,
  rounds: Array.from({ length: 20 }, (_, r) => ({
    id: `${day}-${r + 1}`, difficulty: "easy", prompt: { es: `Consigna ${r + 1}`, en: `Prompt ${r + 1}` },
    cards: Array.from({ length: 16 }, (_, i) => ({ id: `r${r}c${i}`, name: `Jugador ${r}-${i}`, img: `/buscaminas/v1/p/${i}.webp` })),
  })),
});
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const result = (points: number) => ({ outcome: points === 15 ? "perfect" : "banked", found: points === 15 ? 12 : points, points });
const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  Object.values(api).forEach((fn) => fn.mockReset());
  useAuthStore.setState({ status: "anonymous", user: null } as never);
  fetchMock.mockImplementation(async (url: string) => (url.endsWith("/boards") ? json({ days: {} }) : json(board(url.split("/").pop()!.split("?")[0]))));
  vi.stubGlobal("fetch", fetchMock);
  api.leaderboard.mockResolvedValue({ day: "d", players: 0, top: [], me: null });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Buscaminas daily run and extended challenge", () => {
  it("ends on the result after 5 rounds, then offers the extended rounds as an opt-in", async () => {
    const four = [15, 3, 15, 3].map(result);
    // Round 5 is settled (banked 4): the next move ends the daily run.
    api.start.mockResolvedValue({
      run: { id: "run-1", version: 20 },
      state: { day: "d", round: 4, picked: ["r4c0"], found: 4, mine: null, settled: { ...result(4), reveal: null }, results: four, done: false, score: 40, dailyRounds: 5, dailyDone: false, dailyScore: 40, ranked: false },
    });
    api.next.mockResolvedValue({
      run: { id: "run-1", version: 21 },
      state: { day: "d", round: 5, picked: [], found: 0, mine: null, settled: null, results: [...four, result(4)], done: false, score: 40, dailyRounds: 5, dailyDone: true, dailyScore: 40, ranked: false },
    });
    render(<BuscaminasGame locale="en" />);
    fireEvent.click(await screen.findByRole("button", { name: "Play" }));
    expect(await screen.findByText("Round 5 / 5")).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "See result" })); });

    expect(await screen.findByText("40")).toBeInTheDocument();
    expect(screen.getByText(/of 75/)).toBeInTheDocument();
    expect(screen.getByText(/Extended challenge: 15 more rounds/)).toBeInTheDocument();
    expect(analytics.trackRunComplete).toHaveBeenCalledWith(expect.objectContaining({ phase: "daily", score: 40 }));

    fireEvent.click(screen.getByRole("button", { name: "Play the extended challenge" }));
    expect(await screen.findByText("Extended challenge · Round 6 / 20")).toBeInTheDocument();
  });

  it("reopens a run that is in its extended rounds on the daily result, with a resume button", async () => {
    const five = [15, 3, 15, 3, 4].map(result);
    useAuthStore.setState({ status: "authenticated", user: { id: "user-a" } } as never);
    localStorage.setItem("qb.buscaminas.v3.2026-09-28.user-a", JSON.stringify({
      schema: 3, contentVersion: 7,
      run: { run: { id: "run-1", version: 30 }, state: { day: "2026-09-28", round: 7, picked: [], found: 0, mine: null, settled: null, results: [...five, result(15), result(15)], done: false, score: 70, dailyRounds: 5, dailyDone: true, dailyScore: 40, ranked: false } },
    }));
    render(<BuscaminasGame locale="en" initialDay="2026-09-28" />);
    expect(await screen.findByRole("button", { name: "Continue extended challenge · round 8" })).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });
});
