"use client";

import { useEffect, useRef } from "react";
import { ShowdownScreen } from "@/components/ShowdownScreen";
import { usePlayer } from "@/contexts/PlayerContext";
import { usePlayerAvatar } from "@/hooks/usePlayerAvatar";
import { useTraining } from "../TrainingMatchProvider";
import { BOT_AVATAR, BOT_NAME } from "../constants";

export function TrainingShowdownStage() {
  const { match, tooltips } = useTraining();
  const { player } = usePlayer();
  const { avatarUrl: playerResolvedAvatar, avatarCustomization } = usePlayerAvatar();
  const tooltipFired = useRef(false);

  useEffect(() => {
    if (!tooltipFired.current) {
      tooltipFired.current = true;
      tooltips.tryShowStageTooltip("showdown");
    }
  }, [tooltips]);

  return (
    <ShowdownScreen
      matchType="friendly"
      playerUsername={player.username}
      playerAvatar={playerResolvedAvatar}
      opponentUsername={BOT_NAME}
      opponentAvatar={BOT_AVATAR}
      onComplete={() => match.setStage("banning")}
      playerInfo={{
        username: player.username,
        avatar: playerResolvedAvatar,
        avatarCustomization,
        rankPoints: 0,
        level: player.level,
        tier: "academy",
      }}
      opponentInfo={{
        username: BOT_NAME,
        avatar: BOT_AVATAR,
        rankPoints: 1200,
        tier: "silver",
        country: "Brazil",
        countryCode: "BR",
      }}
    />
  );
}
