"use client";

import { useState, useEffect, useRef } from "react";
import { isMuted as getIsMuted, toggleMute } from "@/lib/sounds/gameSounds";
import { usePlayer } from "@/contexts/PlayerContext";
import { usePlayerAvatar } from "@/hooks/usePlayerAvatar";
import {
  BanCategoryView,
  type BanCategoryViewCategory,
} from "@/features/play/RankedCategoryBlockingScreen";
import { useTraining } from "../TrainingMatchProvider";
import { BOT_AVATAR, BOT_AVATAR_CUSTOMIZATION, BOT_NAME, BOT_RANK_POINTS } from "../constants";
import { TRAINING_FLOW_SCRIPT } from "../data/trainingScript";

const TURN_SECONDS = 15;
const BOT_BAN_DELAY_MS = 1400;
const READY_TO_KICKOFF_MS = 1500;

export function TrainingBanningStage() {
  const { match, tooltips, banCategories, questionsReady } = useTraining();
  const { startQuestion } = match;
  const { player } = usePlayer();
  const { avatarUrl: playerResolvedAvatar, avatarCustomization } = usePlayerAvatar();

  const [playerBan, setPlayerBan] = useState<string | null>(null);
  const [botBan, setBotBan] = useState<string | null>(null);
  const [currentActor, setCurrentActor] = useState<"player" | "opponent">("player");
  const [soundMuted, setSoundMuted] = useState(() => getIsMuted());
  const tooltipFired = useRef(false);

  const playerTargetId = banCategories[TRAINING_FLOW_SCRIPT.banning.playerCategoryIndex]?.id ?? null;
  const botTargetId = banCategories[TRAINING_FLOW_SCRIPT.banning.opponentCategoryIndex]?.id ?? null;

  useEffect(() => {
    if (!tooltipFired.current) {
      tooltipFired.current = true;
      tooltips.tryShowStageTooltip("banning");
    }
  }, [tooltips]);

  // Bot's response is a declared script step, never a random available card.
  useEffect(() => {
    if (!playerBan || botBan || !botTargetId) return;
    if (tooltips.isPaused) return;
    queueMicrotask(() => {
      setCurrentActor("opponent");
    });
    const timer = setTimeout(() => {
      setBotBan(botTargetId);
    }, BOT_BAN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [playerBan, botBan, botTargetId, tooltips.isPaused]);

  // After both bans, kick off the first half
  useEffect(() => {
    if (playerBan && botBan && questionsReady) {
      const timer = setTimeout(() => {
        startQuestion(0);
      }, READY_TO_KICKOFF_MS);
      return () => clearTimeout(timer);
    }
  }, [playerBan, botBan, questionsReady, startQuestion]);

  const handleBan = (categoryId: string) => {
    if (playerBan || currentActor !== "player" || categoryId !== playerTargetId) return;
    setPlayerBan(categoryId);
  };

  // banCategories carry a locale-resolved name string; wrap it so the shape
  // matches the socket I18nField the ban card expects.
  const categories: BanCategoryViewCategory[] = banCategories.map((c) => ({
    id: c.id,
    name: { en: c.name },
    icon: c.icon ?? null,
    imageUrl: c.imageUrl ?? null,
  }));

  return (
    <BanCategoryView
      player={{
        id: "player",
        username: player.username,
        avatar: playerResolvedAvatar,
        avatarCustomization,
        rankPoints: player.rankPoints ?? 0,
      }}
      opponent={{
        id: "training-bot",
        username: BOT_NAME,
        avatar: BOT_AVATAR,
        avatarCustomization: BOT_AVATAR_CUSTOMIZATION,
        countryCode: "BR",
        rankPoints: BOT_RANK_POINTS,
      }}
      categories={categories}
      playerBannedId={playerBan}
      opponentBannedId={botBan}
      phase={playerBan && botBan ? "ready" : "ban"}
      currentActor={currentActor}
      timeLeft={TURN_SECONDS}
      soundMuted={soundMuted}
      guidedCategoryId={playerBan ? null : playerTargetId}
      onToggleSound={() => setSoundMuted(toggleMute())}
      onBanCategory={handleBan}
    />
  );
}
