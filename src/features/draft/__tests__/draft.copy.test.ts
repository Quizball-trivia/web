import { describe, expect, it } from "vitest";
import { draftCopy } from "../draft.copy";
import { HONOURS } from "../draft.rules";

describe("draft copy", () => {
  it("writes the Georgian first place as an ordinal of its own", () => {
    const ka = draftCopy("ka");
    expect(ka.raceOff(1, 2, "X")).toContain("1-ლი");
    expect(ka.raceOff(1, 2, "X")).not.toContain("მე-1");
    expect(ka.raceOff(3, 2, "X")).toContain("მე-3");
  });
  it("names every honour and the Iconic Clubs league in every language", () => {
    for (const locale of ["en", "es", "tr", "ka", "pt", "de", "ru", "fr", "el"]) {
      const c = draftCopy(locale);
      for (const h of HONOURS) expect(c.honours[h]).toBeTruthy();
      expect(c.leagueName({ id: "iconic", name: "Iconic Clubs" })).toBe(c.iconicName);
      expect(c.leagueName({ id: "pl", name: "Premier League" })).toBe("Premier League");
      expect(c.rules).toHaveLength(4);
    }
  });
});
