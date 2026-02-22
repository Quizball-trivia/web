import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import { getRankedProfile } from "@/lib/repositories/ranked.repo";

export function useRankedProfile() {
  return useQuery({
    queryKey: queryKeys.ranked.profile(),
    queryFn: getRankedProfile,
    staleTime: 0,
    refetchOnMount: "always",
    gcTime: 30 * 60_000,
  });
}
