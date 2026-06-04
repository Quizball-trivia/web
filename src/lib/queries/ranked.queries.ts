import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import { getRankedProfile, getUserRanks } from "@/lib/repositories/ranked.repo";
import { useAuthStore } from "@/stores/auth.store";

interface UseRankedProfileOptions {
  enabled?: boolean;
}

export function useRankedProfile(options: UseRankedProfileOptions = {}) {
  const authStatus = useAuthStore((state) => state.status);
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.ranked.profile(),
    queryFn: getRankedProfile,
    enabled: enabled && authStatus === "authenticated",
    staleTime: 0,
    refetchOnMount: "always",
    gcTime: 30 * 60_000,
  });
}

export function useUserRanks(options: UseRankedProfileOptions = {}) {
  const authStatus = useAuthStore((state) => state.status);
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.ranked.ranks(),
    queryFn: getUserRanks,
    enabled: enabled && authStatus === "authenticated",
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
