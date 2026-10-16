import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import { getMyAchievements, getPublicProfile,
  resolveNickname, getUserAchievements } from "@/lib/repositories/users.repo";
import { toPublicProfile } from "@/lib/mappers/publicProfile.mapper";
import type { Achievement } from "@/types/game";
import { useAuthStore } from "@/stores/auth.store";

/** Nickname -> user id for pretty profile URLs (/profile/<nickname>). */
export function useResolveNickname(nickname?: string) {
  const authStatus = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.users.resolveNickname(nickname ?? ""),
    queryFn: () => resolveNickname(nickname!),
    enabled: authStatus === "authenticated" && Boolean(nickname),
    retry: 1,
    staleTime: 10 * 60_000,
  });
}

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
  const validId = typeof userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  return useQuery({
    // An unresolved public profile must not replace the own-profile queryFn
    // under the shared "me" key. Disabled queries can still be refetched.
    queryKey: [...queryKeys.users.all, 'achievements', 'public', authStatus, userId ?? 'unresolved'],
    queryFn: async (): Promise<Achievement[]> => {
      if (authStatus !== 'authenticated' || !validId) return [];
      const data = await getUserAchievements(userId!);
      return data.achievements;
    },
    enabled: authStatus === "authenticated" && validId,
    staleTime: 60_000,
    gcTime: 15 * 60_000,
  });
}
