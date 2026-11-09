import { describe, expect, it } from "vitest";
import { d501Copy } from "../d501.copy";

describe("the bust line both players read", () => {
  it.each([
    ["fr", /\b(te|tu|ton|ta)\b/iu],
    ["es", /\b(te|tu|pasaste)\b/iu],
    ["tr", /\bseni\b/iu],
    ["ka", /გცდება/u],
  ])("does not address the reader in %s", (locale, addressed) => {
    const line = d501Copy(locale).bust("Jean Lambert", 40);
    expect(line).toContain("Jean Lambert");
    expect(line).not.toMatch(addressed);
  });
});
