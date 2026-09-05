import { apiFetch } from "@/lib/api/client";
import type { components } from "@/types/api.generated";

export type ListAnnouncementsResponse = components["schemas"]["ListAnnouncementsResponse"];
export type AnnouncementItem = ListAnnouncementsResponse["items"][number];
export type AnnouncementType = AnnouncementItem["type"];

export function getActiveAnnouncements(): Promise<ListAnnouncementsResponse> {
  return apiFetch("get", "/api/v1/announcements");
}
