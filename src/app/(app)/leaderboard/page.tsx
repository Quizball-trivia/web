import { Suspense } from "react";

import { LeaderboardPageScreen } from "@/features/leaderboard/LeaderboardScreen";
import { parseBoardParams } from "@/features/leaderboard/boards";
import { LeaderboardPageSkeleton } from "@/features/leaderboard/components/BoardSkeleton";

interface LeaderboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
  }
  // The screen reads its board from the URL (useSearchParams), which needs a Suspense
  // boundary; the fallback already has that board's shape so nothing moves when it streams in.
  return (
    <Suspense fallback={<LeaderboardPageSkeleton params={parseBoardParams(query)} />}>
      <LeaderboardPageScreen />
    </Suspense>
  );
}
