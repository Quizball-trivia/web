import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { normalizePostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { findPublicGameByModeId, publicGamePath } from "@/lib/seo/public-games";

describe("buscaminas routing", () => {
  it("permanently moves the old Spanish Trivia Mines URL to Buscaminas futbolero, keeping the query", async () => {
    const response = await middleware(new NextRequest("https://quizball.io/es/juegos-de-futbol/minas-de-trivia?utm_source=google"));
    expect(response.status).toBe(308);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/es/juegos-de-futbol/buscaminas-futbolero");
    expect(new URL(response.headers.get("location")!).searchParams.get("utm_source")).toBe("google");
  });

  it("gives both games their Spanish slugs", () => {
    expect(publicGamePath(findPublicGameByModeId("buscaminas")!, "es")).toBe("/es/juegos-de-futbol/buscaminas-futbolero");
    expect(publicGamePath(findPublicGameByModeId("triviaMines")!, "es")).toBe("/es/juegos-de-futbol/minas-con-preguntas");
  });

  it("returns players to the game after signing in from the leaderboard", () => {
    expect(normalizePostAuthRedirect("/buscaminas")).toBe("/buscaminas");
  });
});
