import { api, ApiError } from "@/lib/api/api";
import { API_BASE_URL } from "@/lib/config";
import { getAccessToken } from "@/lib/auth/tokenStorage";
import type { paths } from "@/types/api.generated";
import type { RankPosition } from "@/lib/domain";

export type RankedProfileResponse =
  paths["/api/v1/ranked/profile"]["get"]["responses"]["200"]["content"]["application/json"];

export async function getRankedProfile() {
  return api.GET("/api/v1/ranked/profile");
}

interface UserRankResponse {
  rank: number;
  total: number;
}

async function fetchUserRank(scope: "global" | "country"): Promise<RankPosition | null> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/ranked/leaderboard/me?scope=${scope}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError("Request failed", res.status, data);
  }
  const body: UserRankResponse | null = await res.json();
  return body ? { rank: body.rank, total: body.total } : null;
}

export async function getUserRanks(): Promise<{
  globalRank: RankPosition | null;
  countryRank: RankPosition | null;
}> {
  const [globalRank, countryRank] = await Promise.all([
    fetchUserRank("global"),
    fetchUserRank("country"),
  ]);
  return { globalRank, countryRank };
}
