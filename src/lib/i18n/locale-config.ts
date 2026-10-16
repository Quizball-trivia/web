export type Locale = "en" | "ka" | "es" | "tr" | "ru";

// Routing and language menus need this small list, not every translated string.
export const LOCALES = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", countryCode: "gb", shortName: "ENG" },
  { code: "ka", name: "Georgian", nativeName: "ქართული", flag: "🇬🇪", countryCode: "ge", shortName: "GEO" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", countryCode: "es", shortName: "ESP" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", countryCode: "tr", shortName: "TUR" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", countryCode: "ru", shortName: "RUS" },
] as const;

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "ka" || value === "es" || value === "tr" || value === "ru";
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (isSupportedLocale(value)) return value;
  if (value?.toLowerCase().startsWith("ka")) return "ka";
  if (value?.toLowerCase().startsWith("es")) return "es";
  if (value?.toLowerCase().startsWith("tr")) return "tr";
  if (value?.toLowerCase().startsWith("ru")) return "ru";
  return "en";
}
