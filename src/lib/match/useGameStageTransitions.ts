import { useCallback, useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  RankedQueueJoinPayload,
  OpponentInfo,
  SessionStatePayload,
} from "@/lib/realtime/socket.types";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useRankedMatchmakingStore } from "@/stores/rankedMatchmaking.store";
import type { DraftStatus } from "@/stores/realtimeMatch.store";
import type { GameStageRealtimeMatchSlice } from "@/features/game/hooks/useGameStageState";
import type { GameConfig, GameStage } from "@/types/game.runtime";
import { logger } from "@/utils/logger";
import { getSocketDebugSnapshot, logSocketDebug } from "@/lib/realtime/socket-client";
import { GOAL_VISUAL_SEQUENCE_MS } from "@/lib/constants/game";
import { PENALTY_RESULT_SEQUENCE_HOLD_MS } from "@/features/possession/realtimePossession.helpers";
import {
  consumeRankedQueueIntent,
  createRankedQueueIntent,
  type RankedQueueIntent,
} from "@/lib/analytics/game-events";

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
const RANKED_QUEUE_ACK_TIMEOUT_MS = 2500;
const MATCH_FOUND_HOLD_MS = 2000;
const FINAL_RESULTS_HOLD_BASE_MS = 2500;
const FINAL_RESULTS_HOLD_WITH_GOAL_MS = GOAL_VISUAL_SEQUENCE_MS + 500;
const FINAL_RESULTS_PAYLOAD_FALLBACK_MS = 750;
// How long the penalty match-end overlay (won/lost + score) shows before results.
export const PENALTY_MATCH_END_OVERLAY_MS = 2000;
// A deciding PENALTY goal must let the full shot + "GOAL!"/"SAVED" splash play out,
// THEN show the won/lost overlay, before the results screen — otherwise the shot is
// cut mid-animation and the match appears to end abruptly (reported bug).
const FINAL_RESULTS_HOLD_PENALTY_MS = PENALTY_RESULT_SEQUENCE_HOLD_MS + PENALTY_MATCH_END_OVERLAY_MS;
const GEO_HINT_CACHE_KEY = "ranked_geo_hint_v1";
const IP_LOOKUP_TIMEOUT_MS = 1800;

type RankedGeoHint = NonNullable<RankedQueueJoinPayload["geoHint"]>;
type RankedQueueJoinReason = NonNullable<RankedQueueJoinPayload["reason"]>;

interface IpWhoResponse {
  success?: boolean;
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
}

function isIpWhoResponse(value: unknown): value is IpWhoResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<IpWhoResponse>;
  const isMaybeString = (input: unknown) => input === undefined || typeof input === "string";
  const isMaybeNumber = (input: unknown) => input === undefined || typeof input === "number";
  const isMaybeBoolean = (input: unknown) => input === undefined || typeof input === "boolean";
  return (
    isMaybeBoolean(candidate.success) &&
    isMaybeString(candidate.ip) &&
    isMaybeString(candidate.city) &&
    isMaybeString(candidate.region) &&
    isMaybeString(candidate.country) &&
    isMaybeString(candidate.country_code) &&
    isMaybeNumber(candidate.latitude) &&
    isMaybeNumber(candidate.longitude)
  );
}

function isRankedGeoHint(value: unknown): value is RankedGeoHint {
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
    const rawData: unknown = await response.json();
    if (!isIpWhoResponse(rawData)) return {};
    const data = rawData;
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
  rankedSearchStartedAt: number | null | undefined,
  rankedFoundOpponent: OpponentInfo | null | undefined,
  sessionState: SessionStatePayload | null,
): boolean {
  if (rankedFoundOpponent) return true;
  if (sessionState?.state === "IN_QUEUE") return true;
  // A local search ack is only trusted while the server doesn't explicitly
  // contradict it. The backend removes the queue search the moment a socket
  // drops (no grace) and emits session:state IDLE on reconnect — if we kept
  // trusting the stale ack here, every recovery path would short-circuit and
  // the matchmaking spinner would hang forever after a transport blip.
  return Boolean(rankedSearchStartedAt) && sessionState?.state !== "IDLE";
}

function hasActiveRealtimeSession(snapshot: ReturnType<typeof useRealtimeMatchStore.getState>): boolean {
  const hasLiveLobby = Boolean(snapshot.lobby?.lobbyId && snapshot.lobby.status !== "closed");
  return Boolean(
    snapshot.match?.matchId ||
      snapshot.draft?.lobbyId ||
      hasLiveLobby ||
      snapshot.sessionState?.activeMatchId ||
      snapshot.sessionState?.waitingLobbyId
  );
}

interface GameStageTransitionOptions {
  isMultiplayer: boolean;
  stage: GameStage;
  config: GameConfig | null;
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  realtimeDraft: DraftStatus | null;
  realtimeMatch: GameStageRealtimeMatchSlice;
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
  const finalStageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchFoundShownAtRef = useRef<number | null>(null);
  const rankedGeoHintRef = useRef<RankedGeoHint | undefined>(undefined);
  const rankedQueueIntentRef = useRef<RankedQueueIntent | null>(null);
  const rankedRetryCountRef = useRef(0);
  const rankedSocketDisconnectedRef = useRef(false);
  const lastRoundResolvedAtRef = useRef<number | null>(null);
  const lastRoundResolvedQRef = useRef<number | null>(null);
  const rankedSearchStartedAt = useRankedMatchmakingStore((state) => state.rankedSearchStartedAt);
  const rankedFoundOpponent = useRankedMatchmakingStore((state) => state.rankedFoundOpponent);
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
        const parsed: unknown = JSON.parse(cachedRaw);
        const cached = isRankedGeoHint(parsed) ? parsed : baseHint;
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

  const clearFinalStageTimer = useCallback(() => {
    if (!finalStageTimerRef.current) return;
    clearTimeout(finalStageTimerRef.current);
    finalStageTimerRef.current = null;
  }, []);

  const emitRankedQueueJoin = useCallback(
    (reason: RankedQueueJoinReason) => {
      const snapshot = useRealtimeMatchStore.getState();
      const queueIntent =
        rankedQueueIntentRef.current ??
        consumeRankedQueueIntent() ??
        createRankedQueueIntent("unknown");
      rankedQueueIntentRef.current = queueIntent;
      const payload: RankedQueueJoinPayload = {
        searchMode: "human_first",
        source: queueIntent.source,
        reason,
        clientRequestId: queueIntent.clientRequestId,
        geoHint: rankedGeoHintRef.current,
      };
      useRankedMatchmakingStore.getState().markRankedSearchRequested();
      socket.emit("ranked:queue_join", payload);
      logger.info("Socket emit ranked:queue_join", {
        reason,
        source: queueIntent.source,
        clientRequestId: queueIntent.clientRequestId,
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
        rankedSearching: useRankedMatchmakingStore.getState().rankedSearching,
      });
      logSocketDebug("ranked queue_join emit", {
        reason,
        source: queueIntent.source,
        clientRequestId: queueIntent.clientRequestId,
        retryCount: rankedRetryCountRef.current,
        ...getSocketDebugSnapshot(socket),
        sessionState: snapshot.sessionState?.state ?? "NO_SESSION",
        queueSearchId: snapshot.sessionState?.queueSearchId ?? null,
        waitingLobbyId: snapshot.sessionState?.waitingLobbyId ?? null,
        activeMatchId: snapshot.sessionState?.activeMatchId ?? null,
        rankedSearching: useRankedMatchmakingStore.getState().rankedSearching,
        geoHintSource: rankedGeoHintRef.current?.source ?? "unknown",
        geoHintCountry: rankedGeoHintRef.current?.countryCode ?? null,
      });
    },
    [socket]
  );

  useEffect(() => {
    const handleDisconnect = () => {
      rankedSocketDisconnectedRef.current = true;
    };

    const handleConnect = () => {
      if (!rankedSocketDisconnectedRef.current) return;
      rankedSocketDisconnectedRef.current = false;
      if (!isMultiplayer || config?.matchType !== "ranked" || stage !== "matchmaking") return;

      const latestRealtime = useRealtimeMatchStore.getState();
      const latestRanked = useRankedMatchmakingStore.getState();
      const clientBelievesSearching = Boolean(
        rankedRequestRef.current ||
          latestRanked.rankedSearching ||
          latestRanked.rankedSearchStartedAt
      );
      if (
        !clientBelievesSearching ||
        latestRanked.rankedFoundOpponent ||
        latestRanked.rankedCancelRequestedAt !== null ||
        hasActiveRealtimeSession(latestRealtime)
      ) {
        return;
      }

      latestRanked.invalidateRankedSearchAck();
      rankedRequestRef.current = true;
      rankedRetryCountRef.current = 0;
      clearRankedAckTimer();
      clearRankedRetryTimer();
      logSocketDebug("ranked queue_join reconnect recovery", {
        ...getSocketDebugSnapshot(socket),
        sessionState: latestRealtime.sessionState?.state ?? "NO_SESSION",
        queueSearchId: latestRealtime.sessionState?.queueSearchId ?? null,
        rankedSearching: latestRanked.rankedSearching,
      });
      emitRankedQueueJoin("recovery_retry");
    };

    socket.on("disconnect", handleDisconnect);
    socket.on("connect", handleConnect);
    return () => {
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", handleConnect);
    };
  }, [
    clearRankedAckTimer,
    clearRankedRetryTimer,
    config?.matchType,
    emitRankedQueueJoin,
    isMultiplayer,
    socket,
    stage,
  ]);

  useEffect(() => {
    if (!isMultiplayer || config?.matchType !== "ranked") return;
    if (stage !== "matchmaking") {
      rankedRequestRef.current = false;
      rankedQueueIntentRef.current = null;
      rankedRetryCountRef.current = 0;
      matchFoundShownAtRef.current = null;
      clearRankedAckTimer();
      clearRankedRetryTimer();
      clearMatchFoundHoldTimer();
      clearFinalStageTimer();
      return;
    }
    if (!rankedRequestRef.current) {
      const latestRealtime = useRealtimeMatchStore.getState();
      const latestRanked = useRankedMatchmakingStore.getState();
      const hasSearchAck = computeHasSearchAck(
        latestRanked.rankedSearchStartedAt,
        latestRanked.rankedFoundOpponent,
        latestRealtime.sessionState,
      );
      if (hasSearchAck || hasActiveRealtimeSession(latestRealtime)) {
        rankedRequestRef.current = true;
        logger.info("Ranked queue join skipped: existing realtime session/search state", {
          hasSearchAck,
          hasLobby: Boolean(latestRealtime.lobby?.lobbyId && latestRealtime.lobby.status !== "closed"),
          hasDraft: Boolean(latestRealtime.draft?.lobbyId),
          activeMatchId: latestRealtime.sessionState?.activeMatchId ?? latestRealtime.match?.matchId ?? null,
          waitingLobbyId: latestRealtime.sessionState?.waitingLobbyId ?? latestRealtime.lobby?.lobbyId ?? null,
          queueSearchId: latestRealtime.sessionState?.queueSearchId ?? null,
          sessionState: latestRealtime.sessionState?.state ?? "NO_SESSION",
          rankedSearching: latestRanked.rankedSearching,
          rankedFoundOpponentId: latestRanked.rankedFoundOpponent?.id ?? null,
        });
        logSocketDebug("ranked queue_join skipped existing state", {
          hasSearchAck,
          hasLobby: Boolean(latestRealtime.lobby?.lobbyId && latestRealtime.lobby.status !== "closed"),
          hasDraft: Boolean(latestRealtime.draft?.lobbyId),
          ...getSocketDebugSnapshot(socket),
          sessionState: latestRealtime.sessionState?.state ?? "NO_SESSION",
          queueSearchId: latestRealtime.sessionState?.queueSearchId ?? null,
          waitingLobbyId: latestRealtime.sessionState?.waitingLobbyId ?? null,
          activeMatchId: latestRealtime.sessionState?.activeMatchId ?? latestRealtime.match?.matchId ?? null,
          rankedSearching: latestRanked.rankedSearching,
          rankedFoundOpponentId: latestRanked.rankedFoundOpponent?.id ?? null,
        });
        return;
      }
      if (!latestRealtime.sessionState) {
        // No session snapshot — e.g. right after ranked Play Again, which
        // resets the realtime store (sessionState -> null). `session:state`
        // is only PUSHED by the server (on connect / transitions); there is
        // no client-side way to request one, so WAITING here deadlocked
        // Play Again forever: the join was never emitted and the search UI
        // hung (staging 2026-06-10 — server logs show zero queue_join after
        // the result screen). The server validates the join authoritatively
        // anyway (session guard + queue dedupe + pairing markers) and
        // answers `session:blocked` when it must — so proceed and let the
        // server be the judge instead of blocking on a missing cache.
        logger.info("Ranked queue join proceeding without session snapshot (server validates)");
        logSocketDebug("ranked queue_join proceeding without session snapshot", {
          ...getSocketDebugSnapshot(socket),
          stage,
          matchType: config?.matchType ?? null,
        });
      }
      rankedRequestRef.current = true;
      rankedRetryCountRef.current = 0;
      emitRankedQueueJoin("initial");
    }
    return () => {
      clearRankedAckTimer();
      clearRankedRetryTimer();
      clearMatchFoundHoldTimer();
      clearFinalStageTimer();
    };
  }, [
    clearFinalStageTimer,
    clearMatchFoundHoldTimer,
    clearRankedAckTimer,
    clearRankedRetryTimer,
    config?.matchType,
    emitRankedQueueJoin,
    isMultiplayer,
    rankedFoundOpponent,
    rankedSearchStartedAt,
    sessionState,
    sessionState?.resolvedAt,
    socket,
    stage,
  ]);

  useEffect(() => {
    if (!isMultiplayer || config?.matchType !== "ranked" || stage !== "matchmaking") {
      clearRankedAckTimer();
      return;
    }
    if (!rankedRequestRef.current) return;

    const hasSearchAck = computeHasSearchAck(rankedSearchStartedAt, rankedFoundOpponent, sessionState);
    if (hasSearchAck) {
      clearRankedAckTimer();
      return;
    }
    if (rankedSearchAckTimerRef.current || rankedRetryTimerRef.current) return;

    rankedSearchAckTimerRef.current = setTimeout(() => {
      rankedSearchAckTimerRef.current = null;
      if (!rankedRequestRef.current) return;
      const latest = useRealtimeMatchStore.getState();
      const latestRanked = useRankedMatchmakingStore.getState();
      const hasAck = computeHasSearchAck(
        latestRanked.rankedSearchStartedAt,
        latestRanked.rankedFoundOpponent,
        latest.sessionState,
      );
      if (hasAck) return;
      if (rankedRetryCountRef.current >= RANKED_QUEUE_MAX_RETRIES) {
        logger.warn("Ranked queue join pending without acknowledgement (retry limit reached)", {
          retryCount: rankedRetryCountRef.current,
          sessionState: latest.sessionState?.state ?? "NO_SESSION",
          queueSearchId: latest.sessionState?.queueSearchId ?? null,
          waitingLobbyId: latest.sessionState?.waitingLobbyId ?? null,
          activeMatchId: latest.sessionState?.activeMatchId ?? null,
          rankedSearching: latestRanked.rankedSearching,
          errorCode: latest.error?.code ?? null,
        });
        return;
      }

      rankedRetryCountRef.current += 1;
      logger.warn("Ranked queue join pending without acknowledgement, retrying", {
        retryCount: rankedRetryCountRef.current,
        sessionState: latest.sessionState?.state ?? "NO_SESSION",
        queueSearchId: latest.sessionState?.queueSearchId ?? null,
      });
      logSocketDebug("ranked queue_join ack missing retrying", {
        retryCount: rankedRetryCountRef.current,
        ...getSocketDebugSnapshot(socket),
        sessionState: latest.sessionState?.state ?? "NO_SESSION",
        queueSearchId: latest.sessionState?.queueSearchId ?? null,
        errorCode: latest.error?.code ?? null,
      });
      emitRankedQueueJoin("retry");
    }, RANKED_QUEUE_ACK_TIMEOUT_MS);

    return () => {
      if (rankedSearchAckTimerRef.current) {
        clearTimeout(rankedSearchAckTimerRef.current);
        rankedSearchAckTimerRef.current = null;
      }
    };
  }, [
    clearRankedAckTimer,
    config?.matchType,
    emitRankedQueueJoin,
    isMultiplayer,
    rankedFoundOpponent,
    rankedSearchStartedAt,
    sessionState,
    socket,
    stage,
  ]);

  useEffect(() => {
    if (!isMultiplayer || config?.matchType !== "ranked") return;
    if (stage !== "matchmaking") return;

    const hasSearchAck = computeHasSearchAck(rankedSearchStartedAt, rankedFoundOpponent, sessionState);
    if (hasSearchAck) {
      rankedRetryCountRef.current = 0;
      clearRankedRetryTimer();
      return;
    }

    // Silent search loss: we HAD a server ack (search_started) but the server
    // now reports IDLE — the backend dropped the search without any error
    // event (it cancels searches immediately on socket disconnect, so a brief
    // transport blip mid-search lands exactly here after reconnect). Re-join;
    // the backend treats queue_join idempotently (resumes an existing search).
    const searchSilentlyLost = Boolean(rankedSearchStartedAt);

    const shouldRetry =
      rankedRequestRef.current &&
      sessionState?.state === "IDLE" &&
      (searchSilentlyLost ||
        realtimeErrorCode === "TRANSITION_IN_PROGRESS" ||
        realtimeErrorCode === "RANKED_QUEUE_BUSY" ||
        realtimeErrorCode === "RANKED_QUEUE_BLOCKED" ||
        realtimeErrorCode === "RANKED_QUEUE_UNAVAILABLE");
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
      logSocketDebug("ranked queue_join recovery retry firing", {
        retryCount: rankedRetryCountRef.current,
        errorCode: realtimeErrorCode,
        ...getSocketDebugSnapshot(socket),
        sessionState: useRealtimeMatchStore.getState().sessionState?.state ?? "NO_SESSION",
      });
      emitRankedQueueJoin("recovery_retry");
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
    socket,
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
    if (realtimeMatch.matchId && getStageOrdinal(stage) < getStageOrdinal("playing")) {
      setStage("playing");
    }
  }, [isMultiplayer, realtimeMatch.matchId, setStage, stage]);

  useEffect(() => {
    const qIndex = realtimeMatch?.lastRoundResult?.qIndex ?? null;
    if (qIndex === null) return;
    if (lastRoundResolvedQRef.current === qIndex) return;
    lastRoundResolvedQRef.current = qIndex;
    lastRoundResolvedAtRef.current = Date.now();
  }, [realtimeMatch?.lastRoundResult?.qIndex]);

  useEffect(() => {
    if (!isMultiplayer || getStageOrdinal(stage) >= getStageOrdinal("finalResults")) {
      clearFinalStageTimer();
      return;
    }
    const hasFinalResults = Boolean(realtimeMatch?.finalResults);
    const phaseCompleted = realtimeMatch.possessionStatePhase === "COMPLETED";
    if (!hasFinalResults && !phaseCompleted) {
      clearFinalStageTimer();
      return;
    }
    if (realtimeMatch?.finalResults?.winnerDecisionMethod === "forfeit") {
      clearFinalStageTimer();
      setStage("finalResults");
      return;
    }

    const lastRound = realtimeMatch?.lastRoundResult;
    const hasGoalInLastRound =
      (lastRound?.phaseKind === "normal" || lastRound?.phaseKind === "last_attack") &&
      Boolean(lastRound?.deltas?.goalScoredBySeat);
    // The deciding penalty kick: hold long enough for the shot/save animation +
    // splash to finish AND the won/lost overlay to show, before the results screen.
    const isDecidingPenalty = lastRound?.phaseKind === "penalty";
    const holdMs = lastRoundResolvedAtRef.current
      ? (isDecidingPenalty
          ? FINAL_RESULTS_HOLD_PENALTY_MS
          : hasGoalInLastRound
            ? FINAL_RESULTS_HOLD_WITH_GOAL_MS
            : FINAL_RESULTS_HOLD_BASE_MS)
      : 0;
    const elapsedMs = lastRoundResolvedAtRef.current
      ? Date.now() - lastRoundResolvedAtRef.current
      : holdMs;
    const payloadWaitMs = hasFinalResults ? 0 : FINAL_RESULTS_PAYLOAD_FALLBACK_MS;
    const remainingMs = Math.max(0, holdMs + payloadWaitMs - elapsedMs);

    if (remainingMs <= 0) {
      clearFinalStageTimer();
      setStage("finalResults");
      return;
    }

    clearFinalStageTimer();
    finalStageTimerRef.current = setTimeout(() => {
      finalStageTimerRef.current = null;
      setStage("finalResults");
    }, remainingMs);
  }, [
    clearFinalStageTimer,
    isMultiplayer,
    realtimeMatch?.finalResults,
    realtimeMatch?.lastRoundResult,
    realtimeMatch?.lastRoundResult?.deltas?.goalScoredBySeat,
    realtimeMatch?.lastRoundResult?.phaseKind,
    realtimeMatch?.lastRoundResult?.qIndex,
    realtimeMatch.possessionStatePhase,
    setStage,
    stage,
  ]);
}
