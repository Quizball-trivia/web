import type { Locale } from "@/lib/i18n/locale-config";

/** Routing-only constants: safe for client chrome without downloading the SEO copy catalog. */
export const PUBLIC_GAMES_FOLDER: Record<Locale, string> = {
  en: "football-games",
  ka: "football-games",
  es: "juegos-de-futbol",
  tr: "futbol-oyunlari",
};

export const DAILY_COLLECTION_SLUG: Record<Locale, string> = {
  en: "daily-challenges",
  ka: "daily-challenges",
  es: "retos-diarios",
  tr: "gunluk-futbol-gorevleri",
};
