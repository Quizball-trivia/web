import { apiFetch } from "@/lib/api/client";
import type {
  CompleteDailyChallengeRequest,
  ListAdminDailyChallengesResponse,
  ListDailyChallengesResponse,
  DailyChallengeCompletionResult,
  DailyComebackState,
  SetDailyComebackReminderResult,
  ResetDailyChallengeResult,
  DailyChallengeType,
} from "@/lib/domain/dailyChallenge";
import { getDailyChallengeLocale } from "@/lib/i18n/dailyChallenge";
import { type Locale } from "@/lib/i18n/messages";

export async function getDailyChallenges(locale: Locale = getDailyChallengeLocale()): Promise<ListDailyChallengesResponse> {
  return apiFetch("get", "/api/v1/daily-challenges", {
    query: { locale },
  });
}

export async function getAdminDailyChallenges(): Promise<ListAdminDailyChallengesResponse> {
  return apiFetch("get", "/api/v1/admin/daily-challenges");
}

export async function createDailyChallengeSession(
  challengeType: DailyChallengeType,
  locale: Locale = getDailyChallengeLocale()
) {
  return apiFetch("post", "/api/v1/daily-challenges/{challengeType}/session", {
    params: { challengeType },
    query: { locale },
  });
}

export async function completeDailyChallenge(
  challengeType: DailyChallengeType,
  score: number,
  outcomes?: CompleteDailyChallengeRequest["outcomes"]
): Promise<DailyChallengeCompletionResult> {
  const body: CompleteDailyChallengeRequest = outcomes && outcomes.length > 0 ? { score, outcomes } : { score };

  return apiFetch("post", "/api/v1/daily-challenges/{challengeType}/complete", {
    params: { challengeType },
    body,
  });
}

export async function getDailyComebackState(): Promise<DailyComebackState> {
  return apiFetch("get", "/api/v1/daily-challenges/comeback");
}

export async function setDailyComebackReminder(
  enabled: boolean
): Promise<SetDailyComebackReminderResult> {
  return apiFetch("put", "/api/v1/daily-challenges/comeback/reminder", {
    body: { enabled },
  });
}

export async function resetDailyChallengeDev(
  challengeType: DailyChallengeType
): Promise<ResetDailyChallengeResult> {
  return apiFetch("delete", "/api/v1/daily-challenges/dev/{challengeType}/reset", {
    params: { challengeType },
  });
}
