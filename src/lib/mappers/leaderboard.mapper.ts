import type { LeaderboardEntry, UserRank } from "@/lib/domain/leaderboard";
import type {
  LeaderboardEntryResponse,
  UserRankResponse,
} from "@/lib/repositories/leaderboard.repo";

export function toLeaderboardEntry(
  entry: LeaderboardEntryResponse,
  currentUserId?: string,
): LeaderboardEntry {
  return {
    id: entry.userId,
    rank: entry.rank,
    username: entry.username,
    avatar: entry.avatarUrl || entry.userId,
    country: entry.country,
    tier: entry.tier,
    rankPoints: entry.rp,
    isCurrentUser: entry.userId === currentUserId,
    trend: entry.trend,
    trendValue: entry.trendValue,
  };
}

export function toUserRank(entry: UserRankResponse): UserRank {
  return {
    id: entry.userId,
    rank: entry.rank,
    rankPoints: entry.rp,
    username: entry.username,
    avatar: entry.avatarUrl || entry.userId,
    country: entry.country,
    tier: entry.tier,
    isCurrentUser: true,
    trend: entry.trend,
    trendValue: entry.trendValue,
  };
}
