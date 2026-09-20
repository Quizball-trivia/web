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

  it("explicitly clears inherited alternates on non-indexable app routes", () => {
    // Undefined inherits the root layout's canonical in Next.js; only an
    // explicit null clears it. Public pages keep their own locale canonicals.
    expect(APP_ROUTE_METADATA).toHaveProperty("alternates", null);
  });
});
