import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FriendLobbyScreen } from "../FriendLobbyScreen";

const mocks = vi.hoisted(() => ({
  useFriendLobbyLogic: vi.fn(),
  handleInviteRetry: vi.fn(),
  handleInviteBack: vi.fn(),
}));

vi.mock("../../hooks/useFriendLobbyLogic", () => ({
  useFriendLobbyLogic: mocks.useFriendLobbyLogic,
}));

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
  }),
}));

vi.mock("../LobbyHeader", () => ({ LobbyHeader: () => null }));
vi.mock("../LobbySettings", () => ({ LobbySettings: () => null }));
vi.mock("../AlreadyInLobbyModal", () => ({ AlreadyInLobbyModal: () => null }));

function makeHookResult(
  failure: { inviteCode: string; reasonCode: string; message: string; retryable: boolean },
) {
  return {
    lobby: null,
    members: [],
    lobbyCode: failure.inviteCode,
    isResolvingInvite: false,
    isPreparingMatch: false,
    inviteJoinFailure: failure,
    targetInviteCode: failure.inviteCode,
    me: undefined,
    opponent: undefined,
    h2hSummary: null,
    allCategories: [],
    settingsErrorVersion: 0,
    isStartingMatch: false,
    isLeaving: false,
    optimisticReady: null,
    actions: {
      copyCode: vi.fn(),
      handleReadyToggle: vi.fn(),
      handleUpdateSettings: vi.fn(),
      handleStartMatch: vi.fn(),
      handleLeaveLobby: vi.fn(),
      handleInviteRetry: mocks.handleInviteRetry,
      handleInviteBack: mocks.handleInviteBack,
    },
  };
}

describe("FriendLobbyScreen invite failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("explains an expired lobby link and does not offer a pointless retry", () => {
    mocks.useFriendLobbyLogic.mockReturnValue(
      makeHookResult({
        inviteCode: "MISSING",
        reasonCode: "LOBBY_NOT_FOUND",
        message: "friend.inviteExpiredReason",
        retryable: false,
      }),
    );

    render(<FriendLobbyScreen roomCode="MISSING" isHost={false} />);

    expect(screen.getByText("friend.inviteExpiredTitle")).toBeInTheDocument();
    expect(screen.getByText("friend.inviteExpiredDescription")).toBeInTheDocument();
    expect(screen.getByText("friend.inviteExpiredReason")).toBeInTheDocument();
    expect(screen.queryByText("friend.retry")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("friend.backToFriendHub"));
    expect(mocks.handleInviteBack).toHaveBeenCalledOnce();
  });

  it("keeps retry available for a temporary lobby-state timeout", () => {
    mocks.useFriendLobbyLogic.mockReturnValue(
      makeHookResult({
        inviteCode: "SLOW01",
        reasonCode: "LOBBY_STATE_TIMEOUT",
        message: "friend.inviteStateTimeoutReason",
        retryable: true,
      }),
    );

    render(<FriendLobbyScreen roomCode="SLOW01" isHost={false} />);

    expect(screen.getByText("friend.inviteJoinFailedTitle")).toBeInTheDocument();
    expect(
      screen.getByText('friend.inviteJoinFailedDescription|{"code":"SLOW01"}'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("friend.retry"));
    expect(mocks.handleInviteRetry).toHaveBeenCalledOnce();
  });
});
