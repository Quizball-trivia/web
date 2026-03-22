import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import {
  completeDailyChallenge,
  createDailyChallengeSession,
  getDailyChallenges,
  resetDailyChallengeDev,
} from "@/lib/repositories/dailyChallenges.repo";
import type { DailyChallengeType } from "@/lib/domain/dailyChallenge";

export function useDailyChallenges() {
  return useQuery({
    queryKey: queryKeys.dailyChallenges.list(),
    queryFn: async () => {
      const data = await getDailyChallenges();
      return data.items;
    },
    staleTime: 60_000,
    gcTime: 15 * 60_000,
  });
}

export function useDailyChallengeSession(challengeType?: DailyChallengeType) {
  return useMutation({
    mutationFn: () => createDailyChallengeSession(challengeType!),
    retry: 0,
  });
}

export function useCompleteDailyChallenge(challengeType: DailyChallengeType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (score: number) => completeDailyChallenge(challengeType, score),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.dailyChallenges.list() });
    },
  });
}

export function useResetDailyChallengeDev(challengeType: DailyChallengeType) {
  return useMutation({
    mutationFn: () => resetDailyChallengeDev(challengeType),
  });
}
