"use client";

import { useEffect, useRef, useState } from "react";
import { ShowdownScreen } from "@/components/ShowdownScreen";
import { usePlayer } from "@/contexts/PlayerContext";
import { usePlayerAvatar } from "@/hooks/usePlayerAvatar";
import { tierFromRp } from "@/utils/rankedTier";
import { useTraining } from "../TrainingMatchProvider";
import { BOT_AVATAR, BOT_NAME, BOT_RANK_POINTS } from "../constants";

export function TrainingShowdownStage() {
  const { match, tooltips } = useTraining();
  const { player } = usePlayer();
  const { avatarUrl: playerResolvedAvatar, avatarCustomization } = usePlayerAvatar();
  const tooltipFired = useRef(false);
  // ShowdownScreen auto-completes on an internal timer that keeps running
  // under the tooltip — hold the stage transition until GOT IT is pressed.
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!tooltipFired.current) {
      tooltipFired.current = true;
      tooltips.tryShowStageTooltip("showdown");
    }
  }, [tooltips]);

  useEffect(() => {
    if (completed && !tooltips.isPaused) {
      match.setStage("banning");
    }
  }, [completed, tooltips.isPaused, match]);

  return (
    <ShowdownScreen
      matchType="ranked"
      playerUsername={player.username}
      playerAvatar={playerResolvedAvatar}
      opponentUsername={BOT_NAME}
      opponentAvatar={BOT_AVATAR}
      onComplete={() => setCompleted(true)}
      playerInfo={{
        username: player.username,
        avatar: playerResolvedAvatar,
        avatarCustomization,
        rankPoints: player.rankPoints ?? 0,
        level: player.level,
        tier: tierFromRp(player.rankPoints ?? 0),
      }}
      opponentInfo={{
        username: BOT_NAME,
        avatar: BOT_AVATAR,
        rankPoints: BOT_RANK_POINTS,
        tier: tierFromRp(BOT_RANK_POINTS),
        country: "Brazil",
        countryCode: "BR",
        isAi: true,
      }}
    />
  );
}
