import posthog from 'posthog-js';

export { posthog };

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsProperties = Record<string, AnalyticsValue>;

let lastIdentifySignature: string | null = null;

// PostHog runs wherever a project key is configured (prod + staging use separate
// keys); local dev has no key so events are skipped. Gating on the key — not
// VERCEL_ENV — because NEXT_PUBLIC_VERCEL_ENV does not reliably inline at build
// on the prod Vercel build, which silently disabled all browser analytics.
function isTrackingEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

// Identify user when they log in. Person properties ride on the $identify call
// itself (`setOnce` → PostHog's $set_once) — NO separate $set event, which would
// be a billable event per login. Pass everything here instead of calling a
// separate setPersonProperties().
export function identifyUser(
  userId: string,
  properties?: AnalyticsProperties,
  setOnce?: AnalyticsProperties,
): void {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY || !isTrackingEnv()) {
    return;
  }

  // Validate userId is a non-empty string
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    console.warn('PostHog identifyUser: Invalid userId provided', userId);
    return;
  }

  try {
    const signature = `${userId}:${JSON.stringify(properties ?? {})}:${JSON.stringify(setOnce ?? {})}`;
    if (lastIdentifySignature === signature) {
      return;
    }
    // Cache the signature only after a successful identify — otherwise a throw
    // here would leave the signature set and skip a valid retry as a duplicate.
    posthog.identify(userId, properties, setOnce);
    lastIdentifySignature = signature;
  } catch (error) {
    console.error('PostHog identifyUser error:', error);
  }
}

// Reset user when they log out
export function resetUser(): void {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY || !isTrackingEnv()) {
    return;
  }

  try {
    lastIdentifySignature = null;
    posthog.reset();
  } catch (error) {
    console.error('PostHog resetUser error:', error);
  }
}

// Track custom events
export function trackEvent(eventName: string, properties?: AnalyticsProperties): void {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY || !isTrackingEnv()) {
    return;
  }

  try {
    posthog.capture(eventName, properties);
  } catch (error) {
    console.error('PostHog trackEvent error:', error);
  }
}

// (setPersonProperties removed — it captured a separate billable `$set` event
// per login [~22k/day]. Person properties now ride on identifyUser's $set /
// $set_once args [free], and the backend's deduped identifyUserProfile is the
// source of truth for them anyway.)
