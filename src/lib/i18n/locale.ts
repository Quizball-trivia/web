// Locale codes used by URL routing and SEO. messages.ts has a richer LOCALES
// array (with flag/nativeName) for UI rendering — we deliberately keep this
// list as plain strings so callers can iterate them as URL segments.
import { isSupportedLocale, type Locale } from "./messages";

export { isSupportedLocale as isLocale, type Locale } from "./messages";

export const LOCALES = ["en", "ka"] as const satisfies readonly Locale[];

export const DEFAULT_LOCALE: Locale = "en";

// Strip leading slash and split, take the first segment. Used by the root
// layout (via x-pathname header) to set <html lang> for any URL — including
// non-localized routes (which fall back to DEFAULT_LOCALE).
export function localeFromPathname(pathname: string): Locale {
  const first = pathname.replace(/^\/+/, "").split("/")[0];
  return isSupportedLocale(first) ? first : DEFAULT_LOCALE;
}

export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  ka: "ka_GE",
};

export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  ka: "ka",
};
