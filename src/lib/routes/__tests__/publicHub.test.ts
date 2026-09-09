import { describe, expect, it } from "vitest";
import { hubLocaleOf, isGuestAllowedPath, isPlaySurface, isPublicGamePath, publicLocaleOf } from "../publicHub";

describe("public hub paths", () => {
  it("recognises the locale hubs exactly", () => {
    expect(hubLocaleOf("/en")).toBe("en");
    expect(hubLocaleOf("/ka/")).toBe("ka");
    expect(hubLocaleOf("/en/about")).toBeNull();
    expect(hubLocaleOf("/fr")).toBeNull();
  });
  it("recognises public game pages by their locale folder only", () => {
    expect(isPublicGamePath("/en/football-games/auction")).toBe(true);
    expect(isPublicGamePath("/es/juegos-de-futbol/subasta")).toBe(true);
    expect(isPublicGamePath("/es/football-games/auction")).toBe(false);
    expect(isPublicGamePath("/en/football-quiz/x")).toBe(false);
    expect(publicLocaleOf("/ka/football-games/daily-challenges")).toBe("ka");
    expect(publicLocaleOf("/leaderboard")).toBeNull();
  });
  it("lets guests through only on the public surface, Play and the read-only leaderboard", () => {
    for (const p of ["/", "/play", "/en", "/es/juegos-de-futbol/subasta", "/leaderboard", "/events", "/weekend-league"]) expect(isGuestAllowedPath(p)).toBe(true);
    for (const p of ["/play/friend", "/en/about", "/en/privacy", "/store", "/profile", "/leaderboard/x", "/social", "/events/x"]) expect(isGuestAllowedPath(p)).toBe(false);
  });
  it("highlights Play on the hub and game pages", () => {
    expect(isPlaySurface("/en")).toBe(true);
    expect(isPlaySurface("/en/football-games/auction")).toBe(true);
    expect(isPlaySurface("/leaderboard")).toBe(false);
  });
});
