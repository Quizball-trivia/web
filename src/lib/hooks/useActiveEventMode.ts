import { useEffect, useState } from 'react';

import { posthog } from '@/lib/posthog';
import { useAuthStore } from '@/stores/auth.store';
import { useGeoEligibility } from '@/lib/geo/useGeoEligibility';

// One flag gates the entire Georgia World Cup / Betsson event layer. When it is
// OFF (or unknown), the app renders the normal QuizBall UI everywhere — this is
// the dark-launch contract: flag off === current QuizBall, byte-for-byte.
const EVENT_FLAG = 'georgia_world_cup_event_enabled';

// The eligible competitive region. There are two gating tiers:
//  - LOGGED IN  → participation is gated by the user's STORED country (source of
//                 truth; a GE account always participates, a non-GE account never
//                 does, regardless of where they connect from).
//  - LOGGED OUT → the public landing has no stored region, so we gate display by
//                 LIVE IP geo (are they physically in Georgia right now). IP is
//                 only ever used for the logged-out landing, never participation.
const ELIGIBLE_COUNTRY = 'GE';

export const EVENT_SLUG = 'georgia-world-cup';

// Optional env override for local dev / forced testing. "true" force-enables the
// flag locally, "false" force-disables. Unset → falls back to the PostHog flag.
const envOverride = process.env.NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED;

// PostHog (and therefore flags) only runs where a project key is configured
// (staging + prod). Locally there's usually no key.
const posthogActive = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

export interface ActiveEventMode {
  /** The feature flag is on (event layer exists at all). */
  eventEnabled: boolean;
  /** The current viewer is in an eligible region — stored country if logged in,
   *  live IP if logged out. */
  isEligibleRegion: boolean;
  /** Show the event UI: enabled AND region-eligible. */
  isEventMode: boolean;
  /** True only when a logged-in GE user can actually PARTICIPATE (stored region,
   *  never IP). Use this to gate joining the event leaderboard / matchmaking. */
  canParticipate: boolean;
  /** Score label to render — event participants see WCP, everyone else RP. */
  scoreLabel: 'RP' | 'WCP';
  /** Event identifier, or null when not in event mode. */
  eventSlug: typeof EVENT_SLUG | null;
}

// Resolve the flag value. CRITICAL: unknown defaults to FALSE (dark-launch
// safe), the opposite of objectives. We never want a flash of event UI before
// the flag resolves.
function resolveFlagEnabled(): boolean {
  if (envOverride != null) return envOverride === 'true';
  if (!posthogActive || typeof window === 'undefined') return false;
  return posthog.isFeatureEnabled(EVENT_FLAG) === true;
}

/**
 * Single source of truth for whether the Georgia World Cup / Betsson event UI
 * should render. Two-tier region gating: stored user.country for logged-in
 * participants, live IP geo for the logged-out landing. Both behind the flag.
 */
export function useActiveEventMode(): ActiveEventMode {
  const [eventEnabled, setEventEnabled] = useState<boolean>(resolveFlagEnabled);
  const user = useAuthStore((state) => state.user);
  const country = user?.country ?? null;
  const isLoggedIn = Boolean(user);
  const geo = useGeoEligibility();

  useEffect(() => {
    if (envOverride != null || !posthogActive) return;
    return posthog.onFeatureFlags(() => {
      setEventEnabled(posthog.isFeatureEnabled(EVENT_FLAG) === true);
    });
  }, []);

  // Participation: ONLY the stored region counts, and only when logged in.
  const canParticipate = eventEnabled && isLoggedIn && country === ELIGIBLE_COUNTRY;

  // Display region: stored country when logged in, live IP when logged out.
  const isEligibleRegion = isLoggedIn
    ? country === ELIGIBLE_COUNTRY
    : geo.isGeorgia;

  const isEventMode = eventEnabled && isEligibleRegion;

  return {
    eventEnabled,
    isEligibleRegion,
    isEventMode,
    canParticipate,
    scoreLabel: isEventMode ? 'WCP' : 'RP',
    eventSlug: isEventMode ? EVENT_SLUG : null,
  };
}
