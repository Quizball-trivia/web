import { apiFetch } from "@/lib/api/client";
import type { HttpMethod } from "@/lib/api/api";

// Notification response shapes, hand-typed to match the backend notifications
// module. These paths are intentionally NOT taken from api.generated.ts: the
// web `paths` type is regenerated from the store spec on a separate cadence and
// currently lags the backend, so regenerating the whole file to pick up the
// notification routes would drop unrelated newer fields. Keeping these local
// decouples the feature from that regen.
export interface NotificationItem {
  id: string;
  type: string;
  title: Record<string, string>;
  body: Record<string, string> | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface ListNotificationsResponse {
  items: NotificationItem[];
  unreadCount: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

/**
 * Thin wrapper over apiFetch for the notification endpoints. apiFetch is keyed
 * to generated `paths`, which don't yet include these routes — so we bridge the
 * path/options/response through a single typed boundary here (the only place
 * the untyped routes live) and return the known shape.
 */
async function notificationFetch<T>(
  method: HttpMethod,
  path: string,
  options?: { params?: Record<string, string> }
): Promise<T> {
  const typedFetch = apiFetch as unknown as (
    method: HttpMethod,
    path: string,
    options?: { params?: Record<string, string> }
  ) => Promise<T>;
  return typedFetch(method, path, options);
}

export function getNotifications(): Promise<ListNotificationsResponse> {
  return notificationFetch<ListNotificationsResponse>("get", "/api/v1/notifications");
}

export function getUnreadCount(): Promise<UnreadCountResponse> {
  return notificationFetch<UnreadCountResponse>("get", "/api/v1/notifications/unread-count");
}

export function markNotificationRead(notificationId: string): Promise<UnreadCountResponse> {
  return notificationFetch<UnreadCountResponse>(
    "post",
    "/api/v1/notifications/{notificationId}/read",
    { params: { notificationId } }
  );
}

export function markAllNotificationsRead(): Promise<UnreadCountResponse> {
  return notificationFetch<UnreadCountResponse>("post", "/api/v1/notifications/read-all");
}
