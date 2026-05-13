import { apiFetch } from "@/lib/api/client";
import type { ObjectivesResponse } from "@/lib/domain/objective";

export async function getObjectives(): Promise<ObjectivesResponse> {
  return apiFetch("get", "/api/v1/objectives");
}
