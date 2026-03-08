import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import { getMyAchievements, getPublicProfile, getUserAchievements } from "@/lib/repositories/users.repo";
import { toPublicProfile } from "@/lib/mappers/publicProfile.mapper";
import type { Achievement } from "@/types/game";

export function usePublicProfile(userId?: string) {
  return useQuery({
    queryKey: queryKeys.users.publicProfile(userId ?? ""),
    queryFn: async () => {
      const data = await getPublicProfile(userId!);
      return toPublicProfile(data);
    },
    enabled: Boolean(userId),
    retry: 1,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useMyAchievements() {
  return useQuery({
    queryKey: queryKeys.users.achievements(),
    queryFn: async (): Promise<Achievement[]> => {
      const data = await getMyAchievements();
      return data.achievements;
    },
    staleTime: 60_000,
    gcTime: 15 * 60_000,
  });
}

export function useUserAchievements(userId?: string) {
  return useQuery({
    queryKey: queryKeys.users.achievements(userId),
    queryFn: async (): Promise<Achievement[]> => {
      const data = await getUserAchievements(userId!);
      return data.achievements;
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
    gcTime: 15 * 60_000,
  });
}
