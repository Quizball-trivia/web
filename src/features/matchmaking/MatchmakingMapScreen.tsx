"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "motion/react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import type { OpponentInfo } from "@/lib/realtime/socket.types";
import type { AvatarCustomization } from "@/types/game";
import { AVATAR_COLORS, getAvatarAsset } from "@/lib/avatars";
import {
  CITY_DATA,
  EXTRA_SEARCH_LOCATIONS,
  MAP_H,
  MAP_W,
  PROJ_CENTER,
  PROJ_SCALE,
  SEARCH_PLAYER_NAMES,
  clamp,
  getGeoObject,
  projectPoint,
  resolveOpponentLocation,
} from "@/lib/geo";
import { MapPlayerPin, type FakePlayer } from "./components/MapPlayerPin";
import { logger } from "@/utils/logger";
import { stopBgm } from "@/lib/sounds/gameSounds";
import { useLocale } from "@/contexts/LocaleContext";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
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
  onRestart?: () => void;
}

export function resolveSearchTimerStartedAt(
  rankedSearchStartedAt: number | null | undefined,
  fallbackSearchStartedAt: number,
): number {
  if (typeof rankedSearchStartedAt !== "number") return fallbackSearchStartedAt;
  return Math.min(rankedSearchStartedAt, fallbackSearchStartedAt);
}

const PREPARING_MATCH_STUCK_TIMEOUT_MS = 20000;

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
  const isMaybeNumber = (v: unknown) =>
    v === undefined || typeof v === "number";
  const isMaybeString = (v: unknown) =>
    v === undefined || typeof v === "string";
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

// ── Pin colors ──

const PIN_COLORS = [
  "#58CC02",
  "#1CB0F6",
  "#FF4B4B",
  "#FF9600",
  "#CE82FF",
  "#FFD700",
  "#FF6B9D",
  "#00D4AA",
  "#FF8C42",
  "#7B68EE",
  "#20B2AA",
  "#FF69B4",
  "#4ECDC4",
  "#FF6347",
  "#9370DB",
] as const;


// Tiny non-cryptographic hash used to derive a stable pseudo-random pin id
// from the opponent's user id/username so the same opponent always lands on
// the same pin number for that match. Not exported — pin-id is the only use.
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom<T>(items: readonly T[], indexFallback: number): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[indexFallback % items.length];
}

// Cap the number of animated pins. Each pin renders a multi-layer avatar
// inside the continuously-panning map overlay. Keep this deliberately low so
// the search screen stays smooth on mobile while the map is animating.
const MAX_SEARCH_PINS = 12;

function generateFakePlayers(): FakePlayer[] {
  const cityPool = shuffled([
    ...CITY_DATA.map(({ lon, lat, city, country, flag }) => ({
      lon,
      lat,
      city,
      country,
      flag,
    })),
    ...EXTRA_SEARCH_LOCATIONS,
  ]).slice(0, MAX_SEARCH_PINS);
  const names = shuffled(SEARCH_PLAYER_NAMES);
  const avatarCustomizations = shuffled(CITY_DATA.map((c) => c.customization));

  return cityPool.map((c, i) => {
    const [px, py] = projectPoint(c.lon, c.lat);
    return {
      id: i,
      lon: c.lon,
      lat: c.lat,
      x: px,
      y: py,
      color: PIN_COLORS[i % PIN_COLORS.length],
      avatarUrl: getAvatarAsset(AVATAR_COLORS[i % AVATAR_COLORS.length]),
      avatarCustomization: pickRandom(avatarCustomizations, i),
      name: pickRandom(names, i),
      flag: c.flag,
      city: c.city,
      country: c.country,
      delay: 0.35 + i * 0.1,
      source: "randomized_search_city",
    };
  });
}

// Static world map — never depends on changing state, so memo() prevents the
// ~170 country paths from being re-created on every parent re-render.
const MemoizedGeographies = memo(function MemoizedGeographies() {
  return (
    <Geographies geography={worldTopo}>
      {({ geographies }) =>
        geographies.map((geo) => (
          <Geography
            key={geo.rsmKey}
            geography={geo}
            fill="#1C2733"
            stroke="#2D3F4E"
            strokeWidth={0.5}
            style={{
              default: { outline: "none" },
              hover: { outline: "none" },
              pressed: { outline: "none" },
            }}
          />
        ))
      }
    </Geographies>
  );
});

// ── Pan constants ──
// The map starts showing Americas and pans right across Europe, Asia
const DESKTOP_CAMERA = {
  startX: -50,
  panRange: 350,
  panSpeed: 18,
  searchScale: 1.1,
  searchY: 0,
};
const MOBILE_CAMERA = {
  startX: -120,
  panRange: 230,
  panSpeed: 12,
  searchScale: 1.45,
  searchY: -28,
};

// ── Component ──

export function MatchmakingMapScreen({
  matchType,
  rankedSearchStartedAt = null,
  rankedFoundOpponent = null,
  debugInfo,
  onCancel,
  onRestart,
}: MatchmakingMapScreenProps) {
  const { t } = useLocale();
  const fakePlayers = useMemo(() => generateFakePlayers(), []);
  const localGeoHint = useMemo(() => readCachedGeoHint(), []);
  const [preparingMatchStuck, setPreparingMatchStuck] = useState(false);
  const showFoundState = matchType === "ranked" && rankedFoundOpponent !== null;
  const showPreparationFailure =
    showFoundState &&
    (preparingMatchStuck ||
      debugInfo?.errorCode === "MATCH_PREPARATION_FAILED");
  const unknownCity = t("matchmaking.unknownCity");
  const unknownCountry = t("matchmaking.unknownCountry");
  const opponentFallback = t("matchmaking.opponentFallback");

  const opponentPin: FakePlayer | null = useMemo(() => {
    if (!rankedFoundOpponent) return null;
    const resolved = resolveOpponentLocation(
      rankedFoundOpponent,
      unknownCity,
      unknownCountry,
    );
    const [oppX, oppY] = projectPoint(resolved.lon, resolved.lat);
    return {
      id:
        10000 +
        (hashString(
          rankedFoundOpponent.id ?? rankedFoundOpponent.username ?? "opponent",
        ) %
          1000),
      lon: resolved.lon,
      lat: resolved.lat,
      x: oppX,
      y: oppY,
      color: "#FF4B4B",
      avatarUrl:
        rankedFoundOpponent.avatarUrl ?? getAvatarAsset("blue"),
      avatarCustomization: rankedFoundOpponent.avatarCustomization ?? null,
      name: rankedFoundOpponent.username || opponentFallback,
      flag: resolved.flag,
      city: resolved.city,
      country: resolved.country,
      delay: 0,
      source: resolved.source ?? "resolved",
    };
  }, [opponentFallback, rankedFoundOpponent, unknownCity, unknownCountry]);
  const opponentRawGeo = useMemo(() => {
    if (!rankedFoundOpponent) return null;
    const geoObj =
      getGeoObject(rankedFoundOpponent.geo) ??
      getGeoObject(rankedFoundOpponent.location) ??
      null;
    return {
      city:
        rankedFoundOpponent.city ?? geoObj?.city ?? geoObj?.cityName ?? null,
      country:
        rankedFoundOpponent.country ??
        geoObj?.country ??
        geoObj?.countryName ??
        geoObj?.country_name ??
        null,
      countryCode:
        rankedFoundOpponent.countryCode ??
        geoObj?.countryCode ??
        geoObj?.country_code ??
        null,
      lat:
        rankedFoundOpponent.lat ??
        rankedFoundOpponent.latitude ??
        geoObj?.lat ??
        geoObj?.latitude ??
        geoObj?.y ??
        null,
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
        (typeof rankedFoundOpponent.location === "string" &&
          rankedFoundOpponent.location) ||
        (typeof rankedFoundOpponent.geo === "string" &&
          rankedFoundOpponent.geo) ||
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

  useEffect(() => {
    if (!showFoundState) {
      queueMicrotask(() => {
        setPreparingMatchStuck(false);
      });
      return;
    }

    if (debugInfo?.errorCode === "MATCH_PREPARATION_FAILED") {
      queueMicrotask(() => {
        setPreparingMatchStuck(true);
      });
      return;
    }

    const timeoutId = window.setTimeout(() => {
      logger.warn("Matchmaking screen detected stuck preparing-match state", {
        sessionState: debugInfo?.sessionState ?? "NO_SESSION",
        queueSearchId: debugInfo?.queueSearchId ?? null,
        waitingLobbyId: debugInfo?.waitingLobbyId ?? null,
        activeMatchId: debugInfo?.activeMatchId ?? null,
        errorCode: debugInfo?.errorCode ?? null,
        opponentId: rankedFoundOpponent?.id ?? null,
      });
      setPreparingMatchStuck(true);
    }, PREPARING_MATCH_STUCK_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    debugInfo?.activeMatchId,
    debugInfo?.errorCode,
    debugInfo?.queueSearchId,
    debugInfo?.sessionState,
    debugInfo?.waitingLobbyId,
    rankedFoundOpponent?.id,
    showFoundState,
  ]);

  // Keep matchmaking light: do not start a background loop on this screen.
  // The map animation is already doing continuous work, and streaming the
  // search BGM was causing noticeable jank on some devices.
  useEffect(() => {
    stopBgm(250);
    return () => stopBgm(250);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-surface-darkest bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat overflow-hidden font-fun select-none">
      {/* ── Map ── */}
      <MatchmakingMapViewport
        fakePlayers={fakePlayers}
        opponentPin={opponentPin}
        showFoundState={showFoundState}
      />

      {/* ── Overlays ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 25%, rgba(13,17,23,0.7) 100%)",
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-surface-darkest to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-surface-darkest via-surface-darkest/90 to-transparent pointer-events-none" />

      {/* Cancel X button removed — using bottom Cancel button instead */}

      {/* Badge removed — overlapped with mute button */}

      {/* ── Bottom UI ── */}
      <div
        className={cn(
          "absolute left-0 right-0 z-20 px-4 sm:px-5",
          showFoundState
            ? "top-0 bottom-0 flex items-center justify-center"
            : "bottom-0 pb-8 pt-4",
        )}
        style={
          showFoundState
            ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }
            : undefined
        }
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
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut",
                    }}
                    className="size-2 rounded-full bg-brand-cyan"
                  />
                ))}
              </div>

              <h2 className="text-xl font-black text-white uppercase tracking-widest">
                {t("matchmaking.searching")}
              </h2>

              <p className="text-sm font-bold text-brand-slate">
                <SearchElapsedText
                  matchType={matchType}
                  rankedSearchStartedAt={rankedSearchStartedAt}
                />
              </p>

              <button
                onClick={onCancel}
                className="mt-2 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-brand-slate uppercase tracking-wider hover:bg-brand-red-soft/20 hover:text-brand-red-soft hover:border-brand-red-soft/30 transition-all active:scale-95"
              >
                {t("matchmaking.cancel")}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="found"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.6,
                ease: [0.32, 0.72, 0, 1],
              }}
              className="w-full flex flex-col items-center justify-center gap-3"
            >
              {/* Opponent card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.0, duration: 0.5, ease: "backOut" }}
                className="w-full max-w-[22rem] mx-auto bg-surface-map-panel/95 backdrop-blur-md rounded-2xl border-b-4 border-surface-darkest p-4 sm:p-5 flex flex-col items-center gap-3 text-center"
              >
                {/* Opponent avatar */}
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
                    className="size-16 rounded-full bg-surface-card-tint border-[3px] border-brand-orange flex items-center justify-center overflow-hidden"
                  >
                    <AvatarDisplay
                      customization={rankedFoundOpponent?.avatarCustomization ?? { base: rankedFoundOpponent?.avatarUrl ?? undefined }}
                      size="sm"
                    />
                  </motion.div>
                  <div className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-brand-green-light border-2 border-surface-map-panel" />
                </div>

                <div className="text-center">
                  <motion.h3
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.3 }}
                    className="text-lg font-black text-white"
                  >
                    {rankedFoundOpponent?.username ?? t("matchmaking.opponentFallback")}
                  </motion.h3>

                  {/* Country / city */}
                  {showFoundState && opponentPin && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.35, duration: 0.35 }}
                      className="flex items-center justify-center gap-1.5 mt-1"
                    >
                      <span className="text-2xl leading-none">
                        {opponentPin.flag}
                      </span>
                      <span className="text-xs font-bold text-brand-slate">
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
                  className="px-5 py-1.5 rounded-full bg-brand-red-soft border-b-[3px] border-brand-red-deep text-sm font-black text-white uppercase tracking-wide"
                >
                  {t("matchmaking.vs")}
                </motion.div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
                className="text-xs font-bold text-brand-slate uppercase tracking-wider"
              >
                {t("matchmaking.preparingMatch")}
              </motion.p>

              {showPreparationFailure ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.25 }}
                  className="w-full max-w-[24rem] rounded-2xl border border-brand-red-soft/25 bg-surface-map-panel-deep/92 p-4 text-center shadow-[0_16px_40px_rgba(0,0,0,0.32)]"
                >
                  <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-brand-red-soft/16 text-brand-red-light">
                    <TriangleAlert className="size-5" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-wide text-white">
                    {t("matchmaking.matchSetupStuck")}
                  </p>
                  <p className="mt-2 text-xs font-bold leading-5 text-brand-slate-light">
                    {t("matchmaking.matchSetupStuckDescription")}
                  </p>
                  <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                    <button
                      onClick={onRestart ?? onCancel}
                      className="inline-flex min-w-[10rem] items-center justify-center gap-2 rounded-xl bg-brand-red-soft px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition-all hover:bg-brand-red-soft active:scale-95"
                    >
                      <RotateCcw className="size-4" />
                      {t("matchmaking.restartSearch")}
                    </button>
                    <button
                      onClick={onCancel}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-brand-slate-light transition-all hover:border-white/20 hover:bg-white/8 hover:text-white active:scale-95"
                    >
                      {t("matchmaking.backToPlay")}
                    </button>
                  </div>
                </motion.div>
              ) : null}
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
            {typeof localGeoHint?.latitude === "number"
              ? localGeoHint.latitude.toFixed(2)
              : "-"}
            ,
            {typeof localGeoHint?.longitude === "number"
              ? localGeoHint.longitude.toFixed(2)
              : "-"}{" "}
            | src:
            {localGeoHint?.source ?? "-"}
          </div>
          {opponentPin ? (
            <>
              <div>
                raw:{opponentRawGeo?.city || "-"},{" "}
                {opponentRawGeo?.countryCode || opponentRawGeo?.country || "-"}
              </div>
              <div>
                map:{opponentPin.city}, {opponentPin.country}
              </div>
              <div>
                ll:{opponentPin.lat.toFixed(2)},{opponentPin.lon.toFixed(2)} |
                src:{opponentPin.source ?? "-"}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
