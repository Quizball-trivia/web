import { API_BASE_URL } from "@/lib/config";
import { getSupabaseAccessToken } from "@/lib/auth/supabase";
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

export interface LeaderboardSeasonResponse {
  id: string;
  seasonNumber: number;
  startedAt: string;
  endedAt: string | null;
}

export interface LeaderboardSeasonsApiResponse {
  seasons: LeaderboardSeasonResponse[];
  currentSeasonNumber: number;
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
  const token = await getSupabaseAccessToken();
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

function scopeFromType(type: LeaderboardType): string {
  if (type === "country") return "country";
  return "global";
}

export async function getLeaderboard(
  type: LeaderboardType = "global",
  limit = 50,
  offset = 0,
  season?: string,
) {
  const scope = scopeFromType(type);
  const seasonParam = season ? `&season=${season}` : "";
  const data = await requestJson<LeaderboardApiResponse>(
    `/api/v1/ranked/leaderboard?scope=${scope}&limit=${limit}&offset=${offset}${seasonParam}`
  );
  return { data: data.entries, error: null };
}

export async function getUserRank(type: LeaderboardType = "global", season?: string) {
  const scope = scopeFromType(type);
  const seasonParam = season ? `&season=${season}` : "";
  const data = await requestJson<UserRankResponse | null>(
    `/api/v1/ranked/leaderboard/me?scope=${scope}${seasonParam}`
  );
  return { data, error: null };
}

export async function getLeaderboardSeasons() {
  const data = await requestJson<LeaderboardSeasonsApiResponse>(
    "/api/v1/ranked/leaderboard/seasons"
  );
  return { data, error: null };
}
