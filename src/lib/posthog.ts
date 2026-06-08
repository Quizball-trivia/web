import posthog from 'posthog-js';

export { posthog };

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsProperties = Record<string, AnalyticsValue>;

let lastIdentifySignature: string | null = null;

// PostHog runs on real deployments — production AND staging (Vercel "preview"),
// which use separate project keys. Locally (VERCEL_ENV "development"/unset) we
// just log to the console instead of sending events.
function isTrackingEnv(): boolean {
  const deployEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
  return deployEnv === 'production' || deployEnv === 'preview';
}

// Identify user when they log in
export function identifyUser(userId: string, properties?: AnalyticsProperties): void {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY || !isTrackingEnv()) {
    return;
  }

  // Validate userId is a non-empty string
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    console.warn('PostHog identifyUser: Invalid userId provided', userId);
    return;
  }

  try {
    const signature = `${userId}:${JSON.stringify(properties ?? {})}`;
    if (lastIdentifySignature === signature) {
      return;
    }
    // Cache the signature only after a successful identify — otherwise a throw
    // here would leave the signature set and skip a valid retry as a duplicate.
    posthog.identify(userId, properties);
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

/**
 * Set person properties on the currently identified user. Use `$set` for
 * properties that should overwrite (current RP, current level), and
 * `$set_once` for properties that should only be written the first time
 * (signup_date). Safe to call before identify — PostHog buffers it.
 */
export function setPersonProperties(
  set?: AnalyticsProperties,
  setOnce?: AnalyticsProperties,
): void {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY || !isTrackingEnv()) {
    return;
  }
  try {
    const payload: { $set?: AnalyticsProperties; $set_once?: AnalyticsProperties } = {};
    if (set) payload.$set = set;
    if (setOnce) payload.$set_once = setOnce;
    if (payload.$set || payload.$set_once) {
      posthog.capture('$set', payload);
    }
  } catch (error) {
    console.error('PostHog setPersonProperties error:', error);
  }
}

// Feature flag helpers
export function getFeatureFlag(flagKey: string): boolean | string | undefined {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY || !isTrackingEnv()) {
    return undefined;
  }

  try {
    return posthog.getFeatureFlag(flagKey);
  } catch (error) {
    console.error('PostHog getFeatureFlag error:', error);
    return undefined;
  }
}
