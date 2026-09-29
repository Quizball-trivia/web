import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

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
const runState = (version: number, picked: string[]) => ({
  run: { id: "run-1", version },
  state: { day: "d", round: 0, picked, found: picked.length, mine: null, settled: null, results: [], done: false, score: 0, ranked: false },
});
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const offline = () => new TypeError("Load failed");
const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  Object.values(api).forEach((fn) => fn.mockReset());
  useAuthStore.setState({ status: "anonymous", user: null } as never);
  fetchMock.mockImplementation(async (url: string) => (url.endsWith("/boards") ? json({ days: {} }) : json(board(url.split("/").pop()!.split("?")[0]))));
  vi.stubGlobal("fetch", fetchMock);
  api.start.mockResolvedValue(runState(0, []));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openBoardAndTap() {
  render(<BuscaminasGame locale="es" />);
  fireEvent.click(await screen.findByRole("button", { name: "Jugar" }));
  const card = await screen.findByRole("button", { name: /Jugador 0-0/ });
  await act(async () => { fireEvent.click(card); });
  return card;
}
const connectionLost = () => screen.queryByText("Se cortó la conexión. Probá de nuevo.");

describe("Buscaminas when a move gets no answer from the server", () => {
  it("shows the move when the server had already applied it (answer lost on the way back)", async () => {
    api.tap.mockRejectedValueOnce(offline());
    api.start.mockResolvedValueOnce(runState(0, [])).mockResolvedValueOnce(runState(1, ["r0c0"]));
    const card = await openBoardAndTap();
    await waitFor(() => expect(card).toHaveAttribute("aria-pressed", "true"), { timeout: 4000 });
    expect(connectionLost()).toBeNull();
    expect(api.tap).toHaveBeenCalledTimes(1);
  });

  it("sends the move again when the server never saw it", async () => {
    api.tap.mockRejectedValueOnce(offline()).mockResolvedValueOnce({ ...runState(1, ["r0c0"]), ok: true });
    const card = await openBoardAndTap();
    await waitFor(() => expect(card).toHaveAttribute("aria-pressed", "true"), { timeout: 4000 });
    expect(connectionLost()).toBeNull();
    expect(api.tap).toHaveBeenCalledTimes(2);
    expect(api.tap.mock.calls[1][0]).toMatchObject({ run: { id: "run-1", version: 0 } });
  });

  it("still says the connection is lost when recovery fails too", async () => {
    api.tap.mockRejectedValue(offline());
    api.start.mockResolvedValueOnce(runState(0, [])).mockRejectedValue(offline());
    await openBoardAndTap();
    await waitFor(() => expect(connectionLost()).not.toBeNull(), { timeout: 4000 });
  });

  it("records the browser's error name and message", async () => {
    api.tap.mockRejectedValue(offline());
    api.start.mockResolvedValueOnce(runState(0, [])).mockRejectedValue(offline());
    await openBoardAndTap();
    await waitFor(() => expect(analytics.trackActionError).toHaveBeenCalledWith(expect.objectContaining({ action: "tap", errorName: "TypeError", errorMessage: "Load failed" })), { timeout: 4000 });
  });
});

describe("Buscaminas when the server refuses a move", () => {
  it("never resends or re-syncs: the refusal is handled as before", async () => {
    const { BuscaminasApiError } = await vi.importActual<typeof import("@/lib/repositories/buscaminas.repo")>("@/lib/repositories/buscaminas.repo");
    api.tap.mockRejectedValue(new BuscaminasApiError("day_over", 409));
    await openBoardAndTap();
    await waitFor(() => expect(analytics.trackActionError).toHaveBeenCalledWith(expect.objectContaining({ status: 409, code: "day_over" })));
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(api.tap).toHaveBeenCalledTimes(1);
    expect(api.start).toHaveBeenCalledTimes(1);
    expect(analytics.trackActionRecovered).not.toHaveBeenCalled();
  });
});

describe("Buscaminas when the board download gets no answer", () => {
  it("retries once on its own before showing an error", async () => {
    let boardCalls = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/boards")) return json({ days: {} });
      boardCalls += 1;
      if (boardCalls === 1) throw offline();
      return json(board(url.split("/").pop()!.split("?")[0]));
    });
    render(<BuscaminasGame locale="es" />);
    expect(await screen.findByRole("button", { name: "Jugar" }, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar el tablero. Probá de nuevo en un rato.")).toBeNull();
  });
});
