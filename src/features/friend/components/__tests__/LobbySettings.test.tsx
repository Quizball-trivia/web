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
    // Only >3 members forces the party-locked view; a full 3-seat auction
    // lobby is at capacity, not overflowing, so the tabs stay.
    renderSettings(makeLobby("auction", 3));

    expect(screen.getByRole("button", { name: "friend.auction" })).toBeTruthy();
    expect(screen.queryByText("friend.partyLockedHint")).toBeNull();
  });

  it("keeps tabs for a 3-player lobby but disables modes that seat only two", () => {
    renderSettings(makeLobby("friendly_party_quiz", 3));

    expect(screen.queryByText("friend.partyLockedHint")).toBeNull();
    const auctionTab = screen.getByRole("button", { name: "friend.auction" });
    expect((auctionTab as HTMLButtonElement).disabled).toBe(false);
    const classicTab = screen.getByRole("button", { name: "friend.classic" });
    expect((classicTab as HTMLButtonElement).disabled).toBe(true);
  });

  it("party-locks a lobby only past auction capacity (4+ members)", () => {
    renderSettings(makeLobby("friendly_party_quiz", 4));

    expect(screen.getByText("friend.partyLockedHint")).toBeTruthy();
  });
});

describe("LobbySettings Football Grid mode", () => {
  it("renders Football Grid as a selectable mode tab", () => {
    renderSettings(makeLobby("friendly_possession"));

    expect(screen.getByRole("button", { name: "friend.footballGrid" })).toBeTruthy();
  });

  it("shows the Grid rules and never renders quiz category controls", () => {
    renderSettings(makeLobby("football_grid", 2));

    expect(screen.getByText("friend.footballGridDescription")).toBeTruthy();
    expect(screen.getByText("friend.footballGridDescriptionLong")).toBeTruthy();
    expect(screen.queryByText("friend.categoriesTitle")).toBeNull();
    expect(screen.queryByText("friend.randomCategories")).toBeNull();
  });

  it("disables the Grid tab once a lobby outgrows its two seats", () => {
    renderSettings(makeLobby("friendly_party_quiz", 3));

    const gridTab = screen.getByRole("button", { name: "friend.footballGrid" });
    expect((gridTab as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("LobbySettings optional second-half category", () => {
  const MULTI_CATEGORIES = [
    { id: "cat-1", name: "Legends", icon: "⚽", imageUrl: null },
    { id: "cat-2", name: "Transfers", icon: "🔁", imageUrl: null },
    { id: "cat-3", name: "World Cup", icon: "🏆", imageUrl: null },
  ] as unknown as Parameters<typeof LobbySettings>[0]["categories"];

  function renderPicker(lobby: LobbyState, onUpdateSettings = vi.fn()) {
    render(
      <LobbySettings
        isHost
        lobby={lobby}
        categories={MULTI_CATEGORIES}
        onUpdateSettings={onUpdateSettings}
      />,
    );
    return onUpdateSettings;
  }

  function categoryButton(name: string) {
    return screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes(name)) as HTMLElement;
  }

  it("labels the first pick as 1st half and the second as 2nd half", async () => {
    const lobby = makeLobby("friendly_possession");
    lobby.settings.friendlyCategoryAId = "cat-1";
    lobby.settings.friendlyCategoryBId = "cat-2";
    renderPicker(lobby);

    expect(await screen.findByText("friend.firstHalfBadge")).toBeTruthy();
    expect(screen.getByText("friend.secondHalfBadge")).toBeTruthy();
    // Only two slots exist, so the third card carries no badge.
    expect(screen.queryAllByText("friend.secondHalfOptional")).toHaveLength(0);
  });

  it("sends the second category as friendlyCategoryBId on the second pick", async () => {
    const lobby = makeLobby("friendly_possession");
    lobby.settings.friendlyCategoryAId = "cat-1";
    const onUpdateSettings = renderPicker(lobby);

    fireEvent.click(categoryButton("Transfers"));

    await waitFor(() => {
      expect(onUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          friendlyCategoryAId: "cat-1",
          friendlyCategoryBId: "cat-2",
        }),
      );
    });
  });

  it("promotes the second half up when the first-half pick is deselected", async () => {
    const lobby = makeLobby("friendly_possession");
    lobby.settings.friendlyCategoryAId = "cat-1";
    lobby.settings.friendlyCategoryBId = "cat-2";
    const onUpdateSettings = renderPicker(lobby);

    fireEvent.click(categoryButton("Legends"));

    // Deselecting A must never leave an orphaned B behind.
    await waitFor(() => {
      expect(onUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          friendlyCategoryAId: "cat-2",
          friendlyCategoryBId: null,
        }),
      );
    });
  });

  it("never offers a second-half pick in party quiz", async () => {
    const lobby = makeLobby("friendly_party_quiz");
    lobby.settings.friendlyCategoryAId = "cat-1";
    const onUpdateSettings = renderPicker(lobby);

    expect(screen.queryByText("friend.firstHalfBadge")).toBeNull();

    fireEvent.click(categoryButton("Transfers"));

    await waitFor(() => {
      expect(onUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          friendlyCategoryAId: "cat-2",
          friendlyCategoryBId: null,
        }),
      );
    });
  });
});
