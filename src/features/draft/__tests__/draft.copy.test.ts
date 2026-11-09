import { describe, expect, it } from "vitest";
import { draftCopy } from "../draft.copy";

describe("draft copy", () => {
  it("writes the Georgian first place as an ordinal of its own", () => {
    const ka = draftCopy("ka");
    expect(ka.forecast(1, 80, 60)).toContain("1-ლი");
    expect(ka.forecast(1, 80, 60)).not.toContain("მე-1");
    expect(ka.forecast(3, 70, 10)).toContain("მე-3");
  });
});
