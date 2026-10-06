import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ locale: "es", t: (k: string, p?: Record<string, string>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));

import { InviteFailureScreen, inviteFailureKind, type InviteFailureView } from "../InviteFailureScreen";
import { newRoomPathFor } from "../../hooks/useFriendLobbyLogic";

const failure = (reasonCode: string, room: InviteFailureView["room"] = null, retryable = false): InviteFailureView => ({
  inviteCode: "ABC123", reasonCode, messageKey: "friend.toastJoinFailed", retryable, room,
});
const room = (roomState: "open" | "in_progress" | "ended" | "unknown", gameMode: string | null = "auction", hostNickname: string | null = "Lionel") =>
  ({ roomState, gameMode, duelGame: null, hostNickname });

function renderScreen(f: InviteFailureView) {
  const actions = { onRetry: vi.fn(), onBack: vi.fn(), onSignUp: vi.fn(), onNewRoom: vi.fn(), onTryAgain: vi.fn() };
  render(<InviteFailureScreen failure={f} code="ABC123" {...actions} />);
  return actions;
}

describe("refused invite: a way forward for each reason", () => {
  it("classifies the reason", () => {
    expect(inviteFailureKind(failure("LOBBY_MODE_REQUIRES_ACCOUNT"))).toBe("account");
    expect(inviteFailureKind(failure("LOBBY_FULL"))).toBe("full");
    expect(inviteFailureKind(failure("LOBBY_NOT_FOUND", room("ended")))).toBe("ended");
    expect(inviteFailureKind(failure("LOBBY_NOT_FOUND", room("in_progress")))).toBe("in_progress");
    expect(inviteFailureKind(failure("LOBBY_NOT_FOUND", room("unknown")))).toBe("expired");
    expect(inviteFailureKind(failure("LOBBY_NOT_FOUND"))).toBe("expired"); // older server: no room info
    expect(inviteFailureKind(failure("LOBBY_JOIN_ERROR"))).toBe("failed");
  });

  it("account-only mode (guest): sign up with the host's name, never 'invitation unavailable'", () => {
    const a = renderScreen(failure("LOBBY_MODE_REQUIRES_ACCOUNT", room("open", "friendly_party_quiz")));
    expect(screen.getByRole("heading").textContent).toBe('friend.inviteAccountTitle:{"host":"Lionel"}');
    expect(screen.queryByText(/inviteJoinFailedDescription/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /inviteCreateAccount/ }));
    expect(a.onSignUp).toHaveBeenCalledOnce();
  });

  it("ended room: start a new room; mid-game room: try again or open your own", () => {
    const a = renderScreen(failure("LOBBY_NOT_FOUND", room("ended")));
    expect(screen.getByRole("heading").textContent).toBe("friend.inviteEndedTitle");
    fireEvent.click(screen.getByRole("button", { name: /inviteNewRoom/ }));
    expect(a.onNewRoom).toHaveBeenCalledOnce();
  });

  it("mid-game room: try again first, own room second; a missing host name falls back", () => {
    const a = renderScreen(failure("LOBBY_NOT_FOUND", room("in_progress", "football_grid", null)));
    expect(screen.getByRole("heading").textContent).toBe('friend.inviteInProgressTitle:{"host":"friend.inviteHostFallback"}');
    fireEvent.click(screen.getByRole("button", { name: /inviteTryAgain/ }));
    fireEvent.click(screen.getByRole("button", { name: /inviteOwnRoom/ }));
    expect(a.onTryAgain).toHaveBeenCalledOnce();
    expect(a.onNewRoom).toHaveBeenCalledOnce();
  });

  it("full room and dead link both offer a new room; other failures keep retry when retryable", () => {
    renderScreen(failure("LOBBY_FULL", room("open")));
    expect(screen.getByRole("button", { name: /inviteOwnRoom/ })).toBeTruthy();
  });

  it("new room in the same game where it can be opened directly", () => {
    expect(newRoomPathFor(room("ended", "auction"))).toBe("/friend/room/new?game=auction");
    expect(newRoomPathFor(room("ended", "football_grid"))).toBe("/friend/room/new?game=football_grid");
    expect(newRoomPathFor({ roomState: "ended", gameMode: "duel", duelGame: "pistas", hostNickname: null })).toBe("/friend/room/new?duel=pistas");
    expect(newRoomPathFor(room("ended", "friendly_possession"))).toBe("/friend/room/new");
    expect(newRoomPathFor(null)).toBe("/friend/room/new");
  });
});
