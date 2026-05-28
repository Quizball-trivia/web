import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// robots.ts reads IS_PRODUCTION_DEPLOYMENT (VERCEL_ENV === "production") at
// module load, so we set the env then dynamically import a fresh module copy
// per case.
async function loadRobots(vercelEnv: string | undefined) {
  vi.resetModules();
  if (vercelEnv === undefined) {
    delete process.env.VERCEL_ENV;
  } else {
    process.env.VERCEL_ENV = vercelEnv;
  }
  const mod = await import("../robots");
  return mod.default();
}

describe("robots.ts", () => {
  const original = process.env.VERCEL_ENV;
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    if (original === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = original;
  });

  it("blocks all crawling on non-production (preview/local) deploys", async () => {
    const robots = await loadRobots("preview");
    expect(robots.rules).toEqual([{ userAgent: "*", disallow: "/" }]);
    expect(robots.sitemap).toBeUndefined();
  });

  it("allows crawling and disallows only never-crawl paths in production", async () => {
    const robots = await loadRobots("production");
    const rule = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    expect(rule).toMatchObject({ userAgent: "*", allow: "/" });
    expect(rule?.disallow).toEqual(["/dev/", "/api/", "/auth/", "/onboarding/", "/game"]);
  });

  it("does NOT disallow noindexed app pages — they must stay crawlable so Google sees the noindex", async () => {
    const robots = await loadRobots("production");
    const rule = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    const disallow = (rule?.disallow ?? []) as string[];
    for (const path of ["/profile/", "/settings/", "/play", "/leaderboard", "/store"]) {
      expect(disallow).not.toContain(path);
    }
  });

  it("exposes the sitemap in production", async () => {
    const robots = await loadRobots("production");
    expect(robots.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
