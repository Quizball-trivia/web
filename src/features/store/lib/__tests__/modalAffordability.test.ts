import { describe, expect, it } from "vitest";
import { affordabilityAllowsConfirm } from "../modalAffordability";

describe("affordabilityAllowsConfirm", () => {
  it("never gates equipping an owned part on the wallet", () => {
    // Owned kit priced above the balance: affordability is false, equip must still be allowed.
    expect(affordabilityAllowsConfirm("equip", false)).toBe(true);
    expect(affordabilityAllowsConfirm("equip", true)).toBe(true);
  });

  it("passes raw affordability through for every other mode", () => {
    for (const mode of ["coins", "stripe", "none", undefined] as const) {
      expect(affordabilityAllowsConfirm(mode, false)).toBe(false);
      expect(affordabilityAllowsConfirm(mode, true)).toBe(true);
    }
  });
});
