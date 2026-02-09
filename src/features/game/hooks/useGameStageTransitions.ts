import { useCallback, useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/lib/realtime/socket.types";
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
  const rankedRetryCountRef = useRef(0);
  const rankedSearchStartedAt = useRealtimeMatchStore((state) => state.rankedSearchStartedAt);
  const rankedFoundOpponent = useRealtimeMatchStore((state) => state.rankedFoundOpponent);
  const sessionState = useRealtimeMatchStore((state) => state.sessionState);
  const realtimeErrorCode = useRealtimeMatchStore((state) => state.error?.code ?? null);

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

  const emitRankedQueueJoin = useCallback(
    (reason: "initial" | "retry") => {
      const snapshot = useRealtimeMatchStore.getState();
      socket.emit("ranked:queue_join");
      logger.info("Socket emit ranked:queue_join", {
        reason,
        retryCount: rankedRetryCountRef.current,
        socketConnected: socket.connected,
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
      clearRankedAckTimer();
      clearRankedRetryTimer();
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
    };
  }, [clearRankedAckTimer, clearRankedRetryTimer, config?.matchType, emitRankedQueueJoin, isMultiplayer, stage]);

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
  }, [clearRankedAckTimer, clearRankedRetryTimer, rankedFoundOpponent, rankedSearchStartedAt, sessionState?.state]);

  useEffect(() => {
    if (!isMultiplayer) return;
    if (realtimeDraft && getStageOrdinal(stage) < getStageOrdinal("categoryBlocking")) {
      setStage("categoryBlocking");
    }
  }, [isMultiplayer, realtimeDraft, setStage, stage]);

  useEffect(() => {
    if (!isMultiplayer) return;
    if (realtimeMatch?.currentQuestion && getStageOrdinal(stage) < getStageOrdinal("playing")) {
      setStage("playing");
    }
  }, [isMultiplayer, realtimeMatch?.currentQuestion, setStage, stage]);

  useEffect(() => {
    if (!isMultiplayer) return;
    if (realtimeMatch?.finalResults && getStageOrdinal(stage) < getStageOrdinal("finalResults")) {
      setStage("finalResults");
    }
  }, [isMultiplayer, realtimeMatch?.finalResults, setStage, stage]);
}
