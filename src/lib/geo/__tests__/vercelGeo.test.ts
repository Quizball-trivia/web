import { describe, expect, it } from "vitest";
import { isGeoOverrideAllowed, normalizeCountryCode, resolveGeo } from "../vercelGeo";

describe("vercel geo resolver", () => {
  it("normalizes valid country codes and rejects invalid values", () => {
    expect(normalizeCountryCode(" ge ")).toBe("GE");
    expect(normalizeCountryCode("USA")).toBeNull();
    expect(normalizeCountryCode("XX")).toBeNull();
    expect(normalizeCountryCode("1G")).toBeNull();
    expect(normalizeCountryCode(null)).toBeNull();
  });

  it("uses the Vercel country header when no override is present", () => {
    expect(
      resolveGeo({
        headerCountry: "GE",
        host: "staging.quizball.io",
        vercelEnv: "preview",
      }),
    ).toMatchObject({
      countryCode: "GE",
      isGeorgia: true,
      source: "header",
    });
  });

  it("allows query overrides on staging and preview targets", () => {
    expect(
      resolveGeo({
        headerCountry: "US",
        overrideCountry: "GE",
        host: "staging.quizball.io",
        vercelEnv: "preview",
      }),
    ).toMatchObject({
      countryCode: "GE",
      isGeorgia: true,
      source: "override",
    });
  });

  it("does not allow query overrides in production", () => {
    expect(
      resolveGeo({
        headerCountry: "US",
        overrideCountry: "GE",
        host: "quizball.io",
        vercelEnv: "production",
      }),
    ).toMatchObject({
      countryCode: "US",
      isGeorgia: false,
      source: "header",
    });
  });


  it("treats unknown countries as ineligible", () => {
    expect(resolveGeo({ host: "staging.quizball.io", vercelEnv: "preview" })).toMatchObject({
      countryCode: null,
      isGeorgia: false,
      source: "unknown",
    });
  });

  it("allows local overrides but blocks canonical production hosts", () => {
    expect(isGeoOverrideAllowed({ host: "localhost:3000", nodeEnv: "development" })).toBe(true);
    expect(isGeoOverrideAllowed({ host: "www.quizball.io", vercelEnv: "preview" })).toBe(false);
  });
});
