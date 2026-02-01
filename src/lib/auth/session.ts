import { apiFetch } from "@/lib/api/client";

export function bootstrapUser() {
  return apiFetch("get", "/api/v1/users/me");
}
