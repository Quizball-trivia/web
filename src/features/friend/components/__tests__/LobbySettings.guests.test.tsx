import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth.store";
import { useAuthPromptStore } from "@/stores/authPrompt.store";
import { useGuestPrincipalStore } from "@/lib/realtime/realtime-principal";
import type { LobbyState } from "@/lib/realtime/socket.types";

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "en", t: (key: string) => key }) }));
vi.mock("@/lib/analytics/game-events", () => ({ trackCategorySelected: vi.fn() }));
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }));

const { LobbySettings } = await import("../LobbySettings");

const lobby = (members: LobbyState["members"]): LobbyState => ({
  lobbyId: "L", mode: "friendly", status: "waiting", inviteCode: "ABC123", displayName: "Room", isPublic: false, hostUserId: "host",
  settings: { gameMode: "football_grid", friendlyRandom: true, friendlyCategoryAId: null, friendlyCategoryBId: null },
  members,
});
const member = (userId: string, isGuest = false, isHost = false): LobbyState["members"][number] => ({ userId, username: userId, avatarUrl: null, isReady: false, isHost, isGuest });

describe("LobbySettings — guest rooms", () => {
  beforeEach(() => {
    toastError.mockClear();
    useAuthPromptStore.setState({ isOpen: false });
    useGuestPrincipalStore.getState().clear();
  });

  it("locks Friendly match and Party quiz when a guest is in the room; a member host gets a toast", async () => {
    useAuthStore.setState({ status: "authenticated", user: { id: "host" } } as never);
    const onUpdateSettings = vi.fn();
    render(<LobbySettings isHost lobby={lobby([member("host", false, true), member("g1", true)])} categories={[]} onUpdateSettings={onUpdateSettings} />);
    const classic = screen.getByRole("button", { name: /friend\.classic/ });
    expect(classic.getAttribute("data-guest-locked")).toBe("true");
    fireEvent.click(classic);
    expect(toastError).toHaveBeenCalledWith("friend.errorModeRequiresAccount");
    expect(onUpdateSettings).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /friend\.auction/ }));
    await waitFor(() => expect(onUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({ gameMode: "auction" })));
  });

  it("a guest host tapping a locked mode gets the sign-up dialog", () => {
    useAuthStore.setState({ status: "anonymous", user: null } as never);
    useGuestPrincipalStore.getState().setGuest({ userId: "g1", token: "t", nickname: "Mystery", avatarCustomization: null });
    render(<LobbySettings isHost lobby={lobby([member("g1", true, true)])} categories={[]} onUpdateSettings={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /friend\.partyQuiz/ }));
    expect(useAuthPromptStore.getState().isOpen).toBe(true);
  });

  it("does not lock anything in a members-only room", () => {
    useAuthStore.setState({ status: "authenticated", user: { id: "host" } } as never);
    render(<LobbySettings isHost lobby={lobby([member("host", false, true), member("m2")])} categories={[]} onUpdateSettings={vi.fn()} />);
    expect(screen.getByRole("button", { name: /friend\.classic/ }).getAttribute("data-guest-locked")).toBeNull();
  });
});
