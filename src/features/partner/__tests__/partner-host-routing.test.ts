import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import nextConfig from "../../../../next.config";
import { partnerFromHost, partnerHostPattern } from "../partnerHosts";
import { parseOriginList, partnerParentOrigins } from "../partnerOrigins";

afterEach(() => vi.unstubAllEnvs());

function request(host: string, path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://${host}${path}`, { headers: { host, ...headers } });
}

function frameAncestors(response: Response): string | undefined {
  return response.headers
    .get("content-security-policy")
    ?.split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith("frame-ancestors"));
}

function rewriteTarget(response: Response): URL | null {
  const target = response.headers.get("x-middleware-rewrite");
  return target ? new URL(target) : null;
}

describe("partner host routing", () => {
  it.each(["freecroco.quizball.io", "staging-freecroco.quizball.io"])(
    "moves the launch token on %s into the fragment so no rendered page ever sees it",
    async (host) => {
      const launch = await middleware(request(host, "/?token=abc%2B123&utm_source=fc", { "x-vercel-ip-country": "GE" }));
      expect(launch.status).toBe(307);
      const location = new URL(launch.headers.get("location")!);
      expect(location.host).toBe(host);
      expect(location.pathname).toBe("/");
      expect(location.searchParams.has("token")).toBe(false);
      expect(location.searchParams.get("utm_source")).toBe("fc");
      expect(new URLSearchParams(location.hash.slice(1)).get("token")).toBe("abc+123");
      expect(launch.headers.get("cache-control")).toBe("private, no-store");
      expect(launch.headers.get("referrer-policy")).toBe("no-referrer");

      // The follow-up request (fragments are never sent) renders the home without the geo redirect.
      const page = await middleware(request(host, "/?utm_source=fc", { "x-vercel-ip-country": "GE" }));
      expect(page.status).toBe(200);
      expect(page.headers.get("location")).toBeNull();
      expect(rewriteTarget(page)?.pathname).toBe("/partner/freecroco");
      expect(page.headers.get("x-robots-tag")).toBe("noindex, nofollow");
      expect(page.headers.get("cache-control")).toBe("private, no-store");
      expect(page.headers.get("referrer-policy")).toBe("no-referrer");
    },
  );

  it("rewrites every other path on the partner host, so the Quizball app is unreachable there", async () => {
    for (const [path, internal] of [
      ["/play/ranked", "/partner/freecroco/play/ranked"],
      ["/play", "/partner/freecroco/play"],
      ["/daily", "/partner/freecroco/daily"],
      ["/ka", "/partner/freecroco/ka"],
      ["/partner/other", "/partner/freecroco/partner/other"],
    ]) {
      const response = await middleware(request("freecroco.quizball.io", path));
      expect(response.status, path).toBe(200);
      expect(rewriteTarget(response)?.pathname, path).toBe(internal);
    }
  });

  it("passes namespace links through on the partner host instead of prefixing them twice", async () => {
    const response = await middleware(request("freecroco.quizball.io", "/partner/freecroco/play/countdown"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(rewriteTarget(response)).toBeNull();

    const withToken = await middleware(request("freecroco.quizball.io", "/partner/freecroco?token=abc"));
    expect(withToken.status).toBe(307);
    expect(new URL(withToken.headers.get("location")!).pathname).toBe("/partner/freecroco");
    expect(new URL(withToken.headers.get("location")!).hash).toBe("#token=abc");
  });

  it("serves freecroco.localhost only in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const dev = await middleware(request("freecroco.localhost:3000", "/"));
    expect(rewriteTarget(dev)?.pathname).toBe("/partner/freecroco");

    vi.stubEnv("NODE_ENV", "production");
    const prod = await middleware(request("freecroco.localhost:3000", "/"));
    expect(prod.status).toBe(307);
  });

  it.each(["quizball.io", "www.quizball.io", "staging.quizball.io", "freecroco.quizball.io.evil.test", "quizball-web-example.vercel.app"])(
    "returns 404 for the partner namespace on %s",
    async (host) => {
      for (const path of ["/partner", "/partner/freecroco", "/partner/freecroco/play/ranked", "/%70artner/freecroco"]) {
        const response = await middleware(request(host, path, { "x-forwarded-host": "freecroco.quizball.io" }));
        expect(response.status, `${host}${path}`).toBe(404);
        expect(frameAncestors(response)).toBe("frame-ancestors 'none'");
      }
    },
  );

  it("does not treat lookalike paths as the namespace", async () => {
    const response = await middleware(request("quizball.io", "/partners-program"));
    expect(response.status).toBe(200);
  });
});

describe("partner framing headers", () => {
  it("lets only Freecroco frame the partner host", async () => {
    const response = await middleware(request("freecroco.quizball.io", "/"));
    expect(frameAncestors(response)).toBe("frame-ancestors https://freecroco.com");
  });

  it("adds PARTNER_FRAME_ANCESTORS origins and drops anything that is not a plain origin", async () => {
    vi.stubEnv("PARTNER_FRAME_ANCESTORS", "https://test.freecroco.dev, http://localhost:5173 https://a.test;script-src * http://evil.test javascript:alert(1)");
    const response = await middleware(request("staging-freecroco.quizball.io", "/"));
    expect(frameAncestors(response)).toBe("frame-ancestors https://freecroco.com https://test.freecroco.dev http://localhost:5173");
  });

  it("keeps frame-ancestors 'none' on Quizball hosts", async () => {
    vi.stubEnv("PARTNER_FRAME_ANCESTORS", "https://test.freecroco.dev");
    const response = await middleware(request("quizball.io", "/play"));
    expect(frameAncestors(response)).toBe("frame-ancestors 'none'");
  });

  it("sends X-Frame-Options DENY and the normal Referrer-Policy everywhere except the partner hosts", async () => {
    const rules = (await nextConfig.headers!()).filter((rule) => rule.source === "/:path*");
    const withHeader = (key: string) => rules.filter((rule) => rule.headers.some((header) => header.key === key));

    const [quizball] = withHeader("X-Frame-Options");
    expect(withHeader("X-Frame-Options")).toHaveLength(1);
    expect(quizball.missing).toEqual([{ type: "host", value: partnerHostPattern() }]);
    expect(quizball.has).toBeUndefined();
    expect(quizball.headers).toEqual(
      expect.arrayContaining([
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ]),
    );

    const referrerRules = withHeader("Referrer-Policy");
    expect(referrerRules).toHaveLength(2);
    const partner = referrerRules.find((rule) => rule !== quizball)!;
    expect(partner.has).toEqual([{ type: "host", value: partnerHostPattern() }]);
    expect(partner.headers).toEqual([{ key: "Referrer-Policy", value: "no-referrer" }]);
  });

  it("leaves the normal-site Referrer-Policy to next.config", async () => {
    const response = await middleware(request("quizball.io", "/play"));
    expect(response.headers.get("referrer-policy")).toBeNull();
  });

  it("selects exactly the hosts the middleware treats as partner hosts (CSP and XFO cannot disagree)", () => {
    for (const nodeEnv of ["production", "development"] as const) {
      // Next anchors host conditions and compares them with the hostname, port stripped.
      const xfoSkipped = new RegExp(`^${partnerHostPattern(nodeEnv)}$`);
      for (const host of [
        "freecroco.quizball.io",
        "staging-freecroco.quizball.io",
        "freecroco.localhost",
        "quizball.io",
        "staging.quizball.io",
        "xfreecroco.quizball.io",
        "freecroco.quizball.io.evil.test",
        "freecrocoXquizball.io",
      ]) {
        expect(xfoSkipped.test(host), `${nodeEnv} ${host}`).toBe(partnerFromHost(host, nodeEnv) !== null);
      }
    }
  });
});

describe("partner origins", () => {
  it("parses origin lists strictly", () => {
    expect(parseOriginList(" https://a.test/path , https://a.test http://b.test http://localhost:3000 ftp://c.test nonsense")).toEqual([
      "https://a.test",
      "http://localhost:3000",
    ]);
  });

  it("drops wildcard hosts, so a CSP can only name explicit origins", () => {
    expect(parseOriginList("https://* https://*.example.com https://ok.example.com")).toEqual(["https://ok.example.com"]);
  });

  it("posts to freecroco.com unless the environment configures its parent origins", () => {
    expect(partnerParentOrigins(undefined)).toEqual(["https://freecroco.com"]);
    expect(partnerParentOrigins("https://test.freecroco.dev")).toEqual(["https://test.freecroco.dev"]);
  });
});
