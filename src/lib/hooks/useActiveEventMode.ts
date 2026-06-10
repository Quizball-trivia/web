import { useEffect, useState } from 'react';

import { posthog } from '@/lib/posthog';
import { useAuthStore } from '@/stores/auth.store';

// One flag gates the entire Georgia World Cup / Betsson event layer. When it is
// OFF (or unknown), the app renders the normal QuizBall UI everywhere — this is
// the dark-launch contract: flag off === current QuizBall, byte-for-byte.
const EVENT_FLAG = 'georgia_world_cup_event_enabled';

// The eligible competitive region for participation. Stored user country is the
// source of truth (NOT live IP) — a GE account always participates; a non-GE
// account never does, regardless of where they currently connect from.
const ELIGIBLE_COUNTRY = 'GE';

export const EVENT_SLUG = 'georgia-world-cup';

// Optional env override for local dev / forced testing. "true" force-enables the
// flag locally (region still gates participation), "false" force-disables.
// Unset → falls back to the PostHog flag.
const envOverride = process.env.NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED;

// PostHog (and therefore flags) only runs where a project key is configured
// (staging + prod). Locally there's usually no key.
const posthogActive = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

export interface ActiveEventMode {
  /** The feature flag is on (event layer exists at all). */
  eventEnabled: boolean;
  /** The current user's stored region is eligible to participate (GE). */
  isEligibleRegion: boolean;
  /** Show the event UI + allow participation: enabled AND eligible. */
  isEventMode: boolean;
  /** Score label to render — event participants see WCP, everyone else RP. */
  scoreLabel: 'RP' | 'WCP';
  /** Event identifier, or null when not in event mode. */
  eventSlug: typeof EVENT_SLUG | null;
}

// Resolve the flag value. CRITICAL: unknown defaults to FALSE (dark-launch
// safe), the opposite of objectives. We never want a brief flash of event UI
// before the flag resolves.
function resolveFlagEnabled(): boolean {
  if (envOverride != null) return envOverride === 'true';
  if (!posthogActive || typeof window === 'undefined') return false;
  return posthog.isFeatureEnabled(EVENT_FLAG) === true;
}

/**
 * Single source of truth for whether the Georgia World Cup / Betsson event UI
 * should render. Consumers branch on `isEventMode` (event UI) vs default
 * (normal QuizBall UI). Reactive to PostHog flag changes and to the auth user.
 */
export function useActiveEventMode(): ActiveEventMode {
  const [eventEnabled, setEventEnabled] = useState<boolean>(resolveFlagEnabled);
  const country = useAuthStore((state) => state.user?.country ?? null);

  useEffect(() => {
    if (envOverride != null || !posthogActive) return;
    return posthog.onFeatureFlags(() => {
      setEventEnabled(posthog.isFeatureEnabled(EVENT_FLAG) === true);
    });
  }, []);

  const isEligibleRegion = country === ELIGIBLE_COUNTRY;
  const isEventMode = eventEnabled && isEligibleRegion;

  return {
    eventEnabled,
    isEligibleRegion,
    isEventMode,
    scoreLabel: isEventMode ? 'WCP' : 'RP',
    eventSlug: isEventMode ? EVENT_SLUG : null,
  };
}
