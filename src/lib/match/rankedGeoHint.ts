import type { RankedQueueJoinPayload } from "@/lib/realtime/socket.types";

export const RANKED_GEO_HINT_CACHE_KEY = "ranked_geo_hint_v1";

export type RankedGeoHint = NonNullable<RankedQueueJoinPayload["geoHint"]>;

export function isRankedGeoHint(value: unknown): value is RankedGeoHint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RankedGeoHint>;
  const isMaybeString = (input: unknown) => input === undefined || typeof input === "string";
  const isMaybeNumber = (input: unknown) => input === undefined || typeof input === "number";
  return (
    isMaybeString(candidate.ip) &&
    isMaybeString(candidate.city) &&
    isMaybeString(candidate.region) &&
    isMaybeString(candidate.country) &&
    isMaybeString(candidate.countryCode) &&
    isMaybeNumber(candidate.latitude) &&
    isMaybeNumber(candidate.longitude) &&
    isMaybeString(candidate.timezone) &&
    isMaybeString(candidate.locale) &&
    (candidate.source === undefined ||
      candidate.source === "ip_lookup" ||
      candidate.source === "browser_geolocation" ||
      candidate.source === "client_locale" ||
      candidate.source === "unknown")
  );
}

export function readCachedRankedGeoHint(): RankedGeoHint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RANKED_GEO_HINT_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isRankedGeoHint(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedRankedGeoHint(hint: RankedGeoHint): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RANKED_GEO_HINT_CACHE_KEY, JSON.stringify(hint));
  } catch {
    // Ignore localStorage failures.
  }
}
