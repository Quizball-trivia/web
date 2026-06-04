import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import { getMyAchievements, getPublicProfile, getUserAchievements } from "@/lib/repositories/users.repo";
import { toPublicProfile } from "@/lib/mappers/publicProfile.mapper";
import type { Achievement } from "@/types/game";
import { useAuthStore } from "@/stores/auth.store";

export function usePublicProfile(userId?: string) {
  const authStatus = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.users.publicProfile(userId ?? ""),
    queryFn: async () => {
      const data = await getPublicProfile(userId!);
      return toPublicProfile(data);
    },
    enabled: authStatus === "authenticated" && Boolean(userId),
    retry: 1,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useMyAchievements() {
  const authStatus = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.users.achievements(),
    queryFn: async (): Promise<Achievement[]> => {
      const data = await getMyAchievements();
      return data.achievements;
    },
    enabled: authStatus === "authenticated",
    staleTime: 60_000,
    gcTime: 15 * 60_000,
  });
}

export function useUserAchievements(userId?: string) {
  const authStatus = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.users.achievements(userId),
    queryFn: async (): Promise<Achievement[]> => {
      const data = await getUserAchievements(userId!);
      return data.achievements;
    },
    enabled: authStatus === "authenticated" && Boolean(userId),
    staleTime: 60_000,
    gcTime: 15 * 60_000,
  });
}
