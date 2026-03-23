import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import { getRankedProfile, getUserRanks } from "@/lib/repositories/ranked.repo";

interface UseRankedProfileOptions {
  enabled?: boolean;
}

export function useRankedProfile(options: UseRankedProfileOptions = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.ranked.profile(),
    queryFn: getRankedProfile,
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
    gcTime: 30 * 60_000,
  });
}

export function useUserRanks() {
  return useQuery({
    queryKey: queryKeys.ranked.ranks(),
    queryFn: getUserRanks,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
