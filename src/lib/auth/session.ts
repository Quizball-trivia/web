import { apiFetch } from "@/lib/api/client";

export function fetchCurrentUser() {
  return apiFetch("get", "/api/v1/users/me");
}
