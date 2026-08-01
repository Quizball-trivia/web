import { apiFetch } from "@/lib/api/client";
import type { paths } from "@/types/api.generated";

type UpdateMeBody =
  NonNullable<
    paths["/api/v1/users/me"]["put"]["requestBody"]
  >["content"]["application/json"];

export function getMe() {
  return apiFetch("get", "/api/v1/users/me");
}

export function updateMe(payload: UpdateMeBody) {
  return apiFetch("put", "/api/v1/users/me", {
    body: payload,
  });
}

export function resetOwnOnboarding() {
  return apiFetch("post", "/api/v1/users/me/reset-onboarding");
}

export function getWeekendLeagueCurrent() {
  return apiFetch("get", "/api/v1/weekend-league/current");
}

export function getWeekendLeagueQp() {
  return apiFetch("get", "/api/v1/weekend-league/qp");
}

export function enterWeekendLeague() {
  return apiFetch("post", "/api/v1/weekend-league/enter");
}

export function checkinWeekendLeague() {
  return apiFetch("post", "/api/v1/weekend-league/checkin");
}
