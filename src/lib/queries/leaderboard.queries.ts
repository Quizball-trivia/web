import { useQuery } from '@tanstack/react-query';
import * as leaderboardRepo from '@/lib/repositories/leaderboard.repo';
import type { LeaderboardType } from '@/lib/domain/leaderboard';
import { toLeaderboardEntry, toUserRank } from '@/lib/mappers/leaderboard.mapper';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useAuthStore } from '@/stores/auth.store';

export function useLeaderboard(
  type: LeaderboardType,
  currentUserId?: string,
  season?: string,
  enabled = true,
) {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.leaderboard.list(type, season),
    queryFn: async () => {
      const { data, error } = await leaderboardRepo.getLeaderboard(type, 50, 0, season);
      if (error) throw new Error('Failed to fetch leaderboard');
      return data.map((entry) => toLeaderboardEntry(entry, currentUserId));
    },
    enabled: isAuthenticated && enabled,
  });
}

export function useUserRank(
  userId: string,
  type: LeaderboardType = 'global',
  season?: string,
  enabled = true,
) {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.leaderboard.user(userId, type, season),
    queryFn: async () => {
      const { data, error } = await leaderboardRepo.getUserRank(type, season);
      if (error) throw new Error('Failed to fetch user rank');
      return data ? toUserRank(data) : null;
    },
    enabled: isAuthenticated && !!userId && enabled,
  });
}

/**
 * Auction board. `enabled` lets the screen hold the request back until the
 * Auction tab is actually selected, so visiting the ranked leaderboard doesn't
 * fire a second, unused leaderboard fetch.
 */
export function useAuctionLeaderboard(
  type: LeaderboardType,
  currentUserId?: string,
  enabled = true,
) {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.leaderboard.auctionList(type),
    queryFn: async () => {
      const { data, error } = await leaderboardRepo.getAuctionLeaderboard(type);
      if (error) throw new Error('Failed to fetch auction leaderboard');
      return data.map((entry) => toLeaderboardEntry(entry, currentUserId));
    },
    enabled: isAuthenticated && enabled,
  });
}

export function useAuctionUserRank(
  userId: string,
  type: LeaderboardType = 'global',
  enabled = true,
) {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.leaderboard.auctionUser(userId, type),
    queryFn: async () => {
      const { data, error } = await leaderboardRepo.getAuctionUserRank(type);
      if (error) throw new Error('Failed to fetch auction user rank');
      return data ? toUserRank(data) : null;
    },
    enabled: isAuthenticated && !!userId && enabled,
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
