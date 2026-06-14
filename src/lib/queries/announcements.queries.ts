import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import {
  getActiveAnnouncements,
  type AnnouncementItem,
  type ListAnnouncementsResponse,
} from "@/lib/repositories/announcements.repo";
import { useAuthStore } from "@/stores/auth.store";

export type { AnnouncementItem };

/**
 * Active CMS-authored announcements for the Play-screen News list. Replaces the
 * previously hardcoded array, so new news ships without a deploy. Polls
 * occasionally so a freshly published announcement appears without a reload.
 */
export function useActiveAnnouncements() {
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");
  return useQuery<ListAnnouncementsResponse>({
    queryKey: queryKeys.announcements.active(),
    queryFn: getActiveAnnouncements,
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchInterval: () => (isAuthenticated ? 5 * 60_000 : false),
  });
}
