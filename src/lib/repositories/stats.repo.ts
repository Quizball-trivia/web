import { api } from "@/lib/api/api";
import type { paths } from "@/types/api.generated";

export type HeadToHeadQuery =
  paths["/api/v1/stats/head-to-head"]["get"]["parameters"]["query"];
export type HeadToHeadResponse =
  paths["/api/v1/stats/head-to-head"]["get"]["responses"]["200"]["content"]["application/json"];

export async function getHeadToHead(query: HeadToHeadQuery) {
  return api.GET("/api/v1/stats/head-to-head", { query });
}
