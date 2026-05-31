import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateJoinPanel } from "../CreateJoinPanel";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";

const mocks = vi.hoisted(() => ({
  socketEmit: vi.fn(),
  trackFriendInviteAccepted: vi.fn(),
  toastInfo: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
  }),
}));

vi.mock("@/lib/realtime/socket-client", () => ({
  connectSocket: () => ({ emit: mocks.socketEmit }),
  getSocket: () => ({ emit: mocks.socketEmit }),
}));

vi.mock("@/lib/analytics/game-events", () => ({
  trackFriendInviteAccepted: (...args: unknown[]) => mocks.trackFriendInviteAccepted(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    info: mocks.toastInfo,
    error: mocks.toastError,
  },
}));

describe("CreateJoinPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRealtimeMatchStore.getState().reset();
    mocks.socketEmit.mockImplementation((event: string, payload?: unknown, ack?: (result: unknown) => void) => {
      if (typeof ack !== "function") return;
      const correlationId =
        payload && typeof payload === "object" && "correlationId" in payload
          ? String((payload as { correlationId: unknown }).correlationId)
          : "test-correlation";

      if (event === "lobby:create") {
        ack({
          ok: true,
          lobbyId: "created-lobby",
          inviteCode: "CRE8ED",
          correlationId,
        });
      }

      if (event === "lobby:join_by_code") {
        ack({
          ok: true,
          lobbyId: "joined-lobby",
          inviteCode:
            payload && typeof payload === "object" && "inviteCode" in payload
              ? String((payload as { inviteCode: unknown }).inviteCode)
              : "JOINED",
          alreadyMember: false,
          correlationId,
        });
      }
    });
  });

  it("creates a lobby through the ack-driven command machine", () => {
    const onActionTriggered = vi.fn();
    render(<CreateJoinPanel onActionTriggered={onActionTriggered} />);

    fireEvent.click(screen.getByText("friend.createRoom"));

    expect(onActionTriggered).toHaveBeenCalledOnce();
    expect(mocks.socketEmit).toHaveBeenCalledWith("lobby:create", {
      mode: "friendly",
      isPublic: false,
      correlationId: expect.any(String),
    }, expect.any(Function));
  });

  it("joins a manually entered code through the ack-driven command machine", () => {
    const onActionTriggered = vi.fn();
    render(<CreateJoinPanel onActionTriggered={onActionTriggered} />);

    fireEvent.change(screen.getByPlaceholderText("friend.roomCodePlaceholder"), {
      target: { value: "abc123" },
    });
    fireEvent.click(screen.getByText("friend.joinLobby"));

    expect(onActionTriggered).toHaveBeenCalledOnce();
    expect(mocks.trackFriendInviteAccepted).toHaveBeenCalledWith("ABC123");
    expect(mocks.socketEmit).toHaveBeenCalledWith("lobby:join_by_code", {
      inviteCode: "ABC123",
      correlationId: expect.any(String),
    }, expect.any(Function));
  });

  it("joins when a full invite link is pasted into the code field", () => {
    const onActionTriggered = vi.fn();
    render(<CreateJoinPanel onActionTriggered={onActionTriggered} />);

    fireEvent.change(screen.getByPlaceholderText("friend.roomCodePlaceholder"), {
      target: { value: "https://quizball.test/friend/room/abc123?from=share" },
    });
    fireEvent.click(screen.getByText("friend.joinLobby"));

    expect(onActionTriggered).toHaveBeenCalledOnce();
    expect(mocks.trackFriendInviteAccepted).toHaveBeenCalledWith("ABC123");
    expect(mocks.socketEmit).toHaveBeenCalledWith("lobby:join_by_code", {
      inviteCode: "ABC123",
      correlationId: expect.any(String),
    }, expect.any(Function));
  });
});
