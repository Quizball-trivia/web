import type { Metadata } from "next";
import {
  SITE_NAME,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_PATH,
  SITE_URL,
} from "@/lib/seo/site";
import { DEFAULT_LOCALE, LOCALES, OG_LOCALE, type Locale } from "./locale";

interface LocalizedMetadataInput {
  locale: Locale;
  // Path AFTER the locale segment, e.g. "" for /en, "/about" for /en/about.
  // Leading slash optional (we normalize).
  path: string;
  title: string;
  description: string;
  /**
   * Translated paths (after the locale segment) when the page's URL differs per
   * locale, e.g. { en: "/football-games/auction", es: "/juegos-de-futbol/subasta" }.
   * Locales missing from the map get no alternate: hreflang must only name
   * equivalents that really exist. x-default follows the English entry.
   */
  paths?: Partial<Record<Locale, string>>;
}

// Builds canonical, hreflang, og locale/url for any localized public page.
// Generates absolute URLs (required for hreflang per Google's spec).
export function buildLocalizedMetadata({
  locale,
  path,
  title,
  description,
  paths,
}: LocalizedMetadataInput): Metadata {
  const normalize = (value: string) => (value.startsWith("/") || value === "" ? value : `/${value}`);
  const suffix = normalize(path);
  const canonical = `${SITE_URL}/${locale}${suffix}`;

  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const localized = paths ? paths[l] : suffix;
    if (localized === undefined) continue;
    languages[l] = `${SITE_URL}/${l}${normalize(localized)}`;
  }
  const defaultPath = paths ? paths[DEFAULT_LOCALE] : suffix;
  if (defaultPath !== undefined) languages["x-default"] = `${SITE_URL}/${DEFAULT_LOCALE}${normalize(defaultPath)}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [{
        url: SITE_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: SITE_OG_IMAGE_ALT,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_OG_IMAGE_PATH],
    },
  };
}
