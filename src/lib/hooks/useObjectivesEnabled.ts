import { useEffect, useState } from 'react';

import { posthog } from '@/lib/posthog';

const OBJECTIVES_FLAG = 'objectives_enabled';

// Explicit env override — wins everywhere, including localhost. Set
// NEXT_PUBLIC_OBJECTIVES_ENABLED="false" in .env.local to hide Objectives
// locally the same way the PostHog flag / backend env hide them on
// staging/prod. "true" force-shows; unset falls back to the PostHog flag.
const envOverride = process.env.NEXT_PUBLIC_OBJECTIVES_ENABLED;

// PostHog (and therefore flags) runs wherever a project key is configured
// (prod + staging). Locally there's no key, so we fall back to "visible" unless
// the env override above hides it.
const posthogActive = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

/**
 * Reactively reports whether the Objectives feature is enabled. Precedence:
 * 1. NEXT_PUBLIC_OBJECTIVES_ENABLED env override ("false" hides, "true" shows),
 * 2. the PostHog `objectives_enabled` flag on real deployments,
 * 3. visible by default in local dev so the feature stays developable.
 */
function resolveInitial(): boolean {
  if (envOverride != null) return envOverride !== 'false';
  if (!posthogActive || typeof window === 'undefined') return true;
  // PostHog may already have a bootstrapped/cached value on first render; use it
  // rather than defaulting to a hard `false`, which would make consumers redirect
  // or hide Objectives before the flag has resolved. Unknown → visible.
  return posthog.isFeatureEnabled(OBJECTIVES_FLAG) ?? true;
}

export function useObjectivesEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(resolveInitial);

  useEffect(() => {
    if (envOverride != null || !posthogActive) return;
    return posthog.onFeatureFlags(() => {
      setEnabled(posthog.isFeatureEnabled(OBJECTIVES_FLAG) === true);
    });
  }, []);

  return enabled;
}
