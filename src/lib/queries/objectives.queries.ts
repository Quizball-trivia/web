import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import { getObjectives } from "@/lib/repositories/objectives.repo";

export function useObjectives() {
  return useQuery({
    queryKey: queryKeys.objectives.current(),
    queryFn: getObjectives,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
