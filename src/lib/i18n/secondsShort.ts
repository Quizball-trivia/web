import type { Locale } from "./locale";

const UNIT: Partial<Record<Locale, string>> = { ka: "წმ", tr: "sn", ru: "с" };

/** A clock's seconds in the player's language ("12 s", "12 с"). */
export const secondsShort = (seconds: number, locale: Locale): string => `${seconds} ${UNIT[locale] ?? "s"}`;
