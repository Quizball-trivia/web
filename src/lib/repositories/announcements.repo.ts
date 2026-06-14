import { apiFetch } from "@/lib/api/client";
import type { HttpMethod } from "@/lib/api/api";

// Announcement response shapes, hand-typed to match the backend announcements
// module. Like notifications.repo, these paths are intentionally NOT taken from
// api.generated.ts: the web `paths` type is regenerated on a separate cadence
// and lags the backend, so regenerating the whole file to pick up these routes
// would drop unrelated newer fields. Keeping these local decouples the feature.

export type AnnouncementType = "update" | "info" | "event";

export interface AnnouncementItem {
  id: string;
  title: Record<string, string>;
  body: Record<string, string>;
  type: AnnouncementType;
  isActive: boolean;
  activeFrom: string | null;
  activeTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListAnnouncementsResponse {
  items: AnnouncementItem[];
}

function announcementFetch<T>(method: HttpMethod, path: string): Promise<T> {
  const typedFetch = apiFetch as unknown as (method: HttpMethod, path: string) => Promise<T>;
  return typedFetch(method, path);
}

export function getActiveAnnouncements(): Promise<ListAnnouncementsResponse> {
  return announcementFetch<ListAnnouncementsResponse>("get", "/api/v1/announcements");
}
