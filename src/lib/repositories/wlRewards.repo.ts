import { API_BASE_URL } from "@/lib/config";
import { getSupabaseAccessToken } from "@/lib/auth/supabase";
import { ApiError } from "@/lib/api/api";
import type { WlRewardReceipt } from "@/features/weekend-league/rewards/wlRewards";

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

export async function getMyWlRewards(): Promise<WlRewardReceipt[]> {
  const data = await requestJson<{ rewards: WlRewardReceipt[] }>("/api/v1/weekend-league/rewards");
  return data.rewards;
}

export async function ackWlReward(rewardId: string): Promise<{ acknowledged: boolean }> {
  return requestJson<{ acknowledged: boolean }>(
    `/api/v1/weekend-league/rewards/${encodeURIComponent(rewardId)}/seen`,
    { method: "POST" },
  );
}
