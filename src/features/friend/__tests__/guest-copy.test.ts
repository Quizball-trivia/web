import { describe, expect, it } from "vitest";
import { messages } from "@/lib/i18n/messages";

describe("guest lobby copy", () => {
  it("exists in all four locales", () => {
    for (const locale of ["en", "ka", "es", "tr"] as const) {
      const friend = (messages[locale] as { friend: Record<string, string> }).friend;
      for (const key of ["errorGuestLimit", "errorModeRequiresAccount", "errorRateLimited", "errorCapabilityRequired", "guestBadge", "playWithFriend", "guestKeepResults"]) {
        expect(friend[key], `${locale}.friend.${key}`).toBeTruthy();
      }
    }
  });
});
