import { useCallback, useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  RankedQueueJoinPayload,
} from "@/lib/realtime/socket.types";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import type { DraftStatus, MatchStatus } from "@/stores/realtimeMatch.store";
import type { GameConfig, GameStage } from "@/types/game.runtime";
import { logger } from "@/utils/logger";

const STAGE_ORDER: GameStage[] = [
  "idle",
  "matchmaking",
  "categoryBlocking",
  "showdown",
  "roundIntro",
  "playing",
  "roundResult",
  "roundTransition",
  "finalResults",
];

const getStageOrdinal = (stage: GameStage): number => STAGE_ORDER.indexOf(stage);
const RANKED_QUEUE_RETRY_DELAY_MS = 350;
const RANKED_QUEUE_MAX_RETRIES = 3;
const MATCH_FOUND_HOLD_MS = 2000;
const GEO_HINT_CACHE_KEY = "ranked_geo_hint_v1";
const IP_LOOKUP_TIMEOUT_MS = 1800;

type RankedGeoHint = NonNullable<RankedQueueJoinPayload["geoHint"]>;

function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function extractCountryCodeFromLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  const match = locale.replace("_", "-").match(/-([A-Za-z]{2})\b/);
  return match ? match[1].toUpperCase() : undefined;
}

async function getIpLookupHint(): Promise<Partial<RankedGeoHint>> {
  if (typeof window === "undefined") return {};

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IP_LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch("https://ipwho.is/", {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return {};
    const data = (await response.json()) as {
      success?: boolean;
      ip?: string;
      city?: string;
      region?: string;
      country?: string;
      country_code?: string;
      latitude?: number;
      longitude?: number;
    };
    if (data.success === false) return {};
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country,
      countryCode: data.country_code,
      latitude: typeof data.latitude === "number" ? roundCoord(data.latitude) : undefined,
      longitude: typeof data.longitude === "number" ? roundCoord(data.longitude) : undefined,
      source: "ip_lookup",
    };
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

async function getBrowserGeoHint(): Promise<Partial<RankedGeoHint>> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) return {};

  const navWithPermissions = navigator as Navigator & {
    permissions?: {
      query: (permissionDesc: PermissionDescriptor) => Promise<{ state: PermissionState }>;
    };
  };

  try {
    if (navWithPermissions.permissions?.query) {
      const permission = await navWithPermissions.permissions.query({
        name: "geolocation" as PermissionName,
      });
      if (permission.state !== "granted") {
        return {};
      }
    }
  } catch {
    // Continue without permissions API gating.
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: roundCoord(position.coords.latitude),
          longitude: roundCoord(position.coords.longitude),
          source: "browser_geolocation",
        });
      },
      () => resolve({}),
      {
        enableHighAccuracy: false,
        timeout: 2200,
        maximumAge: 10 * 60 * 1000,
      }
    );
  });
}

function computeHasSearchAck(
  rankedSearchStartedAt: unknown,
  rankedFoundOpponent: unknown,
  sessionState: { state?: string } | null,
): boolean {
  return (
    Boolean(rankedSearchStartedAt) ||
    Boolean(rankedFoundOpponent) ||
    sessionState?.state === "IN_QUEUE"
  );
}

interface GameStageTransitionOptions {
  isMultiplayer: boolean;
  stage: GameStage;
  config: GameConfig | null;
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  realtimeDraft: DraftStatus | null;
  realtimeMatch: MatchStatus | null;
  setStage: (stage: GameStage) => void;
}

export function useGameStageTransitions({
  isMultiplayer,
  stage,
  config,
  socket,
  realtimeDraft,
  realtimeMatch,
  setStage,
}: GameStageTransitionOptions) {
  const rankedRequestRef = useRef(false);
  const rankedSearchAckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rankedRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchFoundHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchFoundShownAtRef = useRef<number | null>(null);
  const rankedGeoHintRef = useRef<RankedGeoHint | undefined>(undefined);
  const rankedRetryCountRef = useRef(0);
  const rankedSearchStartedAt = useRealtimeMatchStore((state) => state.rankedSearchStartedAt);
  const rankedFoundOpponent = useRealtimeMatchStore((state) => state.rankedFoundOpponent);
  const sessionState = useRealtimeMatchStore((state) => state.sessionState);
  const realtimeErrorCode = useRealtimeMatchStore((state) => state.error?.code ?? null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const locale = navigator.language || undefined;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    const countryCode = extractCountryCodeFromLocale(locale);

    const baseHint: RankedGeoHint = {
      locale,
      timezone,
      countryCode,
      source: "client_locale",
    };

    try {
      const cachedRaw = window.localStorage.getItem(GEO_HINT_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as RankedGeoHint;
        rankedGeoHintRef.current = { ...baseHint, ...cached };
        logger.info("Ranked geo hint loaded from cache", {
          baseHint,
          cachedHint: cached,
          mergedHint: rankedGeoHintRef.current,
        });
      } else {
        rankedGeoHintRef.current = baseHint;
        logger.info("Ranked geo hint initialized from client locale/timezone", {
          baseHint,
        });
      }
    } catch {
      rankedGeoHintRef.current = baseHint;
      logger.warn("Ranked geo hint cache parse failed; using base hint", { baseHint });
    }

    let active = true;
    void (async () => {
      const [ipHint, browserHint] = await Promise.all([
        getIpLookupHint(),
        getBrowserGeoHint(),
      ]);
      if (!active) return;

      const merged: RankedGeoHint = {
        ...rankedGeoHintRef.current,
        ...ipHint,
        ...browserHint,
        locale: rankedGeoHintRef.current?.locale ?? locale,
        timezone: rankedGeoHintRef.current?.timezone ?? timezone,
        countryCode:
          browserHint.countryCode ??
          ipHint.countryCode ??
          rankedGeoHintRef.current?.countryCode ??
          countryCode,
        source:
          browserHint.latitude !== undefined && browserHint.longitude !== undefined
            ? "browser_geolocation"
            : ipHint.ip
              ? "ip_lookup"
              : rankedGeoHintRef.current?.source ?? "client_locale",
      };
      rankedGeoHintRef.current = merged;
      logger.info("Ranked geo hint probes completed", {
        ipHint,
        browserHint,
        mergedHint: merged,
      });
      try {
        window.localStorage.setItem(GEO_HINT_CACHE_KEY, JSON.stringify(merged));
      } catch {
        // Ignore localStorage failures.
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const clearRankedAckTimer = useCallback(() => {
    if (!rankedSearchAckTimerRef.current) return;
    clearTimeout(rankedSearchAckTimerRef.current);
    rankedSearchAckTimerRef.current = null;
  }, []);

  const clearRankedRetryTimer = useCallback(() => {
    if (!rankedRetryTimerRef.current) return;
    clearTimeout(rankedRetryTimerRef.current);
    rankedRetryTimerRef.current = null;
  }, []);

  const clearMatchFoundHoldTimer = useCallback(() => {
    if (!matchFoundHoldTimerRef.current) return;
    clearTimeout(matchFoundHoldTimerRef.current);
    matchFoundHoldTimerRef.current = null;
  }, []);

  const emitRankedQueueJoin = useCallback(
    (reason: "initial" | "retry") => {
      const snapshot = useRealtimeMatchStore.getState();
      const payload: RankedQueueJoinPayload = {
        searchMode: "human_first",
        geoHint: rankedGeoHintRef.current,
      };
      socket.emit("ranked:queue_join", payload);
      logger.info("Socket emit ranked:queue_join", {
        reason,
        retryCount: rankedRetryCountRef.current,
        payload,
        socketConnected: socket.connected,
        geoHintSource: rankedGeoHintRef.current?.source ?? "unknown",
        geoHintCountry: rankedGeoHintRef.current?.countryCode ?? null,
        geoHintCity: rankedGeoHintRef.current?.city ?? null,
        hasGeoCoords:
          rankedGeoHintRef.current?.latitude !== undefined &&
          rankedGeoHintRef.current?.longitude !== undefined,
        sessionState: snapshot.sessionState?.state ?? "NO_SESSION",
        queueSearchId: snapshot.sessionState?.queueSearchId ?? null,
        waitingLobbyId: snapshot.sessionState?.waitingLobbyId ?? null,
        activeMatchId: snapshot.sessionState?.activeMatchId ?? null,
        rankedSearching: snapshot.rankedSearching,
      });
    },
    [socket]
  );

  useEffect(() => {
    if (!isMultiplayer || config?.matchType !== "ranked") return;
    if (stage !== "matchmaking") {
      rankedRequestRef.current = false;
      rankedRetryCountRef.current = 0;
      matchFoundShownAtRef.current = null;
      clearRankedAckTimer();
      clearRankedRetryTimer();
      clearMatchFoundHoldTimer();
      return;
    }
    if (!rankedRequestRef.current) {
      rankedRequestRef.current = true;
      rankedRetryCountRef.current = 0;
      emitRankedQueueJoin("initial");

      if (process.env.NODE_ENV !== "production") {
        clearRankedAckTimer();
        rankedSearchAckTimerRef.current = setTimeout(() => {
          if (!rankedRequestRef.current) return;
          const latest = useRealtimeMatchStore.getState();
          const hasSearchAck = computeHasSearchAck(
            latest.rankedSearchStartedAt,
            latest.rankedFoundOpponent,
            latest.sessionState,
          );
          if (hasSearchAck) return;
          logger.warn("Ranked queue join pending without search acknowledgement", {
            sessionState: latest.sessionState?.state ?? "NO_SESSION",
            queueSearchId: latest.sessionState?.queueSearchId ?? null,
            waitingLobbyId: latest.sessionState?.waitingLobbyId ?? null,
            activeMatchId: latest.sessionState?.activeMatchId ?? null,
            rankedSearching: latest.rankedSearching,
            hasLobby: Boolean(latest.lobby),
            hasMatch: Boolean(latest.match),
            errorCode: latest.error?.code ?? null,
          });
        }, 2500);
      }
    }
    return () => {
      clearRankedAckTimer();
      clearRankedRetryTimer();
      clearMatchFoundHoldTimer();
    };
  }, [clearMatchFoundHoldTimer, clearRankedAckTimer, clearRankedRetryTimer, config?.matchType, emitRankedQueueJoin, isMultiplayer, stage]);

  useEffect(() => {
    if (!isMultiplayer || config?.matchType !== "ranked") return;
    if (stage !== "matchmaking") return;

    const hasSearchAck = computeHasSearchAck(rankedSearchStartedAt, rankedFoundOpponent, sessionState);
    if (hasSearchAck) {
      rankedRetryCountRef.current = 0;
      clearRankedRetryTimer();
      return;
    }

    const shouldRetry =
      rankedRequestRef.current &&
      sessionState?.state === "IDLE" &&
      (realtimeErrorCode === "TRANSITION_IN_PROGRESS" ||
        realtimeErrorCode === "RANKED_QUEUE_BUSY");
    if (!shouldRetry) {
      return;
    }
    if (rankedRetryTimerRef.current) {
      return;
    }
    if (rankedRetryCountRef.current >= RANKED_QUEUE_MAX_RETRIES) {
      logger.warn("Ranked queue join retry limit reached", {
        retryCount: rankedRetryCountRef.current,
        errorCode: realtimeErrorCode,
        sessionState: sessionState?.state ?? "NO_SESSION",
      });
      return;
    }

    rankedRetryTimerRef.current = setTimeout(() => {
      rankedRetryTimerRef.current = null;
      rankedRetryCountRef.current += 1;
      emitRankedQueueJoin("retry");
    }, RANKED_QUEUE_RETRY_DELAY_MS);

    return () => {
      if (rankedRetryTimerRef.current) {
        clearTimeout(rankedRetryTimerRef.current);
        rankedRetryTimerRef.current = null;
      }
    };
  }, [
    clearRankedRetryTimer,
    config?.matchType,
    emitRankedQueueJoin,
    isMultiplayer,
    rankedFoundOpponent,
    rankedSearchStartedAt,
    realtimeErrorCode,
    sessionState,
    sessionState?.state,
    stage,
  ]);

  useEffect(() => {
    const hasSearchAck = computeHasSearchAck(rankedSearchStartedAt, rankedFoundOpponent, sessionState);
    if (hasSearchAck) {
      rankedRetryCountRef.current = 0;
      clearRankedAckTimer();
      clearRankedRetryTimer();
    }
  }, [clearRankedAckTimer, clearRankedRetryTimer, rankedFoundOpponent, rankedSearchStartedAt, sessionState, sessionState?.state]);

  useEffect(() => {
    if (!isMultiplayer || config?.matchType !== "ranked" || stage !== "matchmaking") {
      matchFoundShownAtRef.current = null;
      clearMatchFoundHoldTimer();
      return;
    }

    if (rankedFoundOpponent && matchFoundShownAtRef.current === null) {
      matchFoundShownAtRef.current = Date.now();
    }
    if (!rankedFoundOpponent) {
      matchFoundShownAtRef.current = null;
      clearMatchFoundHoldTimer();
    }
  }, [clearMatchFoundHoldTimer, config?.matchType, isMultiplayer, rankedFoundOpponent, stage]);

  useEffect(() => {
    if (!isMultiplayer) return;
    if (realtimeDraft && getStageOrdinal(stage) < getStageOrdinal("categoryBlocking")) {
      if (config?.matchType === "ranked" && stage === "matchmaking" && rankedFoundOpponent) {
        const shownAt = matchFoundShownAtRef.current ?? Date.now();
        const elapsed = Date.now() - shownAt;
        const remaining = Math.max(0, MATCH_FOUND_HOLD_MS - elapsed);
        if (remaining > 0) {
          clearMatchFoundHoldTimer();
          matchFoundHoldTimerRef.current = setTimeout(() => {
            matchFoundHoldTimerRef.current = null;
            setStage("categoryBlocking");
          }, remaining);
          return;
        }
      }
      setStage("categoryBlocking");
    }
  }, [clearMatchFoundHoldTimer, config?.matchType, isMultiplayer, rankedFoundOpponent, realtimeDraft, setStage, stage]);

  useEffect(() => {
    if (!isMultiplayer) return;
    if (realtimeMatch && getStageOrdinal(stage) < getStageOrdinal("playing")) {
      setStage("playing");
    }
  }, [isMultiplayer, realtimeMatch, setStage, stage]);

  useEffect(() => {
    if (!isMultiplayer) return;
    const completed = realtimeMatch?.finalResults || realtimeMatch?.possessionState?.phase === 'COMPLETED';
    if (completed && getStageOrdinal(stage) < getStageOrdinal("finalResults")) {
      setStage("finalResults");
    }
  }, [isMultiplayer, realtimeMatch?.finalResults, realtimeMatch?.possessionState?.phase, setStage, stage]);
}
