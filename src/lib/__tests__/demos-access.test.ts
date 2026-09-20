import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { canAccessDemos } from "../demos-access";

afterEach(() => vi.unstubAllEnvs());

describe("staging-only demo routes", () => {
  it.each(["/demos", "/demos/auction", "/demos/mini-football-grid"])("serves %s on staging with noindex", async (path) => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await middleware(new NextRequest(`https://staging.quizball.io${path}`, { headers: { host: "staging.quizball.io" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each(["quizball.io", "www.quizball.io", "quizball-web-example.vercel.app", "staging.quizball.io.evil.test"])("blocks the hub and direct mode links on %s", async (host) => {
    for (const path of ["/demos", "/demos/auction"]) {
      const response = await middleware(new NextRequest(`https://${host}${path}`, { headers: { host, "x-forwarded-host": "staging.quizball.io" } }));
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not found");
    }
  });

  it("allows local development but fails closed for missing hosts and local production builds", () => {
    expect(canAccessDemos("localhost:3000", "development")).toBe(true);
    expect(canAccessDemos("127.0.0.1:3000", "development")).toBe(true);
    expect(canAccessDemos("localhost:3000", "production")).toBe(false);
    expect(canAccessDemos(null, "development")).toBe(false);
  });
});
