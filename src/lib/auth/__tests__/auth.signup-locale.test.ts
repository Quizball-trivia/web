import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  signUp: vi.fn(), signInWithOAuth: vi.fn(), signInWithIdToken: vi.fn(),
}));

vi.mock("@/lib/api/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/api")>("@/lib/api/api");
  return { ...actual, api: { GET: vi.fn().mockResolvedValue({}), POST: vi.fn().mockResolvedValue({}) } };
});
vi.mock("@/lib/auth/supabase", () => ({
  getSupabaseClient: () => ({ auth: client }),
  setSupabaseSession: vi.fn(),
  signOutLocal: vi.fn().mockResolvedValue(undefined),
}));

import { logout, register, socialLogin, socialLoginWithIdToken } from "../auth.service";

const SAVED = JSON.stringify("de");
const pending = () => localStorage.getItem("quizball_signup_locale");

describe("the signup language around sign-in", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("quizball_locale", SAVED);
    window.history.pushState({}, "", "/fr");
    vi.clearAllMocks();
    client.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null });
    client.signInWithOAuth.mockResolvedValue({ error: null });
    client.signInWithIdToken.mockResolvedValue({ error: null });
  });

  it("each way in remembers it apart from the saved language", async () => {
    await register({ email: "a@example.com", password: "x".repeat(10) });
    expect(JSON.parse(pending()!).locale).toBe("fr");
    localStorage.removeItem("quizball_signup_locale");
    await socialLogin("google", "https://example.com/auth/callback");
    expect(JSON.parse(pending()!).locale).toBe("fr");
    localStorage.removeItem("quizball_signup_locale");
    await socialLoginWithIdToken("google", "token");
    expect(JSON.parse(pending()!).locale).toBe("fr");
    expect(localStorage.getItem("quizball_locale")).toBe(SAVED);
  });

  it.each([
    ["ID-token sign-in", () => { client.signInWithIdToken.mockResolvedValue({ error: new Error("no") }); return socialLoginWithIdToken("google", "token"); }],
    ["OAuth", () => { client.signInWithOAuth.mockResolvedValue({ error: new Error("no") }); return socialLogin("google", "https://example.com/auth/callback"); }],
    ["email signup", () => { client.signUp.mockResolvedValue({ data: { user: null, session: null }, error: new Error("no") }); return register({ email: "a@example.com", password: "x".repeat(10) }); }],
  ] as const)("a failed %s changes nothing", async (_label, run) => {
    await expect(run()).rejects.toThrow();
    expect(pending()).toBeNull();
    expect(localStorage.getItem("quizball_locale")).toBe(SAVED);
  });

  it("an email that already has an account drops it", async () => {
    client.signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
    const result = await register({ email: "a@example.com", password: "x".repeat(10) });
    expect(result.alreadyRegistered).toBe(true);
    expect(pending()).toBeNull();
  });

  it.each(["/play", "/fr"])("blocked storage never stops a sign-in from %s", async (path) => {
    window.history.pushState({}, "", path);
    const denied = () => { throw new DOMException("denied", "SecurityError"); };
    const spies = [vi.spyOn(Storage.prototype, "getItem").mockImplementation(denied), vi.spyOn(Storage.prototype, "setItem").mockImplementation(denied), vi.spyOn(Storage.prototype, "removeItem").mockImplementation(denied)];
    try {
      await expect(socialLoginWithIdToken("google", "token")).resolves.toBeNull();
      expect(client.signInWithIdToken).toHaveBeenCalled();
      await expect(socialLogin("google", "https://example.com/auth/callback")).resolves.toBeUndefined();
      expect(client.signInWithOAuth).toHaveBeenCalled();
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });

  it("logout clears it and leaves the saved language", async () => {
    await socialLoginWithIdToken("google", "token");
    expect(pending()).not.toBeNull();
    await logout();
    expect(pending()).toBeNull();
    expect(localStorage.getItem("quizball_locale")).toBe(SAVED);
  });
});
