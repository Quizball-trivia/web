"use client";

import { useState, useEffect, useRef } from "react";
import { HalftimeScreen } from "@/features/possession/components/HalftimeScreen";
import { usePlayerAvatar } from "@/hooks/usePlayerAvatar";
import { useTraining } from "../TrainingMatchProvider";
import { BOT_AVATAR, BOT_NAME } from "../constants";

interface HalftimeDraftCategory {
  id: string;
  name: string;
  icon: string | null;
  imageUrl: string | null;
}

export function TrainingHalftimeStage() {
  const { match, tooltips, banCategories } = useTraining();
  const { state } = match;
  const { avatarUrl: playerResolvedAvatar, username: playerName } = usePlayerAvatar();
  const [myBan, setMyBan] = useState<string | null>(null);
  const [opponentBan, setOpponentBan] = useState<string | null>(null);
  const tooltipFired = useRef(false);

  useEffect(() => {
    if (!tooltipFired.current) {
      tooltipFired.current = true;
      tooltips.tryShowStageTooltip("halftime");
    }
  }, [tooltips]);

  // Bot bans after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      // Bot picks a random category from the available ones
      const available = banCategories.filter((c) => c.id !== myBan);
      const pick = available[Math.floor(Math.random() * available.length)];
      if (pick) setOpponentBan(pick.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [banCategories, myBan]);

  // After both bans, advance to second half
  useEffect(() => {
    if (myBan && opponentBan) {
      const timer = setTimeout(() => {
        match.startSecondHalf();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [myBan, opponentBan, match]);

  const categoryOptions: HalftimeDraftCategory[] = banCategories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon ?? null,
    imageUrl: c.imageUrl ?? null,
  }));

  return (
    <HalftimeScreen
      visible
      playerGoals={state.playerGoals}
      opponentGoals={state.opponentGoals}
      playerName={playerName}
      opponentName={BOT_NAME}
      playerAvatarUrl={playerResolvedAvatar}
      opponentAvatarUrl={BOT_AVATAR}
      playerPosition={state.playerPosition}
      categoryOptions={categoryOptions}
      mySeat={1}
      firstBanSeat={1}
      myBan={myBan}
      opponentBan={opponentBan}
      onBanCategory={(categoryId) => {
        if (!myBan) setMyBan(categoryId);
      }}
    />
  );
}
