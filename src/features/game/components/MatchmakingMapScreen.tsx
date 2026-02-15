"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, animate } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import type { OpponentInfo, OpponentGeoPayload } from "@/lib/realtime/socket.types";
import type { AvatarCustomization } from "@/types/game";
import { avatarSeeds, getDiceBearAvatarUrl } from "@/lib/avatars";
import { logger } from "@/utils/logger";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldTopo from "world-atlas/land-110m.json";

// ── Types ──

export interface MatchmakingDebugInfo {
  socketConnected: boolean;
  socketId: string | null;
  sessionState: string;
  activeMatchId: string | null;
  waitingLobbyId: string | null;
  queueSearchId: string | null;
  rankedSearching: boolean;
  rankedSearchStartedAt: number | null;
  rankedSearchDurationMs: number | null;
  hasLobby: boolean;
  hasMatch: boolean;
  errorCode: string | null;
}

interface MatchmakingMapScreenProps {
  matchType: "ranked" | "friendly";
  rankedSearchDurationMs?: number | null;
  rankedSearchStartedAt?: number | null;
  rankedFoundOpponent?: OpponentInfo | null;
  selfUsername?: string;
  selfAvatarCustomization?: AvatarCustomization | null;
  debugInfo?: MatchmakingDebugInfo;
  onCancel: () => void;
}

// ── Mercator projection ──

const MAP_W = 1000;
const MAP_H = 600;
const MOBILE_BREAKPOINT = 768;
const GEO_HINT_CACHE_KEY = "ranked_geo_hint_v1";

interface CachedGeoHint {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
}

function isCachedGeoHint(value: unknown): value is CachedGeoHint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CachedGeoHint>;
  const isMaybeNumber = (v: unknown) => v === undefined || typeof v === "number";
  const isMaybeString = (v: unknown) => v === undefined || typeof v === "string";
  return (
    isMaybeString(candidate.city) &&
    isMaybeString(candidate.region) &&
    isMaybeString(candidate.country) &&
    isMaybeString(candidate.countryCode) &&
    isMaybeNumber(candidate.latitude) &&
    isMaybeNumber(candidate.longitude) &&
    isMaybeString(candidate.source)
  );
}

function readCachedGeoHint(): CachedGeoHint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GEO_HINT_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCachedGeoHint(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function mercatorX(lon: number): number {
  return ((lon + 180) / 360) * MAP_W;
}

function mercatorY(lat: number): number {
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const clampedMercN = Math.max(-3.0, Math.min(3.0, mercN));
  return MAP_H / 2 - (MAP_W * clampedMercN) / (2 * Math.PI);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function projectCoords(coords: number[][]): string {
  return (
    coords
      .map(([lon, lat], i) => {
        const x = mercatorX(lon);
        const y = mercatorY(lat);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

// ── Convert TopoJSON → SVG paths (computed once) ──

function buildMapPaths(): string[] {
  const topo = worldTopo as unknown as Topology;
  const landGeo = feature(topo, topo.objects.land as GeometryCollection);
  const paths: string[] = [];
  for (const feat of landGeo.features) {
    const geom = feat.geometry;
    if (geom.type === "Polygon") {
      for (const ring of geom.coordinates) {
        paths.push(projectCoords(ring as number[][]));
      }
    } else if (geom.type === "MultiPolygon") {
      for (const polygon of geom.coordinates) {
        for (const ring of polygon) {
          paths.push(projectCoords(ring as number[][]));
        }
      }
    }
  }
  return paths;
}

let _cachedPaths: string[] | null = null;
function getMapPaths(): string[] {
  if (!_cachedPaths) _cachedPaths = buildMapPaths();
  return _cachedPaths;
}

// ── Pin colors ──

const PIN_COLORS = [
  "#58CC02", "#1CB0F6", "#FF4B4B", "#FF9600", "#CE82FF",
  "#FFD700", "#FF6B9D", "#00D4AA", "#FF8C42", "#7B68EE",
  "#20B2AA", "#FF69B4", "#4ECDC4", "#FF6347", "#9370DB",
] as const;

// ── Fake online players with real-world lat/lon + country ──

interface FakePlayer {
  id: number;
  lon: number;
  lat: number;
  x: number;
  y: number;
  color: string;
  avatarUrl: string;
  name: string;
  flag: string;
  city: string;
  country: string;
  delay: number;
  source?: string;
}

interface OpponentLocationCandidate {
  lon: number;
  lat: number;
  city: string;
  country: string;
  flag: string;
  source?: string;
  countryKey?: string | null;
  cityHint?: string;
  countryHint?: string;
  countryCodeHint?: string;
}

const CITY_DATA: { lon: number; lat: number; city: string; country: string; flag: string; name: string }[] = [
  { lon: -104.99, lat: 39.74, city: "Denver", country: "USA", flag: "🇺🇸", name: "Alex" },
  { lon: -99.1, lat: 19.4, city: "Mexico City", country: "Mexico", flag: "🇲🇽", name: "Carlos" },
  { lon: -47.88, lat: -15.79, city: "Brasilia", country: "Brazil", flag: "🇧🇷", name: "Lucas" },
  { lon: -1.9, lat: 52.5, city: "Birmingham", country: "UK", flag: "🇬🇧", name: "James" },
  { lon: 4.83, lat: 45.76, city: "Lyon", country: "France", flag: "🇫🇷", name: "Louis" },
  { lon: 11.58, lat: 48.14, city: "Munich", country: "Germany", flag: "🇩🇪", name: "Max" },
  { lon: 32.86, lat: 39.93, city: "Ankara", country: "Turkey", flag: "🇹🇷", name: "Emre" },
  { lon: 46.71, lat: 24.71, city: "Riyadh", country: "Saudi Arabia", flag: "🇸🇦", name: "Omar" },
  { lon: 77.21, lat: 28.61, city: "Delhi", country: "India", flag: "🇮🇳", name: "Arjun" },
  { lon: 98.98, lat: 18.79, city: "Chiang Mai", country: "Thailand", flag: "🇹🇭", name: "Niran" },
  { lon: 104.06, lat: 30.67, city: "Chengdu", country: "China", flag: "🇨🇳", name: "Wei" },
  { lon: 141.35, lat: 43.06, city: "Sapporo", country: "Japan", flag: "🇯🇵", name: "Yuki" },
  { lon: 133.88, lat: -23.7, city: "Alice Springs", country: "Australia", flag: "🇦🇺", name: "Liam" },
  { lon: 36.82, lat: -1.29, city: "Nairobi", country: "Kenya", flag: "🇰🇪", name: "Kofi" },
  { lon: 7.49, lat: 9.06, city: "Abuja", country: "Nigeria", flag: "🇳🇬", name: "Chidi" },
];

const COUNTRY_LOCATION_FALLBACKS: Record<string, OpponentLocationCandidate> = {
  usa: { lon: -104.99, lat: 39.74, city: "Denver", country: "USA", flag: "🇺🇸" },
  mexico: { lon: -99.1, lat: 19.4, city: "Mexico City", country: "Mexico", flag: "🇲🇽" },
  brazil: { lon: -47.88, lat: -15.79, city: "Brasilia", country: "Brazil", flag: "🇧🇷" },
  uk: { lon: -1.9, lat: 52.5, city: "Birmingham", country: "UK", flag: "🇬🇧" },
  france: { lon: 4.83, lat: 45.76, city: "Lyon", country: "France", flag: "🇫🇷" },
  germany: { lon: 11.58, lat: 48.14, city: "Munich", country: "Germany", flag: "🇩🇪" },
  turkey: { lon: 32.86, lat: 39.93, city: "Ankara", country: "Turkey", flag: "🇹🇷" },
  saudi_arabia: { lon: 46.71, lat: 24.71, city: "Riyadh", country: "Saudi Arabia", flag: "🇸🇦" },
  india: { lon: 77.21, lat: 28.61, city: "Delhi", country: "India", flag: "🇮🇳" },
  thailand: { lon: 98.98, lat: 18.79, city: "Chiang Mai", country: "Thailand", flag: "🇹🇭" },
  china: { lon: 104.06, lat: 30.67, city: "Chengdu", country: "China", flag: "🇨🇳" },
  japan: { lon: 141.35, lat: 43.06, city: "Sapporo", country: "Japan", flag: "🇯🇵" },
  australia: { lon: 133.88, lat: -23.7, city: "Alice Springs", country: "Australia", flag: "🇦🇺" },
  kenya: { lon: 36.82, lat: -1.29, city: "Nairobi", country: "Kenya", flag: "🇰🇪" },
  nigeria: { lon: 7.49, lat: 9.06, city: "Abuja", country: "Nigeria", flag: "🇳🇬" },
  argentina: { lon: -64.19, lat: -31.42, city: "Cordoba", country: "Argentina", flag: "🇦🇷" },
  spain: { lon: -3.7, lat: 40.42, city: "Madrid", country: "Spain", flag: "🇪🇸" },
  italy: { lon: 12.5, lat: 41.9, city: "Rome", country: "Italy", flag: "🇮🇹" },
  portugal: { lon: -8.62, lat: 41.16, city: "Porto", country: "Portugal", flag: "🇵🇹" },
  netherlands: { lon: 5.12, lat: 52.09, city: "Utrecht", country: "Netherlands", flag: "🇳🇱" },
  russia: { lon: 37.62, lat: 55.75, city: "Moscow", country: "Russia", flag: "🇷🇺" },
  canada: { lon: -113.49, lat: 53.55, city: "Edmonton", country: "Canada", flag: "🇨🇦" },
};

const COUNTRY_CODE_TO_KEY: Record<string, string> = {
  US: "usa",
  MX: "mexico",
  BR: "brazil",
  GB: "uk",
  UK: "uk",
  FR: "france",
  DE: "germany",
  TR: "turkey",
  SA: "saudi_arabia",
  IN: "india",
  TH: "thailand",
  CN: "china",
  JP: "japan",
  AU: "australia",
  KE: "kenya",
  NG: "nigeria",
  AR: "argentina",
  ES: "spain",
  IT: "italy",
  PT: "portugal",
  NL: "netherlands",
  RU: "russia",
  CA: "canada",
};

const COUNTRY_ALIASES: Record<string, string[]> = {
  usa: ["usa", "united states", "united states of america", "america", "u s a", "🇺🇸"],
  mexico: ["mexico", "mexican", "🇲🇽"],
  brazil: ["brazil", "brasil", "🇧🇷"],
  uk: ["uk", "united kingdom", "britain", "england", "🇬🇧"],
  france: ["france", "french", "🇫🇷"],
  germany: ["germany", "german", "deutschland", "🇩🇪"],
  turkey: ["turkey", "turkiye", "🇹🇷"],
  saudi_arabia: ["saudi", "saudi arabia", "🇸🇦"],
  india: ["india", "indian", "🇮🇳"],
  thailand: ["thailand", "thai", "🇹🇭"],
  china: ["china", "chinese", "🇨🇳"],
  japan: ["japan", "japanese", "🇯🇵"],
  australia: ["australia", "australian", "🇦🇺"],
  kenya: ["kenya", "kenyan", "🇰🇪"],
  nigeria: ["nigeria", "nigerian", "🇳🇬"],
  argentina: ["argentina", "argentinian", "🇦🇷"],
  spain: ["spain", "spanish", "espana", "🇪🇸"],
  italy: ["italy", "italian", "italia", "🇮🇹"],
  portugal: ["portugal", "portuguese", "🇵🇹"],
  netherlands: ["netherlands", "dutch", "holland", "🇳🇱"],
  russia: ["russia", "russian", "🇷🇺"],
  canada: ["canada", "canadian", "🇨🇦"],
};

const CITY_ALIASES: Record<string, string[]> = {
  usa: ["new york", "nyc", "denver", "chicago", "los angeles", "miami", "seattle", "dallas", "houston", "phoenix", "atlanta", "boston"],
  mexico: ["mexico city", "guadalajara", "monterrey"],
  brazil: ["brasilia", "sao paulo", "rio de janeiro", "rio"],
  uk: ["london", "birmingham", "manchester", "liverpool"],
  france: ["paris", "lyon", "marseille"],
  germany: ["munich", "berlin", "hamburg", "frankfurt"],
  turkey: ["ankara", "istanbul"],
  saudi_arabia: ["riyadh", "jeddah"],
  india: ["delhi", "mumbai", "bangalore", "bengaluru"],
  thailand: ["chiang mai", "bangkok"],
  china: ["chengdu", "beijing", "shanghai", "guangzhou"],
  japan: ["sapporo", "tokyo", "osaka"],
  australia: ["alice springs", "sydney", "melbourne", "perth"],
  kenya: ["nairobi"],
  nigeria: ["abuja", "lagos"],
  argentina: ["cordoba", "buenos aires"],
  spain: ["madrid", "barcelona", "valencia"],
  italy: ["rome", "milan", "naples"],
  portugal: ["porto", "lisbon"],
  netherlands: ["utrecht", "amsterdam", "rotterdam"],
  russia: ["moscow", "saint petersburg"],
  canada: ["edmonton", "toronto", "vancouver", "montreal"],
};

const CITY_LOCATION_OVERRIDES: Record<string, OpponentLocationCandidate> = {
  "new york": { lon: -74.0, lat: 40.71, city: "New York", country: "USA", flag: "🇺🇸" },
  denver: { lon: -104.99, lat: 39.74, city: "Denver", country: "USA", flag: "🇺🇸" },
  chicago: { lon: -87.63, lat: 41.88, city: "Chicago", country: "USA", flag: "🇺🇸" },
  "los angeles": { lon: -118.24, lat: 34.05, city: "Los Angeles", country: "USA", flag: "🇺🇸" },
  "mexico city": { lon: -99.1, lat: 19.4, city: "Mexico City", country: "Mexico", flag: "🇲🇽" },
  brasilia: { lon: -47.88, lat: -15.79, city: "Brasilia", country: "Brazil", flag: "🇧🇷" },
  birmingham: { lon: -1.9, lat: 52.5, city: "Birmingham", country: "UK", flag: "🇬🇧" },
  lyon: { lon: 4.83, lat: 45.76, city: "Lyon", country: "France", flag: "🇫🇷" },
  munich: { lon: 11.58, lat: 48.14, city: "Munich", country: "Germany", flag: "🇩🇪" },
  ankara: { lon: 32.86, lat: 39.93, city: "Ankara", country: "Turkey", flag: "🇹🇷" },
  riyadh: { lon: 46.71, lat: 24.71, city: "Riyadh", country: "Saudi Arabia", flag: "🇸🇦" },
  delhi: { lon: 77.21, lat: 28.61, city: "Delhi", country: "India", flag: "🇮🇳" },
  "chiang mai": { lon: 98.98, lat: 18.79, city: "Chiang Mai", country: "Thailand", flag: "🇹🇭" },
  chengdu: { lon: 104.06, lat: 30.67, city: "Chengdu", country: "China", flag: "🇨🇳" },
  sapporo: { lon: 141.35, lat: 43.06, city: "Sapporo", country: "Japan", flag: "🇯🇵" },
  nairobi: { lon: 36.82, lat: -1.29, city: "Nairobi", country: "Kenya", flag: "🇰🇪" },
  abuja: { lon: 7.49, lat: 9.06, city: "Abuja", country: "Nigeria", flag: "🇳🇬" },
  moscow: { lon: 37.62, lat: 55.75, city: "Moscow", country: "Russia", flag: "🇷🇺" },
};

function getGeoObject(
  value: OpponentInfo["location"] | OpponentInfo["geo"]
): OpponentGeoPayload | null {
  if (!value || typeof value !== "object") return null;
  return value;
}

function normalizeGeoText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
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
  return lon !== null && lat !== null && lon >= -180 && lon <= 180 && lat >= -85 && lat <= 85;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
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

function resolveLocationFromCity(raw: string | null | undefined): OpponentLocationCandidate | null {
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

  for (const [key, aliases] of Object.entries(COUNTRY_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(normalizeGeoText(alias)))) {
      return key;
    }
  }
  return null;
}

function resolveCountryFallback(countryKey: string | null): OpponentLocationCandidate | null {
  if (!countryKey) return null;
  return COUNTRY_LOCATION_FALLBACKS[countryKey] ?? null;
}

function resolveOpponentLocation(
  opponent: OpponentInfo
): OpponentLocationCandidate {
  const geoObj = getGeoObject(opponent.geo) ?? getGeoObject(opponent.location) ?? null;
  const locationText = typeof opponent.location === "string"
    ? opponent.location
    : typeof opponent.geo === "string"
      ? opponent.geo
      : "";

  const lat = parseNumber(
    opponent.lat ??
      opponent.latitude ??
      geoObj?.lat ??
      geoObj?.latitude ??
      geoObj?.y
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
      geoObj?.x
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
  const cityFallback = resolveLocationFromCity(`${cityHint} ${locationText}`.trim());
  const geoFlag = geoObj?.flag?.trim() ?? "";
  const resolvedCity = cityHint || cityFallback?.city || countryFallback?.city || "Unknown city";
  const resolvedCountry = countryHint || cityFallback?.country || countryFallback?.country || "Unknown country";
  const resolvedFlag = opponent.flag?.trim() || geoFlag || cityFallback?.flag || countryFallback?.flag || "🏳️";

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

function generateFakePlayers(): FakePlayer[] {
  return CITY_DATA.map((c, i) => ({
    id: i,
    lon: c.lon,
    lat: c.lat,
    x: mercatorX(c.lon),
    y: mercatorY(c.lat),
    color: PIN_COLORS[i % PIN_COLORS.length],
    avatarUrl: getDiceBearAvatarUrl(avatarSeeds[i % avatarSeeds.length] ?? `player-${i + 1}`, 64),
    name: c.name,
    flag: c.flag,
    city: c.city,
    country: c.country,
    delay: 0.6 + i * 0.15,
    source: "seeded_city",
  }));
}

// ── Self-player position ──

const SELF_POS = { x: mercatorX(0), y: mercatorY(51.5) };

// ── Pan constants ──
// The map starts showing Americas and pans right across Europe, Asia
const DESKTOP_CAMERA = { startX: -50, panRange: 350, panSpeed: 18, searchScale: 1.1, searchY: 0 };
const MOBILE_CAMERA = { startX: -120, panRange: 230, panSpeed: 12, searchScale: 1.45, searchY: -28 };

// ── Component ──

export function MatchmakingMapScreen({
  matchType,
  rankedSearchStartedAt = null,
  rankedFoundOpponent = null,
  debugInfo,
  onCancel,
}: MatchmakingMapScreenProps) {
  const mapPaths = useMemo(() => getMapPaths(), []);
  const fakePlayers = useMemo(() => generateFakePlayers(), []);
  const localGeoHint = readCachedGeoHint();
  const [visiblePins, setVisiblePins] = useState<Set<number>>(new Set());
  const [searchTime, setSearchTime] = useState(0);
  const [highlightedPin, setHighlightedPin] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
      : false
  );
  const showFoundState = matchType === "ranked" && rankedFoundOpponent !== null;
  const scanRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panAnimRef = useRef<ReturnType<typeof animate> | null>(null);

  // Motion values for smooth pan → zoom transition
  const mapX = useMotionValue(DESKTOP_CAMERA.startX);
  const mapY = useMotionValue(0);
  const mapScale = useMotionValue(DESKTOP_CAMERA.searchScale);
  const smoothX = useSpring(mapX, { stiffness: 40, damping: 20 });
  const smoothY = useSpring(mapY, { stiffness: 40, damping: 20 });
  const smoothScale = useSpring(mapScale, { stiffness: 40, damping: 20 });
  const searchCamera = isMobile ? MOBILE_CAMERA : DESKTOP_CAMERA;

  const opponentPin = useMemo<FakePlayer | null>(() => {
    if (!rankedFoundOpponent) return null;
    const resolved = resolveOpponentLocation(rankedFoundOpponent);
    return {
      id: 10000 + (hashString(rankedFoundOpponent.id ?? rankedFoundOpponent.username ?? "opponent") % 1000),
      lon: resolved.lon,
      lat: resolved.lat,
      x: mercatorX(resolved.lon),
      y: mercatorY(resolved.lat),
      color: "#FF4B4B",
      avatarUrl:
        rankedFoundOpponent.avatarUrl ??
        getDiceBearAvatarUrl(rankedFoundOpponent.username || "opponent", 64),
      name: rankedFoundOpponent.username || "Opponent",
      flag: resolved.flag,
      city: resolved.city,
      country: resolved.country,
      delay: 0,
      source: resolved.source ?? "resolved",
    };
  }, [rankedFoundOpponent]);
  const opponentRawGeo = useMemo(() => {
    if (!rankedFoundOpponent) return null;
    const geoObj = getGeoObject(rankedFoundOpponent.geo) ??
      getGeoObject(rankedFoundOpponent.location) ??
      null;
    return {
      city: rankedFoundOpponent.city ?? geoObj?.city ?? geoObj?.cityName ?? null,
      country: rankedFoundOpponent.country ?? geoObj?.country ?? geoObj?.countryName ?? geoObj?.country_name ?? null,
      countryCode: rankedFoundOpponent.countryCode ?? geoObj?.countryCode ?? geoObj?.country_code ?? null,
      lat: rankedFoundOpponent.lat ?? rankedFoundOpponent.latitude ?? geoObj?.lat ?? geoObj?.latitude ?? geoObj?.y ?? null,
      lon:
        rankedFoundOpponent.lon ??
        rankedFoundOpponent.longitude ??
        rankedFoundOpponent.lng ??
        rankedFoundOpponent.long ??
        geoObj?.lon ??
        geoObj?.lng ??
        geoObj?.long ??
        geoObj?.longitude ??
        geoObj?.x ??
        null,
      locationText:
        (typeof rankedFoundOpponent.location === "string" && rankedFoundOpponent.location) ||
        (typeof rankedFoundOpponent.geo === "string" && rankedFoundOpponent.geo) ||
        "",
    };
  }, [rankedFoundOpponent]);

  useEffect(() => {
    if (!showFoundState || !rankedFoundOpponent || !opponentPin) return;
    logger.info("Matchmaking opponent location resolved", {
      opponentId: rankedFoundOpponent.id,
      opponentUsername: rankedFoundOpponent.username,
      rawGeo: opponentRawGeo,
      resolved: {
        city: opponentPin.city,
        country: opponentPin.country,
        lat: Number(opponentPin.lat.toFixed(4)),
        lon: Number(opponentPin.lon.toFixed(4)),
        source: opponentPin.source ?? "unknown",
      },
    });
  }, [showFoundState, rankedFoundOpponent, opponentRawGeo, opponentPin]);

  const opponentPinId = opponentPin?.id ?? null;
  const mapPlayers = useMemo(
    () => (opponentPin ? [...fakePlayers, opponentPin] : fakePlayers),
    [fakePlayers, opponentPin]
  );

  // Sync mobile camera defaults with viewport.
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Continuous rightward panning while searching
  useEffect(() => {
    if (showFoundState) return;

    mapX.set(searchCamera.startX);
    mapY.set(searchCamera.searchY);
    mapScale.set(searchCamera.searchScale);

    panAnimRef.current = animate(mapX, searchCamera.startX - searchCamera.panRange, {
      duration: searchCamera.panRange / searchCamera.panSpeed,
      ease: "linear",
      repeat: Infinity,
      repeatType: "mirror",
    });

    return () => {
      panAnimRef.current?.stop();
    };
  }, [showFoundState, searchCamera, mapX, mapY, mapScale]);

  // Zoom to opponent when found
  useEffect(() => {
    if (!showFoundState || !opponentPin) return;

    // Stop pan animation
    panAnimRef.current?.stop();

    // Zoom into opponent location
    const targetScale = isMobile ? 4.4 : 3.2;
    const targetX = MAP_W / 2 - opponentPin.x * targetScale;
    const focusY = isMobile ? MAP_H * 0.42 : MAP_H / 2;
    const targetY = focusY - opponentPin.y * targetScale;
    const minX = MAP_W - MAP_W * targetScale;
    const minY = MAP_H - MAP_H * targetScale;
    const clampedTargetX = clamp(targetX, minX, 0);
    const clampedTargetY = clamp(targetY, minY, 0);

    // Animate to target
    const zoomDuration = 1.4;
    animate(mapScale, targetScale, { duration: zoomDuration, ease: [0.32, 0.72, 0, 1] });
    animate(mapX, clampedTargetX, { duration: zoomDuration, ease: [0.32, 0.72, 0, 1] });
    animate(mapY, clampedTargetY, { duration: zoomDuration, ease: [0.32, 0.72, 0, 1] });
  }, [showFoundState, opponentPin, isMobile, mapScale, mapX, mapY]);

  // Stagger pin appearances
  useEffect(() => {
    if (showFoundState) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    fakePlayers.forEach((p) => {
      timers.push(
        setTimeout(
          () => setVisiblePins((prev) => new Set(prev).add(p.id)),
          p.delay * 1000
        )
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [fakePlayers, showFoundState]);

  // Search elapsed timer
  useEffect(() => {
    if (matchType !== "ranked" || !rankedSearchStartedAt) return;
    const tick = () =>
      setSearchTime(
        Math.floor(Math.max(0, Date.now() - rankedSearchStartedAt) / 1000)
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [matchType, rankedSearchStartedAt]);

  // Cycle highlighted pin while searching
  useEffect(() => {
    if (showFoundState) {
      if (scanRef.current) clearInterval(scanRef.current);
      return;
    }
    let idx = 0;
    scanRef.current = setInterval(() => {
      idx = (idx + 1) % fakePlayers.length;
      setHighlightedPin(fakePlayers[idx].id);
    }, 350);
    return () => {
      if (scanRef.current) clearInterval(scanRef.current);
    };
  }, [showFoundState, fakePlayers, opponentPinId]);

  // Scan line Y position
  const [scanLineY, setScanLineY] = useState(0);
  useEffect(() => {
    if (showFoundState) return;
    const id = setInterval(() => setScanLineY((p) => (p >= MAP_H ? 0 : p + 2)), 16);
    return () => clearInterval(id);
  }, [showFoundState]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0D1117] overflow-hidden font-fun select-none">
      {/* ── Map ── */}
      <motion.svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio={isMobile ? "xMidYMid meet" : "xMidYMid slice"}
        className="absolute inset-0 w-full h-full"
      >
        <motion.g
          style={{
            x: smoothX,
            y: smoothY,
            scale: smoothScale,
            originX: 0,
            originY: 0,
            transformBox: "fill-box",
            transformOrigin: "0px 0px",
          }}
        >
          {/* Ocean */}
          <rect width={MAP_W} height={MAP_H} fill="#0D1117" />

          {/* Graticule */}
          {Array.from({ length: 37 }).map((_, i) => {
            const lon = -180 + i * 10;
            const x = mercatorX(lon);
            return (
              <line
                key={`v${i}`}
                x1={x} y1={0} x2={x} y2={MAP_H}
                stroke="#161B22" strokeWidth="0.5" opacity="0.5"
              />
            );
          })}
          {[-60, -40, -20, 0, 20, 40, 60].map((lat) => {
            const y = mercatorY(lat);
            return (
              <line
                key={`h${lat}`}
                x1={0} y1={y} x2={MAP_W} y2={y}
                stroke="#161B22" strokeWidth="0.5" opacity="0.5"
              />
            );
          })}

          {/* Land masses */}
          {mapPaths.map((d, i) => (
            <path key={i} d={d} fill="#1C2733" stroke="#2D3F4E" strokeWidth="0.5" />
          ))}

          {/* Scan line */}
          {!showFoundState && (
            <rect x={0} y={scanLineY} width={MAP_W} height={2} fill="#1CB0F6" opacity="0.35" />
          )}

        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

          {/* Self marker */}
          <g>
            <circle cx={SELF_POS.x} cy={SELF_POS.y} r="5" fill="#58CC02" opacity="0.15">
              <animate attributeName="r" values="5;14;5" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.25;0;0.25" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={SELF_POS.x} cy={SELF_POS.y} r="4" fill="#58CC02" stroke="#46A302" strokeWidth="1.2" />
            <text x={SELF_POS.x} y={SELF_POS.y - 8} textAnchor="middle" fill="#58CC02" fontSize="5" fontWeight="900">
              YOU
            </text>
          </g>

          {/* Player pins */}
          {mapPlayers.map((p) => {
            const visible = visiblePins.has(p.id);
            const highlighted = showFoundState ? p.id === opponentPinId : highlightedPin === p.id;
            const isOpp = showFoundState && p.id === opponentPinId;
            if (!visible && !showFoundState) return null;

            return (
              <g key={p.id}>
                {/* Pulse ring */}
                {(highlighted || isOpp) && (
                  <circle
                    cx={p.x} cy={p.y} r="5"
                    fill={p.color} opacity="0.2"
                    filter="url(#glow)"
                  >
                    <animate attributeName="r" values="5;18;5" dur={isOpp ? "1.5s" : "0.7s"} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.35;0;0.35" dur={isOpp ? "1.5s" : "0.7s"} repeatCount="indefinite" />
                  </circle>
                )}

                {/* Pin group */}
                <g transform={`translate(${p.x},${p.y})`}>
                  {/* Drop shadow */}
                  <ellipse cx="0" cy="1" rx="3.5" ry="1.2" fill="rgba(0,0,0,0.35)" />

                  {/* Pin body */}
                  <path
                    d="M0,-15 C-6.5,-15 -10,-11 -10,-6 C-10,1.5 0,8 0,8 C0,8 10,1.5 10,-6 C10,-11 6.5,-15 0,-15 Z"
                    fill={p.color}
                    stroke={isOpp ? "#fff" : "rgba(0,0,0,0.4)"}
                    strokeWidth={isOpp ? "1.5" : "0.5"}
                    opacity={isOpp ? 1 : highlighted ? 0.95 : 0.8}
                  >
                    {!showFoundState && (
                      <animateTransform
                        attributeName="transform"
                        type="translate"
                        values="0,0;0,-1.5;0,0"
                        dur={`${2 + (p.id % 4) * 0.3}s`}
                        repeatCount="indefinite"
                      />
                    )}
                  </path>

                  {/* Avatar circle with profile-style image */}
                  <defs>
                    <clipPath id={`pin-avatar-${p.id}`}>
                      <circle cx="0" cy="-7.5" r="5.1" />
                    </clipPath>
                  </defs>
                  <circle cx="0" cy="-7.5" r="5.5" fill="#0D1117" stroke={p.color} strokeWidth="0.8" />
                  <image
                    href={p.avatarUrl}
                    x="-5.1"
                    y="-12.6"
                    width="10.2"
                    height="10.2"
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#pin-avatar-${p.id})`}
                  />

                  {/* Name label (only when highlighted or opponent) */}
                  {(isOpp || (highlighted && !showFoundState)) && (
                    <g>
                      <rect
                        x={-p.name.length * 2.5 - 4}
                        y="-27"
                        width={p.name.length * 5 + 8}
                        height="9"
                        rx="3"
                        fill="rgba(0,0,0,0.7)"
                      />
                      <text
                        x="0" y="-20.5"
                        textAnchor="middle"
                        fill="white"
                        fontSize="5.5"
                        fontWeight="bold"
                      >
                        {p.name}
                      </text>
                    </g>
                  )}
                  {isOpp && (
                    <motion.g
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.35, duration: 0.3 }}
                    >
                      <rect
                        x="6.5"
                        y="-17.2"
                        width="10.5"
                        height="7.5"
                        rx="2.8"
                        fill="rgba(13,17,23,0.92)"
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth="0.45"
                      />
                      <text x="11.7" y="-11.8" textAnchor="middle" fontSize="5.7">
                        {p.flag}
                      </text>
                    </motion.g>
                  )}
                </g>
              </g>
            );
          })}
        </motion.g>
      </motion.svg>

      {/* ── Overlays ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 25%, rgba(13,17,23,0.7) 100%)",
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#0D1117] to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-[#0D1117] via-[#0D1117]/90 to-transparent pointer-events-none" />

      {/* ── Cancel (top-right) ── */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onCancel}
        className="absolute top-12 right-4 z-20 size-10 rounded-full bg-[#1C2733]/80 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-[#FF4B4B]/80 active:scale-95 transition-all backdrop-blur-sm"
      >
        <X className="size-5" />
      </motion.button>

      {/* ── Badge (top-left) ── */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-12 left-4 z-20"
      >
        <div
          className={cn(
            "px-3.5 py-1.5 rounded-full border-b-[3px] text-[11px] font-black uppercase tracking-wider text-white backdrop-blur-sm",
            matchType === "ranked"
              ? "bg-[#FF9600]/90 border-[#DB8200]"
              : "bg-[#1CB0F6]/90 border-[#1899D6]"
          )}
        >
          {matchType === "ranked" ? "⚽ Ranked" : "👥 Friendly"}
        </div>
      </motion.div>

      {/* ── Bottom UI ── */}
      <div
        className={cn(
          "absolute left-0 right-0 z-20 px-4 sm:px-5",
          showFoundState
            ? "top-0 bottom-0 flex items-center justify-center"
            : "bottom-0 pb-8 pt-4"
        )}
        style={showFoundState ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" } : undefined}
      >
        <AnimatePresence mode="wait">
          {!showFoundState ? (
            <motion.div
              key="searching"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-3"
            >
              {/* Pulsing dots */}
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                    className="size-2 rounded-full bg-[#1CB0F6]"
                  />
                ))}
              </div>

              <h2 className="text-xl font-black text-white uppercase tracking-widest">
                Searching
              </h2>

              <p className="text-sm font-bold text-[#56707A]">
                {searchTime > 0 ? `${searchTime}s` : "Finding a worthy opponent..."}
              </p>

              <button
                onClick={onCancel}
                className="mt-2 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-[#56707A] uppercase tracking-wider hover:bg-[#FF4B4B]/20 hover:text-[#FF4B4B] hover:border-[#FF4B4B]/30 transition-all active:scale-95"
              >
                Cancel
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="found"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6, ease: [0.32, 0.72, 0, 1] }}
              className="w-full flex flex-col items-center justify-center gap-3"
            >
              {/* Opponent card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.0, duration: 0.5, ease: "backOut" }}
                className="w-full max-w-[22rem] mx-auto bg-[#1C2733]/95 backdrop-blur-md rounded-2xl border-b-4 border-[#0D1117] p-4 sm:p-5 flex flex-col items-center gap-3 text-center"
              >
                {/* Opponent avatar */}
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
                    className="size-16 rounded-full bg-[#243B44] border-[3px] border-[#FF9600] flex items-center justify-center overflow-hidden"
                  >
                    {rankedFoundOpponent?.avatarUrl ? (
                      <AvatarDisplay
                        customization={{ base: rankedFoundOpponent.avatarUrl }}
                        size="sm"
                      />
                    ) : (
                      <span className="text-2xl">⚽</span>
                    )}
                  </motion.div>
                  <div className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-[#58CC02] border-2 border-[#1C2733]" />
                </div>

                <div className="text-center">
                  <motion.h3
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.3 }}
                    className="text-lg font-black text-white"
                  >
                    {rankedFoundOpponent?.username ?? "Opponent"}
                  </motion.h3>

                  {/* Country / city */}
                  {showFoundState && opponentPin && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.35, duration: 0.35 }}
                      className="flex items-center justify-center gap-1.5 mt-1"
                    >
                      <span className="text-2xl leading-none">{opponentPin.flag}</span>
                      <span className="text-xs font-bold text-[#56707A]">
                        {opponentPin.city}, {opponentPin.country}
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* VS badge */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 1.5, type: "spring", stiffness: 300 }}
                  className="px-5 py-1.5 rounded-full bg-[#FF4B4B] border-b-[3px] border-[#E04242] text-sm font-black text-white uppercase tracking-wide"
                >
                  VS
                </motion.div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
                className="text-xs font-bold text-[#56707A] uppercase tracking-wider"
              >
                Preparing match...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Dev debug ── */}
      {process.env.NODE_ENV !== "production" && debugInfo ? (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 rounded-xl border border-white/10 bg-black/60 backdrop-blur-sm px-3 py-2 font-mono text-[9px] text-white/60 max-w-[280px]">
          <div className="text-white/80 font-bold mb-0.5">Debug</div>
          <div>
            sock:{debugInfo.socketConnected ? "ok" : "dc"} | sess:
            {debugInfo.sessionState} | q:
            {debugInfo.queueSearchId?.slice(0, 6) ?? "-"}
          </div>
          <div>
            search:{String(debugInfo.rankedSearching)} | err:
            {debugInfo.errorCode ?? "-"}
          </div>
          <div>
            LobbyDbg local:{localGeoHint?.city ?? "-"},
            {localGeoHint?.countryCode ?? localGeoHint?.country ?? "-"} session:
            {debugInfo.sessionState}
          </div>
          <div>
            local-ll:
            {typeof localGeoHint?.latitude === "number" ? localGeoHint.latitude.toFixed(2) : "-"},
            {typeof localGeoHint?.longitude === "number" ? localGeoHint.longitude.toFixed(2) : "-"} | src:
            {localGeoHint?.source ?? "-"}
          </div>
          {opponentPin ? (
            <>
              <div>
                raw:{opponentRawGeo?.city || "-"}, {opponentRawGeo?.countryCode || opponentRawGeo?.country || "-"}
              </div>
              <div>
                map:{opponentPin.city}, {opponentPin.country}
              </div>
              <div>
                ll:{opponentPin.lat.toFixed(2)},{opponentPin.lon.toFixed(2)} | src:{opponentPin.source ?? "-"}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
