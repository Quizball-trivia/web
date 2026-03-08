import { API_BASE_URL } from "@/lib/config";
import { getAccessToken } from "@/lib/auth/tokenStorage";
import type { LeaderboardType } from "@/lib/domain/leaderboard";

export interface LeaderboardEntryResponse {
  userId: string;
  rank: number;
  username: string;
  avatarUrl: string | null;
  rp: number;
  tier: string;
  country: string | null;
}

export interface LeaderboardApiResponse {
  entries: LeaderboardEntryResponse[];
}

export interface UserRankResponse {
  userId: string;
  username: string;
  avatarUrl: string | null;
  rp: number;
  tier: string;
  rank: number;
  total: number;
}

async function authFetch<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
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

export async function getUserRank(userId: string, type: LeaderboardType = "global") {
  const scope = scopeFromType(type);
  const data = await authFetch<UserRankResponse | null>(
    `/api/v1/ranked/leaderboard/me?scope=${scope}`
  );
  return { data, error: null };
}
