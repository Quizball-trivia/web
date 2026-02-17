import { api } from "@/lib/api/api";
import type { paths } from "@/types/api.generated";

export type RankedProfileResponse =
  paths["/api/v1/ranked/profile"]["get"]["responses"]["200"]["content"]["application/json"];

export async function getRankedProfile() {
  return api.GET("/api/v1/ranked/profile");
}
