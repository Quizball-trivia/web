"use client";

import { useRouter } from "next/navigation";

import { ObjectivesScreen } from "@/features/objectives";
import { usePlayer } from "@/contexts/PlayerContext";

export default function ObjectivesPage() {
  const router = useRouter();
  const { player } = usePlayer();

  return (
    <ObjectivesScreen
      onBack={() => router.back()}
      playerProgress={{
        questionsStreak: player.currentStreak ?? 0,
        rankedWins: 0, // TODO: Add to PlayerStats when backend supports
        careerLevelsCompleted: 0,
        totalGamesPlayed: player.gamesPlayed ?? 0,
        perfectScores: 0,
        friendsInvited: 0,
      }}
      onClaimReward={(objective) => {
        // TODO: Call API to claim reward
        console.log("Claimed:", objective.id, objective.rewards);
      }}
    />
  );
}
