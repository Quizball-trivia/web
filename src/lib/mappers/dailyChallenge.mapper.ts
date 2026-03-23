import type { components } from "@/types/api.generated";
import type { DailyChallengeSession, PutInOrderRound } from "@/lib/domain/dailyChallenge";

type ApiDailyChallengeSession = components["schemas"]["DailyChallengeSessionResponse"];

function getPutInOrderInstruction(direction: string): string {
  return direction === "desc" ? "highest to lowest" : "lowest to highest";
}

export function toDailyChallengeSession(session: ApiDailyChallengeSession): DailyChallengeSession {
  if (session.challengeType !== "putInOrder") {
    return session;
  }

  return {
    ...session,
    rounds: session.rounds.map((round): PutInOrderRound => ({
      ...round,
      instruction: getPutInOrderInstruction(round.direction),
    })),
  };
}
