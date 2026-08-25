import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LobbySettings } from "../LobbySettings";
import type { LobbyGameMode, LobbyState } from "@/lib/realtime/socket.types";

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
  }),
}));

vi.mock("@/lib/analytics/game-events", () => ({
  trackCategorySelected: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

function makeLobby(gameMode: LobbyGameMode, memberCount = 1): LobbyState {
  return {
    lobbyId: "lobby-1",
    mode: "friendly",
    status: "waiting",
    inviteCode: "AUCT10",
    displayName: "Test Lobby",
    isPublic: false,
    hostUserId: "user-1",
    settings: {
      gameMode,
      friendlyRandom: false,
      friendlyCategoryAId: null,
      friendlyCategoryBId: null,
    },
    members: Array.from({ length: memberCount }, (_, index) => ({
      userId: `user-${index + 1}`,
      username: `Player ${index + 1}`,
      avatarUrl: null,
      isReady: false,
      isHost: index === 0,
    })),
  };
}

const CATEGORIES = [
  { id: "cat-1", name: "Legends", icon: "⚽", imageUrl: null },
] as unknown as Parameters<typeof LobbySettings>[0]["categories"];

function renderSettings(lobby: LobbyState) {
  return render(
    <LobbySettings
      isHost
      lobby={lobby}
      categories={CATEGORIES}
      onUpdateSettings={vi.fn()}
    />,
  );
}

describe("LobbySettings auction mode", () => {
  it("renders auction as a selectable mode tab", () => {
    renderSettings(makeLobby("friendly_possession"));

    const auctionTab = screen.getByRole("button", { name: "friend.auction" });
    expect(auctionTab).toBeTruthy();
    expect(auctionTab.getAttribute("aria-pressed")).toBe("false");
  });

  it("marks the auction tab active and shows its description when selected", () => {
    renderSettings(makeLobby("auction"));

    expect(
      screen.getByRole("button", { name: "friend.auction" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByText("friend.auctionDescription")).toBeTruthy();
    expect(screen.getByText("friend.auctionHeader")).toBeTruthy();
  });

  it("hides category selection for auction", () => {
    renderSettings(makeLobby("auction"));

    expect(screen.queryByText("friend.categoriesTitle")).toBeNull();
    expect(screen.queryByText("friend.randomCategories")).toBeNull();
  });

  it("still shows category selection for classic", () => {
    renderSettings(makeLobby("friendly_possession"));

    expect(screen.getByText("friend.categoriesTitle")).toBeTruthy();
  });

  it("keeps the mode tabs available for a full 3-player auction lobby", () => {
    // memberCount > 2 forces party-locked mode for every other game mode; a
    // full auction lobby is at capacity, not overflowing, so the tabs stay.
    renderSettings(makeLobby("auction", 3));

    expect(screen.getByRole("button", { name: "friend.auction" })).toBeTruthy();
    expect(screen.queryByText("friend.partyLockedHint")).toBeNull();
  });

  it("still party-locks a 3-player classic lobby", () => {
    renderSettings(makeLobby("friendly_possession", 3));

    expect(screen.getByText("friend.partyLockedHint")).toBeTruthy();
  });
});
