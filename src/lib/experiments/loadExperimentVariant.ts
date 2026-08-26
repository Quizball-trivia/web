import { posthog } from '@/lib/posthog';

export type ExperimentVariant = 'control' | 'test' | 'not_enrolled';

const FLAG_LOAD_TIMEOUT_MS = 4_000;

/**
 * Loads exactly one application-owned experiment flag after eligibility is
 * known. Global automatic reloads stay paused so unrelated flags do not create
 * accidental exposures on every page view.
 */
export function loadExperimentVariant(
  key: string,
  personProperties?: Record<string, string | number | boolean | null | undefined>,
): Promise<ExperimentVariant> {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return Promise.resolve('not_enrolled');
  }

  if (personProperties) {
    posthog.setPersonPropertiesForFlags(personProperties, false);
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

    const finish = (variant: ExperimentVariant) => {
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

      const value = posthog.getFeatureFlag(key);
      finish(value === 'test' || value === 'control' ? value : 'not_enrolled');
    });

    cleanup.timeoutId = setTimeout(() => finish('not_enrolled'), FLAG_LOAD_TIMEOUT_MS);
    posthog.reloadFeatureFlags();
  });
}
