import { apiFetch } from "@/lib/api/client";
import type { components, paths } from "@/types/api.generated";
import type { Achievement } from "@/types/game";

export type PublicProfileResponse = components["schemas"]["PublicProfileResponse"];
export type AccountDeletionResponse =
  paths["/api/v1/users/me/deletion"]["post"]["responses"][200]["content"]["application/json"];

export interface AchievementsResponse {
  achievements: Achievement[];
}

export async function requestAccountDeletion(): Promise<AccountDeletionResponse> {
  return apiFetch("post", "/api/v1/users/me/deletion");
}

export async function getPublicProfile(userId: string): Promise<PublicProfileResponse> {
  return apiFetch("get", "/api/v1/users/{userId}/profile", {
    params: { userId },
  });
}

export async function getMyAchievements(): Promise<AchievementsResponse> {
  return apiFetch("get", "/api/v1/users/me/achievements");
}

export async function getUserAchievements(userId: string): Promise<AchievementsResponse> {
  return apiFetch("get", "/api/v1/users/{userId}/achievements", {
    params: { userId },
  });
}
