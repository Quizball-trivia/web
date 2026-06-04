import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import { getObjectives } from "@/lib/repositories/objectives.repo";
import { useAuthStore } from "@/stores/auth.store";

interface UseObjectivesOptions {
  enabled?: boolean;
}

export function useObjectives(options: UseObjectivesOptions = {}) {
  const authStatus = useAuthStore((state) => state.status);
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.objectives.current(),
    queryFn: getObjectives,
    enabled: enabled && authStatus === "authenticated",
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
