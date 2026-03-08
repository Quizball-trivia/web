import type { LeaderboardEntry, UserRank } from "@/lib/domain/leaderboard";
import type {
  LeaderboardEntryResponse,
  UserRankResponse,
} from "@/lib/repositories/leaderboard.repo";

/**
 * Deterministic hash for fake trend data.
 * Same user gets the same trend on the same day.
 */
function hashForTrend(userId: string): number {
  const today = new Date().toISOString().split("T")[0];
  const str = `${userId}:${today}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function fakeTrend(userId: string): { trend: "up" | "down" | "same"; trendValue: number } {
  const h = hashForTrend(userId);
  const bucket = h % 10;
  if (bucket < 2) return { trend: "up", trendValue: (h % 5) + 1 };
  if (bucket < 4) return { trend: "down", trendValue: (h % 4) + 1 };
  return { trend: "same", trendValue: 0 };
}

export function toLeaderboardEntry(
  entry: LeaderboardEntryResponse,
  currentUserId?: string,
): LeaderboardEntry {
  const { trend, trendValue } = fakeTrend(entry.userId);
  return {
    id: entry.userId,
    rank: entry.rank,
    username: entry.username,
    avatar: entry.avatarUrl || entry.userId,
    tier: entry.tier,
    rankPoints: entry.rp,
    isCurrentUser: entry.userId === currentUserId,
    trend,
    trendValue,
  };
}

export function toUserRank(entry: UserRankResponse): UserRank {
  const { trend, trendValue } = fakeTrend(entry.userId);
  return {
    id: entry.userId,
    rank: entry.rank,
    rankPoints: entry.rp,
    username: entry.username,
    avatar: entry.avatarUrl || entry.userId,
    tier: entry.tier,
    isCurrentUser: true,
    trend,
    trendValue,
  };
}
