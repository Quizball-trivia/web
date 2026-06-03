import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import {
  completeDailyChallenge,
  createDailyChallengeSession,
  getDailyChallenges,
  resetDailyChallengeDev,
} from "@/lib/repositories/dailyChallenges.repo";
import { toDailyChallengeSession } from "@/lib/mappers/dailyChallenge.mapper";
import type { DailyChallengeSummary, DailyChallengeType } from "@/lib/domain/dailyChallenge";
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

  // Patch only the "list" caches (locale-scoped, so all variants). Session
  // caches share the prefix but hold a non-array shape this updater must skip.
  const isListQuery = (key: readonly unknown[]) =>
    key[0] === "dailyChallenges" && key[1] === "list";

  return useMutation({
    mutationFn: (score: number) => completeDailyChallenge(challengeType, score),
    // Flip the challenge to completed the INSTANT completion starts, before the
    // network write — so the card is blurred and unpressable by the time the
    // user lands back on the hub, with no wait for the round-trip. Snapshot the
    // prior caches so we can roll back if the write fails.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dailyChallenges.all });
      const previous = queryClient.getQueriesData<DailyChallengeSummary[]>({
        predicate: (query) => isListQuery(query.queryKey),
      });
      queryClient.setQueriesData<DailyChallengeSummary[]>(
        { predicate: (query) => isListQuery(query.queryKey) },
        (current) =>
          current?.map((c) =>
            c.challengeType === challengeType
              ? { ...c, completedToday: true, availableToday: false }
              : c,
          ),
      );
      return { previous };
    },
    onError: (_error, _score, context) => {
      // Write failed — restore the pre-mutation caches so the card isn't wrongly
      // shown as completed.
      context?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: async () => {
      // Reconcile with the server (rewards, exact availability) once done.
      await queryClient.invalidateQueries({ queryKey: queryKeys.dailyChallenges.all });
    },
  });
}

export function useResetDailyChallengeDev(challengeType: DailyChallengeType) {
  return useMutation({
    mutationFn: () => resetDailyChallengeDev(challengeType),
  });
}
