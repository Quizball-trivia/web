import { API_BASE_URL } from "@/lib/config";
import { getSupabaseAccessToken } from "@/lib/auth/supabase";
import { ApiError } from "@/lib/api/api";

export interface EventAwardResponse {
  id: string;
  eventSlug: string;
  place: 1 | 2 | 3;
  awardedAt: string;
  seen: boolean;
}

export interface EventAwardsApiResponse {
  awards: EventAwardResponse[];
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSupabaseAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError("Request failed", res.status, data);
  }
  return res.json();
}

export async function getMyEventAwards() {
  const data = await requestJson<EventAwardsApiResponse>("/api/v1/users/me/event-awards");
  return { data: data.awards, error: null };
}

export async function getUserEventAwards(userId: string) {
  const data = await requestJson<EventAwardsApiResponse>(
    `/api/v1/users/${encodeURIComponent(userId)}/event-awards`
  );
  return { data: data.awards, error: null };
}

export async function ackEventAward(awardId: string) {
  const data = await requestJson<{ acknowledged: boolean }>(
    `/api/v1/users/me/event-awards/${encodeURIComponent(awardId)}/seen`,
    { method: "POST" }
  );
  return { data, error: null };
}
