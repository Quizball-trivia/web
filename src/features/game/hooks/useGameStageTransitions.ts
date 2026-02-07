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
  const rankedSearchStartedAt = useRealtimeMatchStore((state) => state.rankedSearchStartedAt);
  const rankedFoundOpponent = useRealtimeMatchStore((state) => state.rankedFoundOpponent);
  const sessionState = useRealtimeMatchStore((state) => state.sessionState);

  const clearRankedAckTimer = useCallback(() => {
    if (!rankedSearchAckTimerRef.current) return;
    clearTimeout(rankedSearchAckTimerRef.current);
    rankedSearchAckTimerRef.current = null;
  }, []);

  useEffect(() => {
    if (!isMultiplayer || config?.matchType !== "ranked") return;
    if (stage !== "matchmaking") {
      rankedRequestRef.current = false;
      clearRankedAckTimer();
      return;
    }
    if (!rankedRequestRef.current) {
      rankedRequestRef.current = true;
      const snapshot = useRealtimeMatchStore.getState();
      socket.emit("ranked:queue_join");
      logger.info("Socket emit ranked:queue_join", {
        socketConnected: socket.connected,
        sessionState: snapshot.sessionState?.state ?? "NO_SESSION",
        queueSearchId: snapshot.sessionState?.queueSearchId ?? null,
        waitingLobbyId: snapshot.sessionState?.waitingLobbyId ?? null,
        activeMatchId: snapshot.sessionState?.activeMatchId ?? null,
        rankedSearching: snapshot.rankedSearching,
      });

      if (process.env.NODE_ENV !== "production") {
        clearRankedAckTimer();
        rankedSearchAckTimerRef.current = setTimeout(() => {
          if (!rankedRequestRef.current) return;
          const latest = useRealtimeMatchStore.getState();
          const hasSearchAck =
            Boolean(latest.rankedSearchStartedAt) ||
            Boolean(latest.rankedFoundOpponent) ||
            latest.sessionState?.state === "IN_QUEUE";
          if (hasSearchAck) return;
          logger.warn("Ranked queue join pending without search acknowledgement", {
            socketConnected: socket.connected,
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
    return clearRankedAckTimer;
  }, [clearRankedAckTimer, config?.matchType, isMultiplayer, socket, stage]);

  useEffect(() => {
    const hasSearchAck =
      Boolean(rankedSearchStartedAt) ||
      Boolean(rankedFoundOpponent) ||
      sessionState?.state === "IN_QUEUE";
    if (hasSearchAck) {
      clearRankedAckTimer();
    }
  }, [clearRankedAckTimer, rankedFoundOpponent, rankedSearchStartedAt, sessionState?.state]);

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
