import { useEffect, useState } from 'react';

import { posthog } from '@/lib/posthog';

const OBJECTIVES_FLAG = 'objectives_enabled';
const hasPostHogKey = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

/**
 * Reactively reports whether the Objectives feature is enabled, gated behind the
 * PostHog `objectives_enabled` flag so it can be toggled per-environment without
 * a deploy. When PostHog isn't configured (local dev) Objectives stay visible so
 * the feature is still developable. While the flag is still loading we keep it
 * hidden to avoid a flash of Objectives that then disappears.
 */
export function useObjectivesEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(!hasPostHogKey);

  useEffect(() => {
    if (!hasPostHogKey) return;
    return posthog.onFeatureFlags(() => {
      setEnabled(posthog.isFeatureEnabled(OBJECTIVES_FLAG) === true);
    });
  }, []);

  return enabled;
}
