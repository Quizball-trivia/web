import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import {
  completeDailyChallenge,
  createDailyChallengeSession,
  getDailyChallenges,
  resetDailyChallengeDev,
} from "@/lib/repositories/dailyChallenges.repo";
import { toDailyChallengeSession } from "@/lib/mappers/dailyChallenge.mapper";
import type { DailyChallengeType } from "@/lib/domain/dailyChallenge";
import { useLocale } from "@/contexts/LocaleContext";

export function useDailyChallenges() {
  const { locale } = useLocale();

  return useQuery({
    queryKey: queryKeys.dailyChallenges.list(locale),
    queryFn: async () => {
      const data = await getDailyChallenges(locale);
      return data.items;
    },
    staleTime: 60_000,
    gcTime: 15 * 60_000,
  });
}

export function useDailyChallengeSession(challengeType?: DailyChallengeType) {
  const { locale } = useLocale();

  return useMutation({
    mutationFn: () => createDailyChallengeSession(challengeType!, locale).then(toDailyChallengeSession),
    retry: 0,
  });
}

export function useCompleteDailyChallenge(challengeType: DailyChallengeType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (score: number) => completeDailyChallenge(challengeType, score),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.dailyChallenges.all });
    },
  });
}

export function useResetDailyChallengeDev(challengeType: DailyChallengeType) {
  return useMutation({
    mutationFn: () => resetDailyChallengeDev(challengeType),
  });
}
