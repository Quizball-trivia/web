import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useLeaderboard } from "@/lib/queries/leaderboard.queries";

const getLeaderboardMock = vi.fn().mockResolvedValue({
  data: [],
  error: null,
});

vi.mock("@/lib/repositories/leaderboard.repo", () => ({
  getLeaderboard: (...args: unknown[]) => getLeaderboardMock(...args),
  getUserRank: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

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

describe("leaderboard query auth gating", () => {
  it("does not fetch the ranked leaderboard for anonymous landing visitors", async () => {
    setStatus("anonymous");
    const { result } = renderHook(() => useLeaderboard("global"), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(result.current.fetchStatus).toBe("idle");
    expect(getLeaderboardMock).not.toHaveBeenCalled();
  });

  it("fetches the ranked leaderboard after authentication", async () => {
    setStatus("authenticated");
    renderHook(() => useLeaderboard("global"), { wrapper });

    await waitFor(() => expect(getLeaderboardMock).toHaveBeenCalledWith("global"));
  });
});
