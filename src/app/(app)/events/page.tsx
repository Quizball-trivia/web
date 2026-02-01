"use client";

import { useRouter } from "next/navigation";
import { TournamentsScreen } from "@/components/TournamentsScreen";
import { usePlayer } from "@/contexts/PlayerContext";

export default function EventsPage() {
  const router = useRouter();
  const { player } = usePlayer();

  return (
    <TournamentsScreen
      playerCoins={player.coins}
      playerRankPoints={player.rankPoints || 0}
      playerTier={player.rankedTier || "Bronze"}
      onEnterTournament={(tournament) => {
        console.log("Enter tournament:", tournament.id);
        router.push("/game");
      }}
    />
  );
}
