import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  DAILY_CHALLENGE_COMPLETION_RETRY_DELAYS_MS,
  getDailyChallengeCompletionRetryDelay,
  isDailyChallengeAlreadyCompletedError,
  isRetryableDailyChallengeCompletionError,
} from "@/lib/queries/dailyChallengeCompletion";

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
    // Keep showing the last list while a refetch is in flight (e.g. the
    // post-completion invalidate, or a locale switch) so returning to the hub
    // never flashes the full-screen loading state.
    placeholderData: keepPreviousData,
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
    //
    // Cancel only the LIST queries (not `all`): cancelling `all` would also kill
    // an in-flight hub refetch, leaving that query with no data and stuck on the
    // full-screen "loading" state when the user returns to the hub.
    onMutate: async () => {
      await queryClient.cancelQueries({
        predicate: (query) => isListQuery(query.queryKey),
      });
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
    retry: (failureCount, error) =>
      failureCount < DAILY_CHALLENGE_COMPLETION_RETRY_DELAYS_MS.length &&
      isRetryableDailyChallengeCompletionError(error),
    retryDelay: (attemptIndex) => getDailyChallengeCompletionRetryDelay(attemptIndex),
    onError: (error, _score, context) => {
      if (isDailyChallengeAlreadyCompletedError(error)) return;

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
