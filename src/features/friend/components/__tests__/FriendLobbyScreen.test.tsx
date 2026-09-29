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

describe("FriendLobbyScreen duel rooms", () => {
  const member = (userId: string, isHost: boolean, isReady: boolean) => ({
    userId, username: userId, avatarUrl: null, isReady, isHost,
  });
  function duelRoom(members: ReturnType<typeof member>[]) {
    const lobby = {
      lobbyId: "lobby-1", mode: "friendly", status: "waiting", inviteCode: "DUEL01", displayName: "Room", isPublic: false,
      hostUserId: "host",
      settings: { gameMode: "duel", duelGame: "buscaminas", friendlyRandom: true, friendlyCategoryAId: null, friendlyCategoryBId: null },
      members,
    };
    return {
      ...makeHookResult({ inviteCode: "DUEL01", reasonCode: "", message: "", retryable: false }),
      inviteJoinFailure: null,
      lobby,
      isDuelLobby: true,
      isAuctionLobby: false,
      isFootballGridLobby: false,
      members,
      me: members[0],
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers the host an enabled Start for a ready two-player duel", () => {
    const result = duelRoom([member("host", true, true), member("guest", false, true)]);
    mocks.useFriendLobbyLogic.mockReturnValue(result);
    render(<FriendLobbyScreen roomCode="DUEL01" isHost />);

    expect(screen.getByText("friend.readyCopyDuel")).toBeInTheDocument();
    const start = screen.getByRole("button", { name: "friend.startDuel" });
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(result.actions.handleStartMatch).toHaveBeenCalledOnce();
  });

  it("keeps Start disabled until the second seat is taken and ready", () => {
    mocks.useFriendLobbyLogic.mockReturnValue(duelRoom([member("host", true, true)]));
    const { unmount } = render(<FriendLobbyScreen roomCode="DUEL01" isHost />);
    expect(screen.getByRole("button", { name: "friend.startDuel" })).toBeDisabled();
    unmount();

    mocks.useFriendLobbyLogic.mockReturnValue(duelRoom([member("host", true, true), member("guest", false, false)]));
    render(<FriendLobbyScreen roomCode="DUEL01" isHost />);
    expect(screen.getByRole("button", { name: "friend.startDuel" })).toBeDisabled();
  });

  it("passes the ?duel= game of a new room to the room logic", () => {
    mocks.useFriendLobbyLogic.mockReturnValue(duelRoom([member("host", true, false)]));
    render(<FriendLobbyScreen roomCode="new" isHost newRoomDuelGame="pistas" />);
    expect(mocks.useFriendLobbyLogic).toHaveBeenCalledWith(expect.objectContaining({ roomCode: "new", newRoomDuelGame: "pistas" }));
  });
});
