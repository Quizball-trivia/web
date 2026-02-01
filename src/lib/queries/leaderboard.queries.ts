import { useQuery } from '@tanstack/react-query';
import * as leaderboardRepo from '@/lib/repositories/leaderboard.repo';
import type { LeaderboardType } from '@/lib/domain/leaderboard';

export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  list: (type: LeaderboardType) => [...leaderboardKeys.all, 'list', type] as const,
  user: (userId: string) => [...leaderboardKeys.all, 'user', userId] as const,
};

export function useLeaderboard(type: LeaderboardType) {
  return useQuery({
    queryKey: leaderboardKeys.list(type),
    queryFn: async () => {
      const { data, error } = await leaderboardRepo.getLeaderboard(type);
      if (error) throw new Error('Failed to fetch leaderboard');
      return data;
    },
  });
}

export function useUserRank(userId: string) {
    return useQuery({
        queryKey: leaderboardKeys.user(userId),
        queryFn: async () => {
            const { data, error } = await leaderboardRepo.getUserRank(userId);
            if (error) throw new Error('Failed to fetch user rank');
            return data;
        },
        enabled: !!userId,
    });
}
