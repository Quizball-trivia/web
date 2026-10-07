import { request as httpRequest } from "node:http";
import { describe, expect, it } from "vitest";

/**
 * Final HTTP headers and payloads from a built app. Opt-in, because it needs a running server:
 *   npx next build && PARTNER_FRAME_ANCESTORS=https://test.freecroco.dev npx next start -p 3005
 *   PARTNER_E2E_BASE_URL=http://127.0.0.1:3005 npx vitest run partner-built-app
 */
const BASE_URL = process.env.PARTNER_E2E_BASE_URL;
const TOKEN = "e2eLaunchToken7f3c2a";

interface RawResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

// node:http, because fetch refuses to set the Host header the routing depends on.
function get(host: string, path: string, headers: Record<string, string> = {}): Promise<RawResponse> {
  const base = new URL(BASE_URL!);
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { hostname: base.hostname, port: base.port, path, method: "GET", headers: { host, ...headers } },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

const header = (response: RawResponse, name: string) => {
  const value = response.headers[name.toLowerCase()];
  return Array.isArray(value) ? value.join(", ") : value;
};

const frameAncestors = (response: RawResponse) =>
  header(response, "content-security-policy")
    ?.split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith("frame-ancestors"));

describe.skipIf(!BASE_URL)("built app: partner host boundary", () => {
  it.each(["freecroco.quizball.io", "staging-freecroco.quizball.io"])("serves the launch URL on %s framable by Freecroco only", async (host) => {
    const launch = await get(host, `/?token=${TOKEN}`);
    expect(launch.status).toBe(307);
    expect(header(launch, "referrer-policy")).toBe("no-referrer");
    expect(header(launch, "x-frame-options")).toBeUndefined();
    const location = new URL(header(launch, "location")!, `http://${host}`);
    expect(location.hash).toBe(`#token=${TOKEN}`);

    // The browser follows without the fragment.
    const response = await get(host, `${location.pathname}${location.search}`);
    expect(response.status).toBe(200);
    expect(frameAncestors(response)).toMatch(/^frame-ancestors https:\/\/freecroco\.com(?: |$)/);
    expect(header(response, "x-frame-options")).toBeUndefined();
    expect(header(response, "referrer-policy")).toBe("no-referrer");
    expect(header(response, "x-robots-tag")).toContain("noindex");
    expect(response.body).toContain("partner-launch-capture");
  });

  it.each([`/?token=${TOKEN}`, `/partner/freecroco?token=${TOKEN}`, `/play/countdown?token=${TOKEN}`])(
    "never puts the launch token into the HTML or the Flight payload (%s)",
    async (path) => {
      const launch = await get("freecroco.quizball.io", path);
      expect(launch.status).toBe(307);
      const location = new URL(header(launch, "location")!, "http://freecroco.quizball.io");
      const page = `${location.pathname}${location.search}`;
      expect(page).not.toContain(TOKEN);

      const html = await get("freecroco.quizball.io", page);
      expect(html.status).toBe(200);
      expect(html.body).not.toContain(TOKEN);
      const flight = await get("freecroco.quizball.io", page, { RSC: "1" });
      expect(flight.status).toBe(200);
      expect(flight.body).not.toContain(TOKEN);
    },
  );

  it.each([
    ["quizball.io", "/en"],
    ["staging.quizball.io", "/en"],
  ])("keeps %s unframable with the normal referrer policy", async (host, path) => {
    const response = await get(host, path);
    expect(frameAncestors(response)).toBe("frame-ancestors 'none'");
    expect(header(response, "x-frame-options")).toBe("DENY");
    expect(header(response, "referrer-policy")).toBe("strict-origin-when-cross-origin");
  });

  it("returns 404 for the partner namespace on a Quizball host", async () => {
    const response = await get("quizball.io", "/partner/freecroco", { "x-forwarded-host": "freecroco.quizball.io" });
    expect(response.status).toBe(404);
    expect(header(response, "x-frame-options")).toBe("DENY");
  });
});
