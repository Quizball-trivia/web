import { describe, expect, it } from "vitest";

import { formatCooldownDate } from "@/lib/api/nicknameErrors";

const UNLOCK = new Date("2026-08-25T07:26:42.672Z");

describe("formatCooldownDate", () => {
  it("formats in Georgian for the ka locale", () => {
    expect(formatCooldownDate(UNLOCK, "ka")).toBe("25 აგვისტო, 2026");
  });

  it("formats day-first for every other locale", () => {
    expect(formatCooldownDate(UNLOCK, "en")).toBe("25 August 2026");
  });

  it("follows the app locale rather than the browser's", () => {
    expect(formatCooldownDate(UNLOCK, "ka")).not.toBe(formatCooldownDate(UNLOCK, "en"));
  });
});
