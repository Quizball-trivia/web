import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";

/** A locale's `friend` namespace, string leaves only (nested groups are not part of this check). */
const friendStrings = (locale: (typeof LOCALES)[number]): Record<string, string> => {
  const friend = (messages[locale] as unknown as { friend?: Record<string, unknown> }).friend ?? {};
  return Object.fromEntries(Object.entries(friend).filter((e): e is [string, string] => typeof e[1] === "string"));
};

/** The exact four Mentalista friend-room keys (literal, so a renamed or dropped key fails here). */
const MENTALISTA_KEYS = ["readyCopyMentalista", "roomTabMentalista", "roomMentalista", "roomMentalistaDescription"] as const;
const DESCRIPTION_KEYS = ["roomMentalistaDescription"] as const;

describe("mentalista friend copy (all eight canonical locales)", () => {
  it("English defines exactly these four Mentalista friend keys", () => {
    const en = friendStrings("en");
    const found = Object.keys(en).filter((k) => /mentalista/i.test(k)).sort();
    expect(found).toEqual([...MENTALISTA_KEYS].sort());
  });

  it("covers exactly the eight canonical locales", () => {
    expect([...LOCALES].sort()).toEqual(["de", "en", "es", "fr", "ka", "pt", "ru", "tr"]);
  });

  it.each([...LOCALES])("%s has every Mentalista friend key, non-empty", (locale) => {
    const friend = friendStrings(locale);
    for (const key of MENTALISTA_KEYS) {
      expect(typeof friend[key], `${locale}.friend.${key}`).toBe("string");
      expect(friend[key].trim().length, `${locale}.friend.${key}`).toBeGreaterThan(0);
    }
  });

  it.each(LOCALES.filter((l) => l !== "en"))("%s Mentalista descriptions are translated, not English", (locale) => {
    const en = friendStrings("en");
    const friend = friendStrings(locale);
    for (const key of DESCRIPTION_KEYS) {
      expect(friend[key], `${locale}.friend.${key}`).not.toBe(en[key]);
    }
  });
});

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
