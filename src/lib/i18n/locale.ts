// Locale codes used by URL routing and SEO. messages.ts has a richer LOCALES
// array (with flag/nativeName) for UI rendering — we deliberately keep this
// list as plain strings so callers can iterate them as URL segments.
import { isSupportedLocale, type Locale as AppLocale } from "./locale-config";

export type { AppLocale };

// Site locales: URL segments, SEO pages and the public language picker. Russian
// renders only inside partner views (Freecroco), so it is never a site locale.
export type Locale = Exclude<AppLocale, "ru">;

export function isLocale(value: string | null | undefined): value is Locale {
  return isSupportedLocale(value) && value !== "ru";
}

export function toSiteLocale(locale: AppLocale): Locale {
  return locale === "ru" ? "en" : locale;
}

export const LOCALES = ["en", "ka", "es", "tr"] as const satisfies readonly Locale[];

export const DEFAULT_LOCALE: Locale = "en";

// Strip leading slash and split, take the first segment. Used by the root
// layout (via x-pathname header) to set <html lang> for any URL — including
// non-localized routes (which fall back to DEFAULT_LOCALE).
export function localeFromPathname(pathname: string): Locale {
  const first = pathname.replace(/^\/+/, "").split("/")[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

export function explicitLocaleFromPathname(pathname: string): Locale | undefined {
  const first = pathname.replace(/^\/+/, "").split("/")[0];
  return isLocale(first) ? first : undefined;
}

export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  ka: "ka_GE",
  es: "es_ES",
  tr: "tr_TR",
};

export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  ka: "ka",
  es: "es",
  tr: "tr",
};
