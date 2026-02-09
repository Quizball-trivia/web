import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import { getHeadToHead, getRecentMatches, getStatsSummary } from "@/lib/repositories/stats.repo";
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

export function useRecentMatches(limit = 10) {
  return useQuery({
    queryKey: queryKeys.stats.recentMatches(limit),
    queryFn: async () => {
      const data = await getRecentMatches({ limit });
      return toRecentMatchSummaries(data);
    },
  });
}

export function useMatchStatsSummary() {
  return useQuery({
    queryKey: queryKeys.stats.summary(),
    queryFn: async () => {
      const data = await getStatsSummary();
      return toMatchStatsSummary(data);
    },
  });
}
