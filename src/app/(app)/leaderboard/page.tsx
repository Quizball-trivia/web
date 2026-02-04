"use client";

import { LeaderboardScreen } from "@/features/leaderboard/LeaderboardScreen";
import { usePlayer } from "@/contexts/PlayerContext";

export default function LeaderboardPage() {
  const { player } = usePlayer();

  return (
    <LeaderboardScreen
      currentPlayerId={player.id}
    />
  );
}
