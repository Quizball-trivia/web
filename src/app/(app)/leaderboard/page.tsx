"use client";

import { LeaderboardScreen } from "@/components/LeaderboardScreen";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  mockLeaderboard,
  mockFriendsLeaderboard,
  mockCountryLeaderboard,
} from "@/data/mockData";

export default function LeaderboardPage() {
  const { player } = usePlayer();

  return (
    <LeaderboardScreen
      globalPlayers={mockLeaderboard}
      countryPlayers={mockCountryLeaderboard}
      friendsPlayers={mockFriendsLeaderboard}
      currentPlayerId={player.id}
    />
  );
}
