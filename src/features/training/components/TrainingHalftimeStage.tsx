"use client";

import { useState, useEffect, useRef } from "react";
import { HalftimeScreen } from "@/features/possession/components/HalftimeScreen";
import { usePlayerAvatar } from "@/hooks/usePlayerAvatar";
import { useTraining } from "../TrainingMatchProvider";
import { BOT_AVATAR, BOT_AVATAR_CUSTOMIZATION, BOT_NAME } from "../constants";
import { TRAINING_FLOW_SCRIPT } from "../data/trainingScript";

interface HalftimeDraftCategory {
  id: string;
  // banCategories already carry a locale-resolved string; wrap it so the shape
  // matches the socket DraftCategory the halftime card now expects.
  name: Record<string, string>;
  icon: string | null;
  imageUrl: string | null;
}

export function TrainingHalftimeStage() {
  const { match, tooltips, banCategories } = useTraining();
  const { state } = match;
  const { startSecondHalf } = match;
  const { avatarUrl: playerResolvedAvatar, avatarCustomization, username: playerName } = usePlayerAvatar();
  const [myBan, setMyBan] = useState<string | null>(null);
  const [opponentBan, setOpponentBan] = useState<string | null>(null);
  const tooltipFired = useRef(false);
  const playerTargetId = banCategories[TRAINING_FLOW_SCRIPT.halftime.playerCategoryIndex]?.id ?? null;
  const opponentTargetId = banCategories[TRAINING_FLOW_SCRIPT.halftime.opponentCategoryIndex]?.id ?? null;

  useEffect(() => {
    if (!tooltipFired.current) {
      tooltipFired.current = true;
      tooltips.tryShowStageTooltip("halftime");
    }
  }, [tooltips]);

  // Bot bans after delay — waits for the halftime tooltip to be dismissed
  useEffect(() => {
    if (tooltips.isPaused) return;
    if (!myBan || !opponentTargetId) return;
    const timer = setTimeout(() => setOpponentBan(opponentTargetId), 1400);
    return () => clearTimeout(timer);
  }, [myBan, opponentTargetId, tooltips.isPaused]);

  // After both bans, advance to second half
  useEffect(() => {
    if (myBan && opponentBan && !tooltips.isPaused) {
      const timer = setTimeout(() => {
        startSecondHalf();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [myBan, opponentBan, tooltips.isPaused, startSecondHalf]);

  const categoryOptions: HalftimeDraftCategory[] = banCategories.map((c) => ({
    id: c.id,
    name: { en: c.name },
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
      playerAvatarCustomization={avatarCustomization}
      opponentAvatarUrl={BOT_AVATAR}
      opponentAvatarCustomization={BOT_AVATAR_CUSTOMIZATION}
      playerPosition={state.playerPosition}
      categoryOptions={categoryOptions}
      mySeat={1}
      firstBanSeat={1}
      myBan={myBan}
      opponentBan={opponentBan}
      guidedCategoryId={myBan ? null : playerTargetId}
      onBanCategory={(categoryId) => {
        if (!myBan && categoryId === playerTargetId) setMyBan(categoryId);
      }}
    />
  );
}
