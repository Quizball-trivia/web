import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DuelGameId, LobbyGameMode, LobbyState } from "@/lib/realtime/socket.types";

vi.mock("@/lib/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/config")>()),
  DUEL_GAMES_ENABLED: ["buscaminas", "pistas"],
}));
vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/analytics/game-events", () => ({ trackCategorySelected: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));

const { LobbySettings } = await import("../LobbySettings");

function makeLobby(gameMode: LobbyGameMode, duelGame: DuelGameId | null, members: Array<{ guest?: boolean }> = [{}]): LobbyState {
  return {
    lobbyId: "lobby-1",
    mode: "friendly",
    status: "waiting",
    inviteCode: "DUEL01",
    displayName: "Room",
    isPublic: false,
    hostUserId: "user-1",
    settings: { gameMode, duelGame, friendlyRandom: true, friendlyCategoryAId: null, friendlyCategoryBId: null },
    members: members.map((member, index) => ({
      userId: `user-${index + 1}`,
      username: `Player ${index + 1}`,
      avatarUrl: null,
      isReady: false,
      isHost: index === 0,
      isGuest: member.guest === true,
    })),
  };
}

function renderSettings(lobby: LobbyState, onUpdateSettings = vi.fn()) {
  render(<LobbySettings isHost lobby={lobby} categories={[]} onUpdateSettings={onUpdateSettings} />);
  return onUpdateSettings;
}

describe("LobbySettings duel rooms", () => {
  it("shows the room's game as its duel label and marks that game's tab", () => {
    renderSettings(makeLobby("duel", "buscaminas", [{}, {}]));

    expect(screen.getByText("friend.duelBuscaminas")).toBeTruthy();
    expect(screen.getByText("friend.duelDescription")).toBeTruthy();
    expect(screen.getByRole("button", { name: "friend.duelTabBuscaminas" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "friend.duelTabPistas" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByText("friend.categoriesTitle")).toBeNull();
  });

  it("labels a Pistas duel as such", () => {
    renderSettings(makeLobby("duel", "pistas"));
    expect(screen.getByText("friend.duelPistas")).toBeTruthy();
  });

  it("the host can switch a room into a duel game (and between duel games)", async () => {
    const onUpdate = renderSettings(makeLobby("friendly_possession", null, [{}, {}]));
    // Let the mount-time settings reset run first, as it does before any real tap.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    fireEvent.click(screen.getByRole("button", { name: "friend.duelTabPistas" }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ gameMode: "duel", duelGame: "pistas" }));
    expect(screen.getByText("friend.duelPistas")).toBeTruthy();
  });

  it("duel tabs are open to guest rooms and closed past two players", () => {
    renderSettings(makeLobby("football_grid", null, [{}, { guest: true }]));
    expect(screen.getByRole("button", { name: "friend.duelTabBuscaminas" }).getAttribute("data-guest-locked")).toBeNull();
    expect(screen.getByRole("button", { name: /friend.classic/ }).getAttribute("data-guest-locked")).toBe("true");
  });

  it("a three-player room cannot pick a duel", () => {
    renderSettings(makeLobby("friendly_party_quiz", null, [{}, {}, {}]));
    expect((screen.getByRole("button", { name: "friend.duelTabBuscaminas" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
