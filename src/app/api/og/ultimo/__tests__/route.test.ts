// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const get = (code: string) => GET(new NextRequest(`https://quizball.io/api/og/ultimo?c=${encodeURIComponent(code)}`));

describe("Último en pie OG result card", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-05T15:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  it("renders a 1200x630 image for a valid code", async () => {
    const response = await get("ue-2-40-cgsnc-es");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    expect(response.headers.get("cache-control")).toContain("immutable");
  });

  it("falls back to the site image for a code that cannot exist", async () => {
    const response = await get("ue-2-999-cgsnc-es");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/");
  });
});
