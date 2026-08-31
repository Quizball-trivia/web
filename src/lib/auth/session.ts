import { apiFetch } from "@/lib/api/client";
import { getCampaignAttributionHeader } from "@/features/campaign-quiz/campaignAttribution";
import { getUtmAttributionHeader } from "@/lib/analytics/utmAttribution";

export function fetchCurrentUser() {
  const attribution = getCampaignAttributionHeader();
  const utm = getUtmAttributionHeader();
  const headers = {
    ...(attribution ? { "X-QuizBall-Campaign-Attribution": attribution } : {}),
    ...(utm ? { "X-QuizBall-Utm": utm } : {}),
  };
  return apiFetch("get", "/api/v1/users/me", {
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  });
}
