import { describe, expect, it } from "vitest";
import { normalizeCampaignSlug, sanitizePreview, withPreview } from "../campaignQuiz.routes";

describe("normalizeCampaignSlug", () => {
  it("accepts canonical slugs", () => {
    expect(normalizeCampaignSlug("liverpool")).toEqual({ kind: "ok" });
    expect(normalizeCampaignSlug("club-badges-2")).toEqual({ kind: "ok" });
  });
  it("redirects case and whitespace variants of a valid slug", () => {
    expect(normalizeCampaignSlug("Liverpool")).toEqual({ kind: "redirect", slug: "liverpool" });
    expect(normalizeCampaignSlug("Club-Badges ")).toEqual({ kind: "redirect", slug: "club-badges" });
  });
  it("rejects everything else instead of asking the API", () => {
    for (const bad of ["liverpool_quiz", "-liverpool", "liverpool-", "a b", "", "quiz/1", "café", "a".repeat(81), "A".repeat(81)]) expect(normalizeCampaignSlug(bad)).toEqual({ kind: "invalid" });
    expect(normalizeCampaignSlug("a".repeat(80))).toEqual({ kind: "ok" });
  });
  it("keeps the preview token across redirects", () => {
    expect(withPreview("/en/football-quiz/liverpool", "tok en")).toBe("/en/football-quiz/liverpool?preview=tok%20en");
    expect(withPreview("/en/football-quiz/liverpool", undefined)).toBe("/en/football-quiz/liverpool");
  });
  it("ignores preview tokens that are not UUIDs instead of sending them to the API", () => {
    expect(sanitizePreview("00000000-0000-4000-8000-000000000000")).toBe("00000000-0000-4000-8000-000000000000");
    for (const bad of ["seo-audit-16b", "", "x".repeat(40), "00000000-0000-4000-8000-00000000000g"]) expect(sanitizePreview(bad)).toBeUndefined();
    expect(sanitizePreview(undefined)).toBeUndefined();
  });
});
