import type { User } from '@/lib/types';
import { posthog } from '@/lib/posthog';

export const MOBILE_VERIFICATION_EXPERIMENT_KEY = 'onboarding-mobile-verification';

export type MobileVerificationExperimentVariant = 'control' | 'test';

const FLAG_LOAD_TIMEOUT_MS = 4_000;

type ExperimentUser = Pick<
  User,
  'id' | 'created_at' | 'country' | 'onboarding_complete' | 'phone_verified_at'
>;

/**
 * Load exactly one experiment flag for an eligible onboarding user.
 *
 * Normal app-wide flag reloads stay paused to avoid bringing back the old
 * ~15k/day flag-request cost. Failures deliberately return control so analytics
 * can never make onboarding unavailable.
 */
export function loadMobileVerificationExperimentVariant(
  user: ExperimentUser,
): Promise<MobileVerificationExperimentVariant> {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return Promise.resolve('control');
  }

  // New users can reach this code before their identify event has been
  // ingested. Send the targeting properties with the flag request so the
  // created_at audience condition is reliable immediately.
  posthog.setPersonPropertiesForFlags(
    {
      created_at: user.created_at,
      country: user.country ?? undefined,
      onboarding_complete: user.onboarding_complete,
      phone_verified_at: user.phone_verified_at ?? undefined,
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

    const finish = (variant: MobileVerificationExperimentVariant) => {
      if (settled) return;
      settled = true;
      if (cleanup.timeoutId) clearTimeout(cleanup.timeoutId);
      cleanup.unsubscribe?.();
      posthog.featureFlags.setReloadingPaused(true);
      resolve(variant);
    };

    cleanup.unsubscribe = posthog.onFeatureFlags((_flags, _variants, context) => {
      callbackCount += 1;

      // onFeatureFlags immediately returns cached values when present. Ignore
      // that first callback and wait for the explicitly requested fresh result.
      if (flagsWereAlreadyLoaded && callbackCount === 1) return;

      if (context?.errorsLoading) {
        finish('control');
        return;
      }

      // This access emits PostHog's $feature_flag_called exposure event. Only
      // exposed users belong in the experiment analysis.
      const value = posthog.getFeatureFlag(MOBILE_VERIFICATION_EXPERIMENT_KEY);
      finish(value === 'test' ? 'test' : 'control');
    });

    cleanup.timeoutId = setTimeout(() => finish('control'), FLAG_LOAD_TIMEOUT_MS);
    posthog.reloadFeatureFlags();
  });
}
