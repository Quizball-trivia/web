import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { DEFAULT_LOCALE, LOCALES, OG_LOCALE, type Locale } from "./locale";

interface LocalizedMetadataInput {
  locale: Locale;
  // Path AFTER the locale segment, e.g. "" for /en, "/about" for /en/about.
  // Leading slash optional (we normalize).
  path: string;
  title: string;
  description: string;
}

// Builds canonical, hreflang, og locale/url for any localized public page.
// Generates absolute URLs (required for hreflang per Google's spec).
export function buildLocalizedMetadata({
  locale,
  path,
  title,
  description,
}: LocalizedMetadataInput): Metadata {
  const suffix = path.startsWith("/") || path === "" ? path : `/${path}`;
  const canonical = `${SITE_URL}/${locale}${suffix}`;

  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `${SITE_URL}/${l}${suffix}`;
  }
  languages["x-default"] = `${SITE_URL}/${DEFAULT_LOCALE}${suffix}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
    },
    twitter: {
      title,
      description,
    },
  };
}
