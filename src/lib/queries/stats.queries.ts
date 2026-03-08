import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import { getHeadToHead, getRecentMatches, getStatsSummary, type RecentMatchesQuery } from "@/lib/repositories/stats.repo";
import {
  toHeadToHeadSummary,
  toMatchStatsSummary,
  toRecentMatchSummaries,
} from "@/lib/mappers/stats.mapper";

export function useHeadToHead(userAId?: string, userBId?: string) {
  return useQuery({
    queryKey: queryKeys.stats.headToHead(userAId ?? "", userBId ?? ""),
    queryFn: async () => {
      const data = await getHeadToHead({ userA: userAId ?? "", userB: userBId ?? "" });
      return toHeadToHeadSummary(data);
    },
    enabled: Boolean(userAId && userBId),
  });
}

export function useRecentMatches(limit = 10, userId?: string) {
  return useQuery({
    queryKey: queryKeys.stats.recentMatches(limit, userId),
    queryFn: async () => {
      const query = userId
        ? { limit, userId } as RecentMatchesQuery & { userId: string }
        : { limit } as RecentMatchesQuery;
      const data = await getRecentMatches(query);
      return toRecentMatchSummaries(data);
    },
    retry: 2,
    staleTime: 5 * 60_000,   // 5 min — avoid refetching on every page visit
    gcTime: 30 * 60_000,     // 30 min — keep cache warm for offline-ish resilience
  });
}

export function useMatchStatsSummary() {
  return useQuery({
    queryKey: queryKeys.stats.summary(),
    queryFn: async () => {
      const data = await getStatsSummary();
      return toMatchStatsSummary(data);
    },
    retry: 2,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}
