import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/api/api";

// Mock the low-level api module so we can drive refresh responses.
vi.mock("@/lib/api/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/api")>("@/lib/api/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      POST: vi.fn(),
    },
  };
});

import { api } from "@/lib/api/api";
import { refreshSession, refresh } from "@/lib/auth/auth.service";
import { setTokens, getRefreshToken, getAccessToken, clearTokens } from "@/lib/auth/tokenStorage";

const mockedPost = api.POST as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  clearTokens();
});

describe("refreshSession — terminal failure clears tokens", () => {
  it("clears tokens on a hard 401", async () => {
    setTokens({ accessToken: "a", refreshToken: "r" });
    mockedPost.mockRejectedValueOnce(new ApiError("Request failed", 401, { code: "AUTHENTICATION_ERROR" }));

    const result = await refreshSession();

    expect(result).toEqual({ ok: false, terminal: true });
    expect(getRefreshToken()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("clears tokens on a hard 400 (dead refresh token)", async () => {
    setTokens({ accessToken: "a", refreshToken: "r" });
    mockedPost.mockRejectedValueOnce(new ApiError("Request failed", 400, { code: "BAD_REQUEST" }));

    const result = await refreshSession();

    expect(result).toEqual({ ok: false, terminal: true });
    expect(getRefreshToken()).toBeNull();
  });

  it("does NOT clear tokens on a transient (network/5xx) failure", async () => {
    setTokens({ accessToken: "a", refreshToken: "r" });
    mockedPost.mockRejectedValueOnce(new ApiError("Request failed", 503, null));

    const result = await refreshSession();

    expect(result).toEqual({ ok: false, terminal: false });
    expect(getRefreshToken()).toBe("r"); // left intact for a later retry
  });

  it("sets new tokens and returns ok on success", async () => {
    mockedPost.mockResolvedValueOnce({ access_token: "new-a", refresh_token: "new-r" });

    const result = await refreshSession();

    expect(result).toEqual({ ok: true });
    expect(getAccessToken()).toBe("new-a");
    expect(getRefreshToken()).toBe("new-r");
  });

  it("boolean refresh() wrapper returns false on terminal failure and clears tokens", async () => {
    setTokens({ accessToken: "a", refreshToken: "r" });
    mockedPost.mockRejectedValueOnce(new ApiError("Request failed", 401, null));

    const ok = await refresh();

    expect(ok).toBe(false);
    expect(getRefreshToken()).toBeNull();
  });

  it("does not keep calling /auth/refresh after a terminal failure without new tokens", async () => {
    setTokens({ accessToken: "a", refreshToken: "r" });
    mockedPost.mockRejectedValueOnce(new ApiError("Request failed", 400, { code: "BAD_REQUEST" }));

    await refreshSession();
    const result = await refreshSession();

    expect(result).toEqual({ ok: false, terminal: true });
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });
});

describe("refreshSession — single-flight", () => {
  it("multiple parallel callers trigger only ONE /auth/refresh call", async () => {
    setTokens({ accessToken: "a", refreshToken: "r" });
    let resolvePost: (v: unknown) => void = () => {};
    mockedPost.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
    );

    const p1 = refreshSession();
    const p2 = refreshSession();
    const p3 = refreshSession();

    resolvePost({ access_token: "a", refresh_token: "r" });
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(r1).toEqual({ ok: true });
    expect(r2).toEqual({ ok: true });
    expect(r3).toEqual({ ok: true });
  });

  it("allows a new refresh after the previous one settles", async () => {
    setTokens({ accessToken: "a", refreshToken: "r" });
    mockedPost.mockResolvedValueOnce({ access_token: "a", refresh_token: "r" });
    await refreshSession();

    mockedPost.mockResolvedValueOnce({ access_token: "a2", refresh_token: "r2" });
    await refreshSession();

    expect(mockedPost).toHaveBeenCalledTimes(2);
  });
});
