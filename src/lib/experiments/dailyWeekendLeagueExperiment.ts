import { posthog } from '@/lib/posthog';

export const DAILY_WEEKEND_LEAGUE_EXPERIMENT_KEY = 'daily-completion-weekend-league-cta';

export type DailyWeekendLeagueExperimentVariant = 'control' | 'test' | 'not_enrolled';

const FLAG_LOAD_TIMEOUT_MS = 4_000;
const ELIGIBLE_COUNTRY = 'GE';

/**
 * Load the flag only after the completion modal and live Weekend League status
 * are both ready. Reading this flag records the experiment exposure; failures
 * preserve the existing completion modal and do not enroll the player.
 */
export function loadDailyWeekendLeagueExperimentVariant({
  createdAt,
  country,
}: {
  createdAt?: string | null;
  country?: string | null;
}): Promise<DailyWeekendLeagueExperimentVariant> {
  const normalizedCountry = country?.trim().toUpperCase();
  if (
    typeof window === 'undefined'
    || !process.env.NEXT_PUBLIC_POSTHOG_KEY
    || normalizedCountry !== ELIGIBLE_COUNTRY
  ) {
    return Promise.resolve('not_enrolled');
  }

  posthog.setPersonPropertiesForFlags(
    {
      created_at: createdAt ?? undefined,
      country: normalizedCountry,
    },
    false,
  );

  const flagsWereAlreadyLoaded = posthog.featureFlags.hasLoadedFlags;
  posthog.featureFlags.setReloadingPaused(false);

  return new Promise((resolve) => {
    let callbackCount = 0;
    let settled = false;
    const cleanup: {
      unsubscribe?: () => void;
      timeoutId?: ReturnType<typeof setTimeout>;
    } = {};

    const finish = (variant: DailyWeekendLeagueExperimentVariant) => {
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

      const value = posthog.getFeatureFlag(DAILY_WEEKEND_LEAGUE_EXPERIMENT_KEY);
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
