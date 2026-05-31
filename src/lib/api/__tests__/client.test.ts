import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/api/api";

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

vi.mock("@/lib/auth/auth.service", () => ({
  refreshSession: vi.fn(),
}));

import { api } from "@/lib/api/api";
import { refreshSession } from "@/lib/auth/auth.service";
import { apiFetch } from "@/lib/api/client";

const mockedRequest = api.request as unknown as ReturnType<typeof vi.fn>;
const mockedRefresh = refreshSession as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("apiFetch — refresh recursion guard", () => {
  it("does NOT attempt refresh when the failing request is /api/v1/auth/refresh", async () => {
    mockedRequest.mockRejectedValue?.(undefined);
    mockedRequest.mockRejectedValue(new ApiError("Request failed", 401, null));

    await expect(
      apiFetch("post", "/api/v1/auth/refresh", { auth: false }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(mockedRefresh).not.toHaveBeenCalled();
    expect(mockedRequest).toHaveBeenCalledTimes(1); // no retry
  });

  it("does NOT attempt refresh for auth:false requests", async () => {
    mockedRequest.mockRejectedValue(new ApiError("Request failed", 401, null));

    await expect(
      apiFetch("get", "/api/v1/users/me", { auth: false }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it("does NOT attempt refresh when skipRefresh is set", async () => {
    mockedRequest.mockRejectedValue(new ApiError("Request failed", 401, null));

    await expect(
      apiFetch("get", "/api/v1/users/me", { skipRefresh: true }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(mockedRefresh).not.toHaveBeenCalled();
  });
});

describe("apiFetch — 401 retry behavior", () => {
  it("on a normal 401, refreshes once and retries the original request", async () => {
    mockedRequest
      .mockRejectedValueOnce(new ApiError("Request failed", 401, null)) // first call: 401
      .mockResolvedValueOnce({ id: "user-1" }); // retry: success
    mockedRefresh.mockResolvedValueOnce({ ok: true });

    const result = await apiFetch("get", "/api/v1/users/me");

    expect(result).toEqual({ id: "user-1" });
    expect(mockedRefresh).toHaveBeenCalledTimes(1);
    expect(mockedRequest).toHaveBeenCalledTimes(2);
    // retry must carry skipRefresh so it cannot loop
    expect(mockedRequest.mock.calls[1][2]).toMatchObject({ skipRefresh: true });
  });

  it("on a 401 with a terminal refresh, throws the original error without retrying", async () => {
    mockedRequest.mockRejectedValue(new ApiError("Request failed", 401, null));
    mockedRefresh.mockResolvedValueOnce({ ok: false, terminal: true });

    await expect(apiFetch("get", "/api/v1/users/me")).rejects.toBeInstanceOf(ApiError);

    expect(mockedRefresh).toHaveBeenCalledTimes(1);
    expect(mockedRequest).toHaveBeenCalledTimes(1); // 401, refresh fails terminally, no retry
  });
});
