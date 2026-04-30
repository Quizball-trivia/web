"use client";

import { useEffect, useRef } from "react";
import { ShowdownScreen } from "@/features/play/ShowdownScreen";
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
      player={{
        avatar: playerResolvedAvatar,
        avatarCustomization,
        username: player.username,
        rankPoints: 0,
        level: player.level,
        tier: "academy",
      }}
      opponent={{
        avatar: BOT_AVATAR,
        username: BOT_NAME,
        rankPoints: 1200,
        tier: "silver",
        country: "Brazil",
        countryCode: "BR",
      }}
      onContinue={() => match.setStage("banning")}
    />
  );
}
