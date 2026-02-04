import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/lib/realtime/socket.types";
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

  useEffect(() => {
    if (!isMultiplayer || config?.matchType !== "ranked") return;
    if (stage === "matchmaking" && !rankedRequestRef.current) {
      rankedRequestRef.current = true;
      socket.emit("lobby:create", { mode: "ranked" });
      logger.info("Socket emit lobby:create", { mode: "ranked" });
    }
  }, [config?.matchType, isMultiplayer, socket, stage]);

  useEffect(() => {
    if (stage === "idle") {
      rankedRequestRef.current = false;
    }
  }, [stage]);

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
