import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_DEV_UNLIMITED_EMAILS;

describe("isUnlimitedDevEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_DEV_UNLIMITED_EMAILS = "dev.one@quizball.io, Dev.Two@quizball.io";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_DEV_UNLIMITED_EMAILS = ORIGINAL;
  });

  it("matches allowlisted emails case-insensitively", async () => {
    const { isUnlimitedDevEmail } = await import("../devUnlimited");
    expect(isUnlimitedDevEmail("dev.one@quizball.io")).toBe(true);
    expect(isUnlimitedDevEmail("DEV.ONE@quizball.io")).toBe(true);
    expect(isUnlimitedDevEmail("dev.two@quizball.io")).toBe(true);
  });

  it("rejects non-allowlisted and empty emails", async () => {
    const { isUnlimitedDevEmail } = await import("../devUnlimited");
    expect(isUnlimitedDevEmail("stranger@quizball.io")).toBe(false);
    expect(isUnlimitedDevEmail(null)).toBe(false);
    expect(isUnlimitedDevEmail(undefined)).toBe(false);
    expect(isUnlimitedDevEmail("")).toBe(false);
  });

  it("disables the bypass entirely when the env var is empty", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_DEV_UNLIMITED_EMAILS = "";
    const { isUnlimitedDevEmail } = await import("../devUnlimited");
    expect(isUnlimitedDevEmail("dev.one@quizball.io")).toBe(false);
  });
});
