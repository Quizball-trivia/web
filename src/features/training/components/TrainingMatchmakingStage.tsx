"use client";

import { useEffect, useState, useRef } from "react";
import { MatchmakingMapScreen } from "@/features/game/components/MatchmakingMapScreen";
import { useTraining } from "../TrainingMatchProvider";
import { BOT_AVATAR, BOT_NAME } from "../constants";

export function TrainingMatchmakingStage() {
  const { match, tooltips } = useTraining();
  const [foundOpponent, setFoundOpponent] = useState<{
    id: string;
    username: string;
    avatarUrl: string;
  } | null>(null);
  const tooltipFired = useRef(false);
  const searchStartedAt = useRef(Date.now());

  useEffect(() => {
    if (!tooltipFired.current) {
      tooltipFired.current = true;
      tooltips.tryShowStageTooltip("matchmaking");
    }
  }, [tooltips]);

  // Simulate finding an opponent after tooltip is dismissed
  useEffect(() => {
    if (tooltips.isPaused) return;
    const findTimer = setTimeout(() => {
      setFoundOpponent({
        id: "training-bot",
        username: BOT_NAME,
        avatarUrl: BOT_AVATAR,
      });
    }, 2500);
    return () => clearTimeout(findTimer);
  }, [tooltips.isPaused]);

  // Auto-advance after opponent is found
  useEffect(() => {
    if (!foundOpponent) return;
    const timer = setTimeout(() => {
      match.setStage("showdown");
    }, 3500);
    return () => clearTimeout(timer);
  }, [foundOpponent, match]);

  return (
    <MatchmakingMapScreen
      matchType="ranked"
      rankedSearchStartedAt={searchStartedAt.current}
      rankedFoundOpponent={foundOpponent}
      onCancel={() => match.setStage("results")}
    />
  );
}
