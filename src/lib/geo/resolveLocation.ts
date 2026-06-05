import type {
  OpponentInfo,
  OpponentGeoPayload,
} from "@/lib/realtime/socket.types";
import type { OpponentLocationCandidate } from "./cities";
import {
  CITY_ALIASES,
  CITY_LOCATION_OVERRIDES,
  COUNTRY_ALIASES,
  COUNTRY_CODE_TO_KEY,
  COUNTRY_LOCATION_FALLBACKS,
} from "./countries";

/**
 * Normalize an OpponentInfo.geo / .location field into a structured
 * geo object — accepts plain objects, rejects strings/null/undefined.
 */
export function getGeoObject(
  value: OpponentInfo["location"] | OpponentInfo["geo"],
): OpponentGeoPayload | null {
  if (!value || typeof value !== "object") return null;
  return value;
}

function normalizeGeoText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function isValidGeoPoint(lon: number | null, lat: number | null): boolean {
  return (
    lon !== null &&
    lat !== null &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -85 &&
    lat <= 85
  );
}

function detectCountryFromCity(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = normalizeGeoText(raw);
  if (!normalized) return null;
  for (const [key, cities] of Object.entries(CITY_ALIASES)) {
    if (cities.some((city) => normalized.includes(normalizeGeoText(city)))) {
      return key;
    }
  }
  return null;
}

function resolveLocationFromCity(
  raw: string | null | undefined,
): OpponentLocationCandidate | null {
  if (!raw) return null;
  const normalized = normalizeGeoText(raw);
  if (!normalized) return null;

  for (const [cityKey, location] of Object.entries(CITY_LOCATION_OVERRIDES)) {
    if (normalized.includes(normalizeGeoText(cityKey))) {
      return location;
    }
  }
  return null;
}

function detectCountryKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (COUNTRY_CODE_TO_KEY[upper]) return COUNTRY_CODE_TO_KEY[upper];
  if (upper.includes("USA") || upper.includes("UNITED STATES")) return "usa";

  // Support mixed formats like "US-CO", "en-US", "Denver, US".
  const codeMatches = upper.match(/\b[A-Z]{2}\b/g);
  if (codeMatches) {
    for (const code of codeMatches) {
      if (COUNTRY_CODE_TO_KEY[code]) return COUNTRY_CODE_TO_KEY[code];
    }
  }

  const cityInferred = detectCountryFromCity(trimmed);
  if (cityInferred) return cityInferred;

  const normalized = normalizeGeoText(trimmed);
  if (!normalized) return null;
  const normalizedSlug = normalized.replace(/\s+/g, "_");
  if (COUNTRY_LOCATION_FALLBACKS[normalizedSlug]) return normalizedSlug;

  for (const [key, aliases] of Object.entries(COUNTRY_ALIASES)) {
    if (
      aliases.some((alias) => {
        const normalizedAlias = normalizeGeoText(alias);
        return normalizedAlias.length > 0 && normalized.includes(normalizedAlias);
      })
    ) {
      return key;
    }
  }
  return null;
}

function resolveCountryFallback(
  countryKey: string | null,
): OpponentLocationCandidate | null {
  if (!countryKey) return null;
  return COUNTRY_LOCATION_FALLBACKS[countryKey] ?? null;
}

/**
 * Map an OpponentInfo payload (possibly with partial/garbled geo data)
 * to a pin-able location on the map. Tries in order:
 *
 *   1. Direct lat/lon coordinates if valid AND consistent with the
 *      detected country (guards against e.g. "country: France, lon:
 *      120, lat: 30" which would drop the pin in China).
 *   2. City-name lookup against CITY_LOCATION_OVERRIDES.
 *   3. Country-slug fallback (any of: country code, country name,
 *      city name, free text in location/username/id).
 *   4. Last-resort safe default (Denver, USA) — never random ocean.
 *
 * Always returns a candidate so the caller can pin something.
 */
export function resolveOpponentLocation(
  opponent: OpponentInfo,
  fallbackCity: string,
  fallbackCountry: string,
): OpponentLocationCandidate {
  const geoObj =
    getGeoObject(opponent.geo) ?? getGeoObject(opponent.location) ?? null;
  const locationText =
    typeof opponent.location === "string"
      ? opponent.location
      : typeof opponent.geo === "string"
        ? opponent.geo
        : "";

  const lat = parseNumber(
    opponent.lat ??
      opponent.latitude ??
      geoObj?.lat ??
      geoObj?.latitude ??
      geoObj?.y,
  );
  const lon = parseNumber(
    opponent.lon ??
      opponent.longitude ??
      opponent.lng ??
      opponent.long ??
      geoObj?.lon ??
      geoObj?.lng ??
      geoObj?.long ??
      geoObj?.longitude ??
      geoObj?.x,
  );
  const cityHint =
    opponent.city?.trim() ||
    geoObj?.city?.trim() ||
    geoObj?.cityName?.trim() ||
    geoObj?.regionName?.trim() ||
    geoObj?.region?.trim() ||
    "";
  const countryHint =
    opponent.country?.trim() ||
    geoObj?.country?.trim() ||
    geoObj?.countryName?.trim() ||
    geoObj?.country_name?.trim() ||
    "";
  const countryCodeHint =
    opponent.countryCode?.trim() ||
    geoObj?.countryCode?.trim() ||
    geoObj?.country_code?.trim() ||
    "";
  const countryKey =
    detectCountryKey(countryCodeHint) ??
    detectCountryKey(countryHint) ??
    detectCountryKey(cityHint) ??
    detectCountryKey(locationText) ??
    detectCountryKey(opponent.username) ??
    detectCountryKey(opponent.id);
  const countryFallback = resolveCountryFallback(countryKey);
  const cityFallback = resolveLocationFromCity(
    `${cityHint} ${countryHint} ${locationText}`.trim(),
  );
  const geoFlag = geoObj?.flag?.trim() ?? "";
  const resolvedCity =
    cityHint || cityFallback?.city || countryFallback?.city || fallbackCity;
  const resolvedCountry =
    countryHint ||
    cityFallback?.country ||
    countryFallback?.country ||
    fallbackCountry;
  const resolvedFlag =
    opponent.flag?.trim() ||
    geoFlag ||
    cityFallback?.flag ||
    countryFallback?.flag ||
    "🏳️";

  if (lon !== null && lat !== null && isValidGeoPoint(lon, lat)) {
    if (cityFallback) {
      const lonDelta = Math.abs(lon - cityFallback.lon);
      const latDelta = Math.abs(lat - cityFallback.lat);
      if (lonDelta > 45 || latDelta > 30) {
        return {
          ...cityFallback,
          source: "city_guard_fallback",
          countryKey,
          cityHint,
          countryHint,
          countryCodeHint,
        };
      }
      return {
        ...cityFallback,
        source: "city_display_safe",
        countryKey,
        cityHint,
        countryHint,
        countryCodeHint,
      };
    } else if (countryFallback) {
      const lonDelta = Math.abs(lon - countryFallback.lon);
      const latDelta = Math.abs(lat - countryFallback.lat);
      // Guard against obviously wrong geo points for the detected country.
      if (lonDelta > 35 || latDelta > 25) {
        return {
          ...countryFallback,
          source: "country_guard_fallback",
          countryKey,
          cityHint,
          countryHint,
          countryCodeHint,
        };
      }
    }

    return {
      lon,
      lat,
      city: resolvedCity,
      country: resolvedCountry,
      flag: resolvedFlag,
      source: "geo_coords",
      countryKey,
      cityHint,
      countryHint,
      countryCodeHint,
    };
  }

  if (cityFallback) {
    return {
      ...cityFallback,
      source: "city_override_fallback",
      countryKey,
      cityHint,
      countryHint,
      countryCodeHint,
    };
  }
  if (countryFallback) {
    return {
      ...countryFallback,
      source: "country_fallback",
      countryKey,
      cityHint,
      countryHint,
      countryCodeHint,
    };
  }
  // Last-resort safe fallback: keep zoom on known US inland landmass (never random ocean/continent).
  return {
    ...COUNTRY_LOCATION_FALLBACKS.usa,
    source: "safe_default_fallback",
    countryKey,
    cityHint,
    countryHint,
    countryCodeHint,
  };
}
