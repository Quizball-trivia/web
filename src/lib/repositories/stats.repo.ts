import { api } from "@/lib/api/api";
import type { paths } from "@/types/api.generated";

export type HeadToHeadQuery =
  paths["/api/v1/stats/head-to-head"]["get"]["parameters"]["query"];
export type HeadToHeadResponse =
  paths["/api/v1/stats/head-to-head"]["get"]["responses"]["200"]["content"]["application/json"];
export type RecentMatchesQuery =
  paths["/api/v1/stats/recent-matches"]["get"]["parameters"]["query"];
export type RecentMatchesResponse =
  paths["/api/v1/stats/recent-matches"]["get"]["responses"]["200"]["content"]["application/json"];
export type StatsSummaryResponse =
  paths["/api/v1/stats/summary"]["get"]["responses"]["200"]["content"]["application/json"];

export async function getHeadToHead(query: HeadToHeadQuery) {
  return api.GET("/api/v1/stats/head-to-head", { query });
}

export async function getRecentMatches(query?: RecentMatchesQuery) {
  return api.GET("/api/v1/stats/recent-matches", { query });
}

export async function getStatsSummary() {
  return api.GET("/api/v1/stats/summary");
}
