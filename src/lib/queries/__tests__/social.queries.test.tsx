import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock the social repository so no real network calls happen and we can assert
// whether the auth-gated polling hooks actually invoke their fetcher.
const getFriendRequestsMock = vi.fn().mockResolvedValue({
  incoming: [],
  outgoing: [],
  incomingCount: 0,
});

vi.mock("@/lib/repositories/social.repo", () => ({
  getFriends: vi.fn().mockResolvedValue({ friends: [] }),
  getFriendRequests: () => getFriendRequestsMock(),
  searchUsers: vi.fn().mockResolvedValue({ results: [] }),
}));

import { useAuthStore } from "@/stores/auth.store";
import {
  useFriendRequests,
  useIncomingFriendRequestCount,
} from "@/lib/queries/social.queries";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function setStatus(status: "loading" | "anonymous" | "authenticated") {
  useAuthStore.setState({ status });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("auth-only social polling is gated on authenticated status", () => {
  it("does NOT fetch friend requests when anonymous", async () => {
    setStatus("anonymous");
    const { result } = renderHook(() => useFriendRequests(), { wrapper });

    await new Promise((r) => setTimeout(r, 20));

    expect(result.current.fetchStatus).toBe("idle");
    expect(getFriendRequestsMock).not.toHaveBeenCalled();
  });

  it("does NOT fetch friend requests while loading", async () => {
    setStatus("loading");
    renderHook(() => useFriendRequests(), { wrapper });

    await new Promise((r) => setTimeout(r, 20));
    expect(getFriendRequestsMock).not.toHaveBeenCalled();
  });

  it("does NOT fetch the incoming-count when anonymous", async () => {
    setStatus("anonymous");
    renderHook(() => useIncomingFriendRequestCount(), { wrapper });

    await new Promise((r) => setTimeout(r, 20));
    expect(getFriendRequestsMock).not.toHaveBeenCalled();
  });

  it("DOES fetch friend requests when authenticated", async () => {
    setStatus("authenticated");
    renderHook(() => useFriendRequests(), { wrapper });

    await waitFor(() => expect(getFriendRequestsMock).toHaveBeenCalled());
  });
});
