import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ListNotificationsResponse,
  type NotificationItem,
} from "@/lib/repositories/notifications.repo";
import { useAuthStore } from "@/stores/auth.store";

export type { NotificationItem };

/**
 * The persistent notification feed. Realtime `notification:new` events keep this
 * fresh (see socket-handlers); the poll is a safety net for missed sockets.
 */
export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");
  return useQuery<ListNotificationsResponse>({
    queryKey: queryKeys.notifications.list(),
    queryFn: getNotifications,
    enabled: isAuthenticated,
    staleTime: 15_000,
    refetchInterval: () => (isAuthenticated ? 60_000 : false),
  });
}

export function useUnreadNotificationCount(): number {
  const { data } = useNotifications();
  return data?.unreadCount ?? 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
