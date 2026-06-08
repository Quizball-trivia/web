import { useEffect, useState } from 'react';

import { posthog } from '@/lib/posthog';

const OBJECTIVES_FLAG = 'objectives_enabled';

// PostHog (and therefore flags) only runs on real deployments — production and
// staging ("preview"). Locally it's off, so we leave Objectives visible there
// to keep the feature developable.
const deployEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
const posthogActive =
  Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
  (deployEnv === 'production' || deployEnv === 'preview');

/**
 * Reactively reports whether the Objectives feature is enabled, gated behind the
 * PostHog `objectives_enabled` flag so it can be toggled per-environment without
 * a deploy. When PostHog isn't active (local dev) Objectives stay visible. While
 * the flag is still loading we keep it hidden to avoid a flash of Objectives that
 * then disappears.
 */
export function useObjectivesEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(!posthogActive);

  useEffect(() => {
    if (!posthogActive) return;
    return posthog.onFeatureFlags(() => {
      setEnabled(posthog.isFeatureEnabled(OBJECTIVES_FLAG) === true);
    });
  }, []);

  return enabled;
}
