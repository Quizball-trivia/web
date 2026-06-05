import { useQuery } from '@tanstack/react-query';
import * as leaderboardRepo from '@/lib/repositories/leaderboard.repo';
import type { LeaderboardType } from '@/lib/domain/leaderboard';
import { toLeaderboardEntry, toUserRank } from '@/lib/mappers/leaderboard.mapper';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useAuthStore } from '@/stores/auth.store';

export function useLeaderboard(type: LeaderboardType, currentUserId?: string) {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.leaderboard.list(type),
    queryFn: async () => {
      const { data, error } = await leaderboardRepo.getLeaderboard(type);
      if (error) throw new Error('Failed to fetch leaderboard');
      return data.map((entry) => toLeaderboardEntry(entry, currentUserId));
    },
    enabled: isAuthenticated,
  });
}

export function useUserRank(userId: string, type: LeaderboardType = 'global') {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.leaderboard.user(userId, type),
    queryFn: async () => {
      const { data, error } = await leaderboardRepo.getUserRank(type);
      if (error) throw new Error('Failed to fetch user rank');
      return data ? toUserRank(data) : null;
    },
    enabled: isAuthenticated && !!userId,
  });
}
