import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/api/api";

const supabaseMocks = vi.hoisted(() => ({
  getSupabaseAccessToken: vi.fn(),
  signOutLocal: vi.fn(),
}));

vi.mock("@/lib/api/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/api")>("@/lib/api/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      request: vi.fn(),
    },
  };
});

vi.mock("@/lib/auth/supabase", () => ({
  getSupabaseAccessToken: (...args: unknown[]) => supabaseMocks.getSupabaseAccessToken(...args),
  signOutLocal: (...args: unknown[]) => supabaseMocks.signOutLocal(...args),
}));

import { api } from "@/lib/api/api";
import { apiFetch } from "@/lib/api/client";

const mockedRequest = api.request as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  supabaseMocks.getSupabaseAccessToken.mockResolvedValue("token-a");
});

describe("apiFetch — refresh recursion guard", () => {
  it("does NOT attempt refresh when the failing request is /api/v1/auth/refresh", async () => {
    mockedRequest.mockRejectedValue?.(undefined);
    mockedRequest.mockRejectedValue(new ApiError("Request failed", 401, null));

    await expect(
      apiFetch("post", "/api/v1/auth/refresh", { auth: false }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(supabaseMocks.getSupabaseAccessToken).not.toHaveBeenCalled();
    expect(mockedRequest).toHaveBeenCalledTimes(1); // no retry
  });

  it("does NOT attempt refresh when the failing request is /api/v1/auth/social-login-token", async () => {
    mockedRequest.mockRejectedValue(new ApiError("Request failed", 401, null));

    await expect(
      apiFetch("post", "/api/v1/auth/social-login-token"),
    ).rejects.toBeInstanceOf(ApiError);

    expect(supabaseMocks.signOutLocal).not.toHaveBeenCalled();
    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  it("does NOT attempt refresh for auth:false requests", async () => {
    mockedRequest.mockRejectedValue(new ApiError("Request failed", 401, null));

    await expect(
      apiFetch("get", "/api/v1/users/me", { auth: false }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(supabaseMocks.getSupabaseAccessToken).not.toHaveBeenCalled();
  });

  it("does NOT attempt refresh when skipRefresh is set", async () => {
    mockedRequest.mockRejectedValue(new ApiError("Request failed", 401, null));

    await expect(
      apiFetch("get", "/api/v1/users/me", { skipRefresh: true }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(supabaseMocks.signOutLocal).not.toHaveBeenCalled();
  });
});

describe("apiFetch — 401 retry behavior", () => {
  it("on a normal 401, retries once only if Supabase has a changed token", async () => {
    supabaseMocks.getSupabaseAccessToken
      .mockResolvedValueOnce("token-a")
      .mockResolvedValueOnce("token-b")
      .mockResolvedValueOnce("token-b");
    mockedRequest
      .mockRejectedValueOnce(new ApiError("Request failed", 401, null)) // first call: 401
      .mockResolvedValueOnce({ id: "user-1" }); // retry: success

    const result = await apiFetch("get", "/api/v1/users/me");

    expect(result).toEqual({ id: "user-1" });
    expect(mockedRequest).toHaveBeenCalledTimes(2);
    // retry must carry skipRefresh so it cannot loop
    expect(mockedRequest.mock.calls[1][2]).toMatchObject({ skipRefresh: true });
  });

  it("on a 401 without a changed token, signs out locally and throws the original error", async () => {
    mockedRequest.mockRejectedValue(new ApiError("Request failed", 401, null));

    await expect(apiFetch("get", "/api/v1/users/me")).rejects.toBeInstanceOf(ApiError);

    expect(supabaseMocks.signOutLocal).toHaveBeenCalledTimes(1);
    expect(mockedRequest).toHaveBeenCalledTimes(1); // 401, refresh fails terminally, no retry
  });
});
