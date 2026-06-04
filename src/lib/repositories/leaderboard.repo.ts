import { API_BASE_URL } from "@/lib/config";
import { getAccessToken } from "@/lib/auth/tokenStorage";
import { refreshSession } from "@/lib/auth/auth.service";
import { ApiError } from "@/lib/api/api";
import type { LeaderboardType } from "@/lib/domain/leaderboard";
import type { AvatarCustomization } from "@/types/game";

export interface LeaderboardEntryResponse {
  userId: string;
  rank: number;
  username: string;
  avatarUrl: string | null;
  avatarCustomization: AvatarCustomization | null;
  rp: number;
  tier: string;
  country: string | null;
  trend: 'up' | 'down' | 'same';
  trendValue: number;
}

export interface LeaderboardApiResponse {
  entries: LeaderboardEntryResponse[];
}

export interface UserRankResponse {
  userId: string;
  username: string;
  avatarUrl: string | null;
  avatarCustomization: AvatarCustomization | null;
  country: string | null;
  rp: number;
  tier: string;
  rank: number;
  total: number;
  trend: 'up' | 'down' | 'same';
  trendValue: number;
}

async function requestJson<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError("Request failed", res.status, data);
  }
  return res.json();
}

async function authFetch<T>(path: string): Promise<T> {
  try {
    return await requestJson<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const refreshed = await refreshSession();
      if (refreshed.ok) {
        return requestJson<T>(path);
      }
    }
    throw error;
  }
}

function scopeFromType(type: LeaderboardType): string {
  if (type === "country") return "country";
  return "global";
}

export async function getLeaderboard(type: LeaderboardType = "global", limit = 50, offset = 0) {
  const scope = scopeFromType(type);
  const data = await authFetch<LeaderboardApiResponse>(
    `/api/v1/ranked/leaderboard?scope=${scope}&limit=${limit}&offset=${offset}`
  );
  return { data: data.entries, error: null };
}

export async function getUserRank(type: LeaderboardType = "global") {
  const scope = scopeFromType(type);
  const data = await authFetch<UserRankResponse | null>(
    `/api/v1/ranked/leaderboard/me?scope=${scope}`
  );
  return { data, error: null };
}
