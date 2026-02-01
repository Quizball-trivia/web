"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import { HomeScreen } from "@/features/home/HomeScreen";

export default function HomePage() {
  const { player: playerStats } = usePlayer();
  const dailyChallengesCompleted = new Map<string, number>();

  return (
    <HomeScreen
      playerStats={playerStats}
      dailyChallengesCompleted={dailyChallengesCompleted}
    />
  );
}
