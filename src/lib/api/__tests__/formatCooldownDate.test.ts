import { describe, expect, it } from "vitest";

import { formatCooldownDate } from "@/lib/api/nicknameErrors";

// Local-time components, not a UTC ISO string: toLocaleDateString renders the
// runner's local date, so a UTC timestamp would assert "24 August" on a UTC-8
// machine and flake.
const UNLOCK = new Date(2026, 7, 25, 12, 0, 0);

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
