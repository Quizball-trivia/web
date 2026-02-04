import { useQuery } from '@tanstack/react-query';
import * as leaderboardRepo from '@/lib/repositories/leaderboard.repo';
import type { LeaderboardType } from '@/lib/domain/leaderboard';
import { toLeaderboardEntry, toUserRank } from '@/lib/mappers/leaderboard.mapper';
import { queryKeys } from '@/lib/queries/queryKeys';

export function useLeaderboard(type: LeaderboardType) {
  return useQuery({
    queryKey: queryKeys.leaderboard.list(type),
    queryFn: async () => {
      const { data, error } = await leaderboardRepo.getLeaderboard(type);
      if (error) throw new Error('Failed to fetch leaderboard');
      return data.map((entry) => toLeaderboardEntry(entry));
    },
  });
}

export function useUserRank(userId: string) {
    return useQuery({
        queryKey: queryKeys.leaderboard.user(userId),
        queryFn: async () => {
            const { data, error } = await leaderboardRepo.getUserRank(userId);
            if (error) throw new Error('Failed to fetch user rank');
            return data ? toUserRank(data) : data;
        },
        enabled: !!userId,
    });
}
