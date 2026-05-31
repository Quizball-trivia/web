import { describe, expect, it } from "vitest";
import { APP_ROUTE_METADATA } from "../app-routes";

describe("APP_ROUTE_METADATA", () => {
  it("marks app/runtime routes as noindex, nofollow", () => {
    expect(APP_ROUTE_METADATA.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  it("also tells Googlebot specifically not to index or follow", () => {
    const robots = APP_ROUTE_METADATA.robots;
    expect(robots).not.toBeNull();
    expect(typeof robots).toBe("object");
    const googleBot = (robots as { googleBot?: { index?: boolean; follow?: boolean } }).googleBot;
    expect(googleBot).toMatchObject({ index: false, follow: false });
  });

  it("does not pin a canonical (each app route is non-indexable, not a homepage duplicate)", () => {
    // The bug we fixed was app pages inheriting the root layout's
    // `canonical: "/"`. We deliberately set NO canonical here: a noindex page
    // has no business asserting a canonical, and leaving it unset stops the
    // "/play canonical = /" duplicate-content signal.
    expect(APP_ROUTE_METADATA.alternates?.canonical).toBeUndefined();
  });
});
