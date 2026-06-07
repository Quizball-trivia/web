import posthog from 'posthog-js';

export { posthog };

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsProperties = Record<string, AnalyticsValue>;

function hasPostHogKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim());
}

// Identify user when they log in
export function identifyUser(userId: string, properties?: AnalyticsProperties): void {
  if (typeof window === 'undefined' || !hasPostHogKey()) {
    return;
  }

  // Validate userId is a non-empty string
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    console.warn('PostHog identifyUser: Invalid userId provided', userId);
    return;
  }

  // In development, just log to console
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Dev] PostHog Identify:', userId, properties);
    return;
  }

  try {
    posthog.identify(userId, properties);
  } catch (error) {
    console.error('PostHog identifyUser error:', error);
  }
}

// Reset user when they log out
export function resetUser(): void {
  if (typeof window === 'undefined' || !hasPostHogKey()) {
    return;
  }

  // In development, just log to console
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Dev] PostHog Reset');
    return;
  }

  try {
    posthog.reset();
  } catch (error) {
    console.error('PostHog resetUser error:', error);
  }
}

// Track custom events
export function trackEvent(eventName: string, properties?: AnalyticsProperties): void {
  if (typeof window === 'undefined' || !hasPostHogKey()) {
    return;
  }

  // In development, just log to console
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Dev] PostHog Event:', eventName, properties);
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
  if (typeof window === 'undefined' || !hasPostHogKey()) {
    return;
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Dev] PostHog Set Person Properties:', { set, setOnce });
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
  if (typeof window === 'undefined' || !hasPostHogKey()) {
    return undefined;
  }

  // In development, return undefined (no feature flags)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Dev] PostHog Feature Flag:', flagKey, '(disabled in dev)');
    return undefined;
  }

  try {
    return posthog.getFeatureFlag(flagKey);
  } catch (error) {
    console.error('PostHog getFeatureFlag error:', error);
    return undefined;
  }
}
