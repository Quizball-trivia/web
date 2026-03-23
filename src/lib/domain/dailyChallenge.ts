import type { components, paths } from "@/types/api.generated";

export type DailyChallengeSummary = components["schemas"]["DailyChallengeMetadata"];
export type DailyChallengeType = DailyChallengeSummary["challengeType"];
export type DailyChallengeIconToken = DailyChallengeSummary["iconToken"];

type ApiDailyChallengeSession =
  components["schemas"]["DailyChallengeSessionResponse"];
type ApiPutInOrderSession = Extract<
  ApiDailyChallengeSession,
  { challengeType: "putInOrder" }
>;
export type PutInOrderRound = ApiPutInOrderSession["rounds"][number] & {
  instruction?: string;
};
export type PutInOrderSession = Omit<ApiPutInOrderSession, "rounds"> & {
  rounds: PutInOrderRound[];
};
export type DailyChallengeSession =
  | Exclude<ApiDailyChallengeSession, { challengeType: "putInOrder" }>
  | PutInOrderSession;

export type MoneyDropSession = Extract<
  DailyChallengeSession,
  { challengeType: "moneyDrop" }
>;

export type FootballJeopardySession = Extract<
  DailyChallengeSession,
  { challengeType: "footballJeopardy" }
>;

export type CountdownSession = Extract<
  DailyChallengeSession,
  { challengeType: "countdown" }
>;

export type CluesSession = Extract<
  DailyChallengeSession,
  { challengeType: "clues" }
>;

export type DailyChallengeCompletionResult =
  components["schemas"]["CompleteDailyChallengeResponse"];

export type ResetDailyChallengeResult =
  components["schemas"]["ResetDailyChallengeResponse"];

export type AdminDailyChallengeConfig =
  components["schemas"]["AdminDailyChallengeConfigResponse"];

export type ListDailyChallengesResponse =
  paths["/api/v1/daily-challenges"]["get"]["responses"]["200"]["content"]["application/json"];

export type ListAdminDailyChallengesResponse =
  paths["/api/v1/admin/daily-challenges"]["get"]["responses"]["200"]["content"]["application/json"];

export type CompleteDailyChallengeRequest =
  paths["/api/v1/daily-challenges/{challengeType}/complete"]["post"]["requestBody"]["content"]["application/json"];
