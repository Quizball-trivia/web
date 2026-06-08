import { useEffect, useState } from 'react';

import { posthog } from '@/lib/posthog';

const OBJECTIVES_FLAG = 'objectives_enabled';

// Explicit env override — wins everywhere, including localhost. Set
// NEXT_PUBLIC_OBJECTIVES_ENABLED="false" in .env.local to hide Objectives
// locally the same way the PostHog flag / backend env hide them on
// staging/prod. "true" force-shows; unset falls back to the PostHog flag.
const envOverride = process.env.NEXT_PUBLIC_OBJECTIVES_ENABLED;

// PostHog (and therefore flags) only runs on real deployments — production and
// staging ("preview"). Locally it's off, so we fall back to "visible" unless the
// env override above hides it.
const deployEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
const posthogActive =
  Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
  (deployEnv === 'production' || deployEnv === 'preview');

/**
 * Reactively reports whether the Objectives feature is enabled. Precedence:
 * 1. NEXT_PUBLIC_OBJECTIVES_ENABLED env override ("false" hides, "true" shows),
 * 2. the PostHog `objectives_enabled` flag on real deployments,
 * 3. visible by default in local dev so the feature stays developable.
 */
export function useObjectivesEnabled(): boolean {
  const initial = envOverride != null ? envOverride !== 'false' : !posthogActive;
  const [enabled, setEnabled] = useState<boolean>(initial);

  useEffect(() => {
    if (envOverride != null || !posthogActive) return;
    return posthog.onFeatureFlags(() => {
      setEnabled(posthog.isFeatureEnabled(OBJECTIVES_FLAG) === true);
    });
  }, []);

  return enabled;
}
