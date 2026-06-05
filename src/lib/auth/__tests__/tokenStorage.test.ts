import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadTokenStorage(apiUrl: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", apiUrl);
  return import("@/lib/auth/tokenStorage");
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("tokenStorage API scoping", () => {
  it("does not replay legacy prod tokens against the staging API", async () => {
    window.localStorage.setItem("qb_access_token", "prod-access");
    window.localStorage.setItem("qb_refresh_token", "prod-refresh");

    const tokenStorage = await loadTokenStorage("https://api-staging.quizball.io");

    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
    expect(window.localStorage.getItem("qb_access_token")).toBeNull();
    expect(window.localStorage.getItem("qb_refresh_token")).toBeNull();
    expect(window.localStorage.getItem("qb_token_scope")).toBe("https://api-staging.quizball.io");
  });

  it("migrates legacy tokens for non-staging APIs", async () => {
    window.localStorage.setItem("qb_access_token", "prod-access");
    window.localStorage.setItem("qb_refresh_token", "prod-refresh");

    const tokenStorage = await loadTokenStorage("https://api.quizball.io");

    expect(tokenStorage.getAccessToken()).toBe("prod-access");
    expect(tokenStorage.getRefreshToken()).toBe("prod-refresh");
    expect(window.localStorage.getItem("qb_access_token")).toBeNull();
    expect(window.localStorage.getItem("qb_refresh_token")).toBeNull();
    expect(window.localStorage.getItem("qb_access_token:https%3A%2F%2Fapi.quizball.io")).toBe("prod-access");
    expect(window.localStorage.getItem("qb_refresh_token:https%3A%2F%2Fapi.quizball.io")).toBe("prod-refresh");
  });

  it("clears scoped tokens when the API scope changes", async () => {
    const prodTokenStorage = await loadTokenStorage("https://api.quizball.io");
    prodTokenStorage.setTokens({ accessToken: "prod-access", refreshToken: "prod-refresh" });

    const stagingTokenStorage = await loadTokenStorage("https://api-staging.quizball.io");

    expect(stagingTokenStorage.getAccessToken()).toBeNull();
    expect(stagingTokenStorage.getRefreshToken()).toBeNull();
    expect(window.localStorage.getItem("qb_access_token:https%3A%2F%2Fapi.quizball.io")).toBeNull();
    expect(window.localStorage.getItem("qb_refresh_token:https%3A%2F%2Fapi.quizball.io")).toBeNull();
    expect(window.localStorage.getItem("qb_token_scope")).toBe("https://api-staging.quizball.io");
  });

  it("re-reads scoped tokens from storage after another tab rotates them", async () => {
    const tokenStorage = await loadTokenStorage("https://api.quizball.io");
    tokenStorage.setTokens({ accessToken: "old-access", refreshToken: "old-refresh" });

    expect(tokenStorage.getRefreshToken()).toBe("old-refresh");

    window.localStorage.setItem("qb_access_token:https%3A%2F%2Fapi.quizball.io", "new-access");
    window.localStorage.setItem("qb_refresh_token:https%3A%2F%2Fapi.quizball.io", "new-refresh");

    expect(tokenStorage.getAccessToken()).toBe("new-access");
    expect(tokenStorage.getRefreshToken()).toBe("new-refresh");
  });
});
