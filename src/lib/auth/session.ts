import { apiFetch } from "@/lib/api/client";
import { getCampaignAttributionHeader } from "@/features/campaign-quiz/campaignAttribution";

export function fetchCurrentUser() {
  const attribution = getCampaignAttributionHeader();
  return apiFetch("get", "/api/v1/users/me", {
    ...(attribution
      ? { headers: { "X-QuizBall-Campaign-Attribution": attribution } }
      : {}),
  });
}
