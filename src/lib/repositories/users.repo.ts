import { API_BASE_URL } from "@/lib/config";
import { getAccessToken } from "@/lib/auth/tokenStorage";
import { ApiError } from "@/lib/api/api";
import type { components } from "@/types/api.generated";
import type { Achievement } from "@/types/game";

export type PublicProfileResponse = components["schemas"]["PublicProfileResponse"];

export interface AchievementsResponse {
  achievements: Achievement[];
}

export async function getPublicProfile(userId: string): Promise<PublicProfileResponse> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/users/${encodeURIComponent(userId)}/profile`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError("Request failed", res.status, data);
  }

  return res.json();
}

export async function getMyAchievements(): Promise<AchievementsResponse> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/users/me/achievements`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError("Request failed", res.status, data);
  }

  return res.json();
}

export async function getUserAchievements(userId: string): Promise<AchievementsResponse> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/users/${encodeURIComponent(userId)}/achievements`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError("Request failed", res.status, data);
  }

  return res.json();
}
