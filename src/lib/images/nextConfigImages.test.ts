import { describe, expect, it } from "vitest";

import nextConfig from "../../../next.config";

/**
 * The optimizer rejects any origin URL not covered by `remotePatterns` with a
 * 400 INVALID_IMAGE_OPTIMIZE_REQUEST — and it fails at request time, not build
 * time, so a missing pattern ships green and breaks every image in production.
 * That happened once already on this branch's preview deploy.
 */
describe("next.config images.remotePatterns", () => {
  const patterns = nextConfig.images?.remotePatterns ?? [];

  it("allows the Supabase transform endpoint that remoteImage.ts rewrites to", () => {
    expect(
      patterns.some(
        (p) =>
          typeof p === "object" &&
          p.protocol === "https" &&
          p.hostname === "*.supabase.co" &&
          p.pathname === "/storage/v1/render/image/public/**",
      ),
    ).toBe(true);
  });

  it("still allows raw public objects for oversized-source fallback", () => {
    expect(
      patterns.some(
        (p) =>
          typeof p === "object" &&
          p.protocol === "https" &&
          p.hostname === "*.supabase.co" &&
          p.pathname === "/storage/v1/object/public/**",
      ),
    ).toBe(true);
  });

  it("whitelists the quality remoteImage.ts requests", () => {
    // getImageProps emits q=70; an unlisted quality is also a 400.
    expect(nextConfig.images?.qualities).toContain(70);
  });
});
