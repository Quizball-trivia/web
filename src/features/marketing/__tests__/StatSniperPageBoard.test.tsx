import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublicStatSniperBoard } from "@/lib/repositories/statSniperPublicBoard";

let authStatus = "anonymous";
vi.mock("next/navigation", () => ({ usePathname: () => "/es/juegos-de-futbol/aproximado-futbolero" }));
vi.mock("@/stores/auth.store", () => ({ useAuthStore: (selector: (s: { status: string }) => unknown) => selector({ status: authStatus }) }));
vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn() }));
vi.mock("@/features/daily/StatSniperLeaderboard", () => ({
  StatSniperLeaderboard: ({ fetcher }: { fetcher?: unknown }) => <div data-testid="board" data-fetcher={fetcher === fetchPublicStatSniperBoard ? "public" : fetcher ? "other" : "member"} />,
}));

describe("Aproximado page leaderboard", () => {
  afterEach(() => { authStatus = "anonymous"; vi.unstubAllGlobals(); });

  it("visitors see the public board and the way onto it", async () => {
    const { StatSniperPageBoard } = await import("../public/StatSniperPageBoard");
    render(<StatSniperPageBoard locale="es" modeId="statSniper" playPath="/daily/challenges/stat-sniper" />);
    expect(screen.getByTestId("board")).toHaveAttribute("data-fetcher", "public");
    expect(screen.getByRole("link", { name: "Crear cuenta" })).toHaveAttribute("href", "/play?signin=1");
  });

  it("members see their own board (with their rank) and no sign-up", async () => {
    authStatus = "authenticated";
    const { StatSniperPageBoard } = await import("../public/StatSniperPageBoard");
    render(<StatSniperPageBoard locale="es" modeId="statSniper" playPath="/daily/challenges/stat-sniper" />);
    expect(screen.getByTestId("board")).toHaveAttribute("data-fetcher", "member");
    expect(screen.queryByRole("link", { name: "Crear cuenta" })).toBeNull();
  });

  it("reads the public board without credentials and maps it to the board rows", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      challengeDay: "2026-10-06",
      entries: [{ rank: 1, alias: "KAKA007", score: 91, country: "GE", avatarCustomization: { base: "a" } }],
      me: null,
    })));
    vi.stubGlobal("fetch", fetchMock);
    const board = await fetchPublicStatSniperBoard();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/guest\/daily-challenges\/stat-sniper\/leaderboard$/);
    expect(init.headers).toBeUndefined();
    expect(board).toEqual({
      challengeDay: "2026-10-06",
      entries: [{ userId: "public-1", rank: 1, username: "KAKA007", score: 91, country: "GE", avatarCustomization: { base: "a" } }],
      me: null,
    });
  });
});
