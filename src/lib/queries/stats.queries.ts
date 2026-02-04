import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import { getHeadToHead } from "@/lib/repositories/stats.repo";
import { toHeadToHeadSummary } from "@/lib/mappers/stats.mapper";

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
