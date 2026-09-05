import { apiFetch } from "@/lib/api/client";
import type { components } from "@/types/api.generated";

export type ListNotificationsResponse = components["schemas"]["ListNotificationsResponse"];
export type NotificationItem = ListNotificationsResponse["items"][number];
export type UnreadCountResponse = components["schemas"]["UnreadCountResponse"];

export function getNotifications(): Promise<ListNotificationsResponse> {
  return apiFetch("get", "/api/v1/notifications");
}

export function getUnreadCount(): Promise<UnreadCountResponse> {
  return apiFetch("get", "/api/v1/notifications/unread-count");
}

export function markNotificationRead(notificationId: string): Promise<UnreadCountResponse> {
  return apiFetch("post", "/api/v1/notifications/{notificationId}/read", {
    params: { notificationId },
  });
}

export function markAllNotificationsRead(): Promise<UnreadCountResponse> {
  return apiFetch("post", "/api/v1/notifications/read-all");
}
