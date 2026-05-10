import type { paths } from "@/types/api.generated";

export type ObjectivesResponse =
  paths["/api/v1/objectives"]["get"]["responses"]["200"]["content"]["application/json"];
export type ObjectivePeriod = ObjectivesResponse["daily"];
export type ObjectiveProgress = ObjectivePeriod["objectives"][number];
export type ObjectivePeriodType = ObjectiveProgress["periodType"];
