import { describe, expect, it, vi } from "vitest";

const flags = vi.hoisted(() => ({ enabled: false }));
vi.mock("@/lib/config", () => ({ API_BASE_URL: "http://api.test", get GUEST_LOBBIES_ENABLED() { return flags.enabled; } }));
const { isGuestAllowedPath, isGuestLobbyPath } = await import("../publicHub");

describe("guest lobby paths", () => {
  it("are closed to guests while the feature is off, open when it is on", () => {
    for (const path of ["/play/friend", "/friend/room/ABC123", "/auction", "/tic-tac-toe", "/game"]) {
      expect(isGuestLobbyPath(path), path).toBe(true);
      expect(isGuestAllowedPath(path), `${path} off`).toBe(false);
    }
    flags.enabled = true;
    for (const path of ["/play/friend", "/friend/room/ABC123", "/auction", "/tic-tac-toe", "/game"]) {
      expect(isGuestAllowedPath(path), `${path} on`).toBe(true);
    }
    // Never guest surfaces, flag or not.
    for (const path of ["/profile", "/store", "/settings", "/weekend-league/enter"]) expect(isGuestAllowedPath(path), path).toBe(false);
    flags.enabled = false;
  });
});
