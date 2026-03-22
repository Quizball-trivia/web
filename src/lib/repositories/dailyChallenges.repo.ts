import { apiFetch } from "@/lib/api/client";
import type {
  CompleteDailyChallengeRequest,
  ListAdminDailyChallengesResponse,
  ListDailyChallengesResponse,
  DailyChallengeCompletionResult,
  DailyChallengeSession,
  ResetDailyChallengeResult,
  DailyChallengeType,
} from "@/lib/domain/dailyChallenge";

function getPutInOrderInstruction(direction: string | undefined): string {
  const normalizedDirection = direction?.toLowerCase();

  if (normalizedDirection === "desc") {
    return "highest to lowest";
  }

  return "lowest to highest";
}

export async function getDailyChallenges(): Promise<ListDailyChallengesResponse> {
  return apiFetch("get", "/api/v1/daily-challenges");
}

export async function getAdminDailyChallenges(): Promise<ListAdminDailyChallengesResponse> {
  return apiFetch("get", "/api/v1/admin/daily-challenges");
}

export async function createDailyChallengeSession(
  challengeType: DailyChallengeType
): Promise<DailyChallengeSession> {
  const session = await apiFetch("post", "/api/v1/daily-challenges/{challengeType}/session", {
    params: { challengeType },
  });

  if (session.challengeType !== "putInOrder") {
    return session;
  }

  return {
    ...session,
    rounds: session.rounds.map((round) => ({
      ...round,
      instruction: getPutInOrderInstruction(round.direction),
    })),
  };
}

export async function completeDailyChallenge(
  challengeType: DailyChallengeType,
  score: number
): Promise<DailyChallengeCompletionResult> {
  const body: CompleteDailyChallengeRequest = { score };

  return apiFetch("post", "/api/v1/daily-challenges/{challengeType}/complete", {
    params: { challengeType },
    body,
  });
}

export async function resetDailyChallengeDev(
  challengeType: DailyChallengeType
): Promise<ResetDailyChallengeResult> {
  return apiFetch("delete", "/api/v1/daily-challenges/dev/{challengeType}/reset", {
    params: { challengeType },
  });
}
