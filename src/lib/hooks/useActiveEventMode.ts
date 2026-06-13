import { useAuthStore } from '@/stores/auth.store';
import { useGeoEligibility } from '@/lib/geo/useGeoEligibility';

// One env toggle gates the entire Georgia World Cup / Betsson event layer. When
// it is OFF (or unset), the app renders the normal QuizBall UI everywhere — this
// is the dark-launch contract: off === current QuizBall, byte-for-byte.

// The eligible competitive region. There are two gating tiers:
//  - LOGGED IN  → participation is gated by the user's STORED country (source of
//                 truth; a GE account always participates, a non-GE account never
//                 does, regardless of where they connect from).
//  - LOGGED OUT → the public landing has no stored region, so we gate display by
//                 LIVE IP geo (are they physically in Georgia right now). IP is
//                 only ever used for the logged-out landing, never participation.
const ELIGIBLE_COUNTRY = 'GE';

export const EVENT_SLUG = 'georgia-world-cup';

// The event toggle, set per-environment in Vercel. "true" enables the event UI,
// anything else (incl. unset) keeps the normal QuizBall UI.
const envOverride = process.env.NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED;

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
//
// The event toggle is driven entirely by the NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED
// env var (set per-environment in Vercel) — NOT a PostHog feature flag. PostHog
// flag loading is disabled in instrumentation-client.ts, which removed ~15k
// flag requests/day for what is just one boolean. To toggle the event, flip the
// Vercel env var and redeploy.
function resolveFlagEnabled(): boolean {
  return envOverride === 'true';
}

/**
 * Single source of truth for whether the Georgia World Cup / Betsson event UI
 * should render. Two-tier region gating: stored user.country for logged-in
 * participants, live IP geo for the logged-out landing. Both behind the flag.
 */
export function useActiveEventMode(): ActiveEventMode {
  // Env-driven (Vercel) — stable for the session, no PostHog flag fetch.
  const eventEnabled = resolveFlagEnabled();
  const user = useAuthStore((state) => state.user);
  const country = user?.country ?? null;
  const isLoggedIn = Boolean(user);
  const geo = useGeoEligibility();

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
