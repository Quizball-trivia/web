import { useQuery } from '@tanstack/react-query';
import * as leaderboardRepo from '@/lib/repositories/leaderboard.repo';
import type { LeaderboardType } from '@/lib/domain/leaderboard';
import { toLeaderboardEntry, toUserRank } from '@/lib/mappers/leaderboard.mapper';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useAuthStore } from '@/stores/auth.store';

export function useLeaderboard(type: LeaderboardType, currentUserId?: string, season?: string) {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.leaderboard.list(type, season),
    queryFn: async () => {
      const { data, error } = await leaderboardRepo.getLeaderboard(type, 50, 0, season);
      if (error) throw new Error('Failed to fetch leaderboard');
      return data.map((entry) => toLeaderboardEntry(entry, currentUserId));
    },
    enabled: isAuthenticated,
  });
}

export function useUserRank(userId: string, type: LeaderboardType = 'global', season?: string) {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.leaderboard.user(userId, type, season),
    queryFn: async () => {
      const { data, error } = await leaderboardRepo.getUserRank(type, season);
      if (error) throw new Error('Failed to fetch user rank');
      return data ? toUserRank(data) : null;
    },
    enabled: isAuthenticated && !!userId,
  });
}

export function useLeaderboardSeasons() {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.leaderboard.seasons(),
    queryFn: async () => {
      const { data, error } = await leaderboardRepo.getLeaderboardSeasons();
      if (error) throw new Error('Failed to fetch leaderboard seasons');
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
