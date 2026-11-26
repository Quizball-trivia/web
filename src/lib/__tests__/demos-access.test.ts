import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { canAccessDemos, gamePreviewFrameAncestors, isGamePreviewPath } from "../demos-access";

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

describe("game previews inside HQ", () => {
  const csp = async (url: string, host: string) => (await middleware(new NextRequest(url, { headers: { host } }))).headers.get("content-security-policy") ?? "";

  it.each(["/demos", "/demos/auction", "/dev/games", "/dev/games/preview"])("lets only the CMS (and the page itself) frame %s on staging", async (path) => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await middleware(new NextRequest(`https://staging.quizball.io${path}`, { headers: { host: "staging.quizball.io" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'self' https://cms.quizball.io https://staging-cms.quizball.io;");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it.each(["quizball.io", "www.quizball.io", "quizball-web-example.vercel.app"])("serves no playground on %s and keeps it unframeable", async (host) => {
    vi.stubEnv("NODE_ENV", "production");
    for (const path of ["/dev/games", "/dev/games/preview"]) {
      const response = await middleware(new NextRequest(`https://${host}${path}`, { headers: { host } }));
      expect(response.status).toBe(404);
      expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    }
  });

  it("keeps every other staging page unframeable, including paths that only look like previews", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const path of ["/play", "/en", "/demosx", "/dev/gamesx", "/dev/leaderboard"]) {
      expect(await csp(`https://staging.quizball.io${path}`, "staging.quizball.io")).toContain("frame-ancestors 'none'");
    }
  });

  it("names local tools only in development", () => {
    expect(gamePreviewFrameAncestors("/dev/games", "localhost:3000", "development")).toBe("'self' https://cms.quizball.io https://staging-cms.quizball.io http://localhost:* http://127.0.0.1:*");
    expect(gamePreviewFrameAncestors("/dev/games", "localhost:3000", "production")).toBeNull();
    expect(gamePreviewFrameAncestors("/play", "staging.quizball.io", "production")).toBeNull();
    expect(isGamePreviewPath("/demos/auction")).toBe(true);
    expect(isGamePreviewPath("/demonstration")).toBe(false);
  });
});
