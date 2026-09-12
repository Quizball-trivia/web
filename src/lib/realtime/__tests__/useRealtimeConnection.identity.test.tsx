import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../socket-client", () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
  getSocket: vi.fn(() => ({ connected: false, active: false })),
  reconnectSocket: vi.fn(),
  startConnectionQualityMonitor: vi.fn(),
  stopConnectionQualityMonitor: vi.fn(),
}));
vi.mock("../socket-handlers", () => ({ registerSocketHandlers: vi.fn() }));

const { useRealtimeConnection } = await import("../useRealtimeConnection");
const { useGameSessionStore } = await import("@/stores/gameSession.store");
const { useAuctionActiveMatchStore } = await import("@/stores/auctionActiveMatch.store");

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("useRealtimeConnection — identity-scoped state", () => {
  beforeEach(() => {
    useGameSessionStore.getState().reset();
  });

  it("keeps a member's game session when a consumer merely disables realtime (solo / training)", () => {
    const shell = renderHook((props: { enabled: boolean; selfUserId: string | null }) => useRealtimeConnection(props), {
      wrapper,
      initialProps: { enabled: true, selfUserId: "member-1" },
    });
    useGameSessionStore.setState({ stage: "playing" } as never);
    // The game screen's consumer for a local mode: same identity, realtime off.
    const local = renderHook(() => useRealtimeConnection({ enabled: false, selfUserId: "member-1" }), { wrapper });
    expect(useGameSessionStore.getState().stage).toBe("playing");
    local.unmount();
    shell.unmount();
  });

  it("clears the game session and auction rejoin state when a different identity connects", () => {
    const first = renderHook(() => useRealtimeConnection({ enabled: true, selfUserId: "guest-1" }), { wrapper });
    useGameSessionStore.setState({ stage: "playing" } as never);
    window.sessionStorage.setItem("auction:last_match_id", "m-1");
    first.rerender();
    // Guest signs in: the shell's consumer switches to the member id.
    renderHook(() => useRealtimeConnection({ enabled: true, selfUserId: "member-2" }), { wrapper });
    expect(useGameSessionStore.getState().stage).not.toBe("playing");
    expect(window.sessionStorage.getItem("auction:last_match_id")).toBeNull();
    expect(useAuctionActiveMatchStore.getState().activeAuctionMatch).toBeNull();
  });
});
