import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PartnerGameTile } from "../api/partnerApi.types";

const games = vi.hoisted(() => ({ value: { isFetchedAfterMount: true, data: { games: [] as PartnerGameTile[] } } }));
vi.mock("../hooks/usePartnerGames", () => ({ partnerGamesQueryKey: ["partner", "me", "games"], usePartnerGames: () => games.value }));
vi.mock("../PartnerSessionProvider", () => ({ usePartnerSession: () => ({ api: { game: vi.fn() } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "en" }) }));

const { PartnerGameHost } = await import("../game-kit/PartnerGameHost");

const tile = (overrides: Partial<PartnerGameTile>): PartnerGameTile => ({
  gameId: "road-to-goal", playsLimit: 1, playsUsed: 1, playsLeft: 0, maxScore: 400, available: true,
  inProgress: false, lastResult: null, ...overrides,
});
const Screen = () => <div data-testid="game-screen">game</div>;

describe("partner game host on open", () => {
  beforeEach(() => {
    games.value = { isFetchedAfterMount: true, data: { games: [] } };
  });

  it("a play that ended while away (stale Continue) opens on its result, not on the game", () => {
    games.value.data.games = [tile({ lastResult: { playId: "p1", score: 0 } })];
    render(<PartnerGameHost gameId="road-to-goal" registry={{ "road-to-goal": Screen }} />);
    expect(screen.queryByTestId("game-screen")).toBeNull();
    expect(screen.getByText(/back to games/i)).toBeTruthy();
  });

  it("a play in progress, or plays left, opens the game", () => {
    games.value.data.games = [tile({ inProgress: true, lastResult: { playId: "p0", score: 50 } })];
    const { unmount } = render(<PartnerGameHost gameId="road-to-goal" registry={{ "road-to-goal": Screen }} />);
    expect(screen.getByTestId("game-screen")).toBeTruthy();
    unmount();
    games.value.data.games = [tile({ playsLeft: 1, playsUsed: 0 })];
    render(<PartnerGameHost gameId="road-to-goal" registry={{ "road-to-goal": Screen }} />);
    expect(screen.getByTestId("game-screen")).toBeTruthy();
  });

  it("waits for a fresh games list before deciding", () => {
    games.value = { isFetchedAfterMount: false, data: { games: [tile({ lastResult: { playId: "p1", score: 0 } })] } };
    render(<PartnerGameHost gameId="road-to-goal" registry={{ "road-to-goal": Screen }} />);
    expect(screen.queryByTestId("game-screen")).toBeNull();
    expect(screen.queryByText(/back to games/i)).toBeNull();
  });
});
