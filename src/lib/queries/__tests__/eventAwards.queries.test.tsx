import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  getUserEventAwards: vi.fn(),
}));

vi.mock("@/lib/repositories/eventAwards.repo", () => ({
  getUserEventAwards: (...args: unknown[]) => repoMocks.getUserEventAwards(...args),
  getMyEventAwards: vi.fn(),
  ackEventAward: vi.fn(),
}));

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector: (state: { status: string }) => unknown) => selector({ status: "authenticated" }),
}));

import { useUserEventAwards } from "@/lib/queries/eventAwards.queries";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useUserEventAwards", () => {
  beforeEach(() => {
    repoMocks.getUserEventAwards.mockReset();
    repoMocks.getUserEventAwards.mockResolvedValue({ data: { awards: [] }, error: null });
  });

  it("does not ask the API for the placeholder player id", async () => {
    const { result } = renderHook(() => useUserEventAwards("player-1"), { wrapper });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(repoMocks.getUserEventAwards).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches awards for a real user id", async () => {
    const id = "4f70f6d9-dbe5-48bd-81a8-625c3f297d3c";
    renderHook(() => useUserEventAwards(id), { wrapper });
    await waitFor(() => expect(repoMocks.getUserEventAwards).toHaveBeenCalledWith(id));
  });
});
