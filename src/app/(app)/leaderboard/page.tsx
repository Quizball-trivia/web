"use client";

import { Suspense } from "react";

import { LeaderboardScreen } from "@/features/leaderboard/LeaderboardScreen";
import { LeaderboardPageSkeleton } from "@/features/leaderboard/components/BoardSkeleton";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";

export default function LeaderboardPage() {
  const { player } = usePlayer();
  // Signed-out visitors browse the same board; only a member has a rank of their own.
  const isAuthenticated = useAuthStore((state) => state.status) === "authenticated";
  // The board, mode and view live in the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense fallback={<LeaderboardPageSkeleton />}>
      <LeaderboardScreen currentPlayerId={isAuthenticated ? player.id : undefined} />
    </Suspense>
  );
}
