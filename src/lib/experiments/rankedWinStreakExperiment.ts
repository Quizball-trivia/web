import { posthog } from '@/lib/posthog';

export const RANKED_WIN_STREAK_EXPERIMENT_KEY = 'ranked-results-win-streak';

export type RankedWinStreakExperimentVariant = 'control' | 'test' | 'not_enrolled';

const FLAG_LOAD_TIMEOUT_MS = 4_000;

export function getPostMatchWinStreakCount({
  matchType,
  winnerId,
  selfUserId,
  cancelledNoContest,
  preMatchWinStreak,
}: {
  matchType: 'ranked' | 'friendly';
  winnerId?: string | null;
  selfUserId: string;
  cancelledNoContest: boolean;
  preMatchWinStreak?: number | null;
}): number | null {
  if (
    matchType !== 'ranked'
    || cancelledNoContest
    || winnerId !== selfUserId
    || !Number.isInteger(preMatchWinStreak)
    || (preMatchWinStreak ?? 0) < 1
  ) {
    return null;
  }

  return (preMatchWinStreak ?? 0) + 1;
}

/**
 * Load the experiment only after application-level eligibility is known.
 * Accessing this single flag records PostHog's exposure event; failures keep
 * the existing result screen and do not enroll the player into the test.
 */
export function loadRankedWinStreakExperimentVariant({
  streakCount,
  createdAt,
}: {
  streakCount: number;
  createdAt?: string | null;
}): Promise<RankedWinStreakExperimentVariant> {
  if (
    streakCount < 2
    || typeof window === 'undefined'
    || !process.env.NEXT_PUBLIC_POSTHOG_KEY
  ) {
    return Promise.resolve('not_enrolled');
  }

  if (createdAt) {
    posthog.setPersonPropertiesForFlags({ created_at: createdAt }, false);
  }

  const flagsWereAlreadyLoaded = posthog.featureFlags.hasLoadedFlags;
  posthog.featureFlags.setReloadingPaused(false);

  return new Promise((resolve) => {
    let callbackCount = 0;
    let settled = false;
    const cleanup: {
      unsubscribe?: () => void;
      timeoutId?: ReturnType<typeof setTimeout>;
    } = {};

    const finish = (variant: RankedWinStreakExperimentVariant) => {
      if (settled) return;
      settled = true;
      if (cleanup.timeoutId) clearTimeout(cleanup.timeoutId);
      cleanup.unsubscribe?.();
      posthog.featureFlags.setReloadingPaused(true);
      resolve(variant);
    };

    cleanup.unsubscribe = posthog.onFeatureFlags((_flags, _variants, context) => {
      callbackCount += 1;

      if (flagsWereAlreadyLoaded && callbackCount === 1) return;
      if (context?.errorsLoading) {
        finish('not_enrolled');
        return;
      }

      const value = posthog.getFeatureFlag(RANKED_WIN_STREAK_EXPERIMENT_KEY);
      if (value === 'test' || value === 'control') {
        finish(value);
        return;
      }
      finish('not_enrolled');
    });

    cleanup.timeoutId = setTimeout(() => finish('not_enrolled'), FLAG_LOAD_TIMEOUT_MS);
    posthog.reloadFeatureFlags();
  });
}
