import type { LeaderboardEntry, UserRank } from "@/lib/domain/leaderboard";
import type {
  LeaderboardEntryResponse,
  UserRankResponse,
} from "@/lib/repositories/leaderboard.repo";

export function toLeaderboardEntry(entry: LeaderboardEntryResponse): LeaderboardEntry {
  return {
    id: entry.id,
    rank: entry.rank,
    username: entry.username,
    avatar: entry.avatar,
    level: entry.level,
    rankPoints: entry.rankPoints,
    isCurrentUser: entry.isCurrentUser,
    trend: entry.trend,
    trendValue: entry.trendValue,
  };
}

export function toUserRank(entry: UserRankResponse): UserRank {
  return {
    id: entry.id,
    rank: entry.rank,
    rankPoints: entry.rankPoints,
    username: entry.username,
    level: entry.level,
    isCurrentUser: true,
    trend: 'same',
    trendValue: 0,
  };
}
