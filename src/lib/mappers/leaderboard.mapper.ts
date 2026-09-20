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
    avatarCustomization: entry.avatarCustomization,
    country: entry.country,
    tier: entry.tier ?? '',
    rankPoints: entry.rp ?? entry.auctionPoints ?? entry.ticTacToePoints ?? 0,
    isCurrentUser: entry.userId === currentUserId,
    trend: entry.trend ?? 'same',
    trendValue: entry.trendValue ?? 0,
  };
}

export function toUserRank(entry: UserRankResponse): UserRank {
  return {
    id: entry.userId,
    rank: entry.rank,
    rankPoints: entry.rp ?? entry.auctionPoints ?? entry.ticTacToePoints ?? 0,
    username: entry.username,
    avatar: entry.avatarUrl || entry.userId,
    avatarCustomization: entry.avatarCustomization,
    country: entry.country,
    tier: entry.tier ?? '',
    isCurrentUser: true,
    trend: entry.trend ?? 'same',
    trendValue: entry.trendValue ?? 0,
    total: entry.total,
  };
}
