type NewRelicAttributeValue = string | number | boolean | null | undefined;
type NewRelicAttributes = Record<string, NewRelicAttributeValue>;

interface NewRelicGlobal {
  addPageAction: (name: string, attributes?: object) => unknown;
  noticeError: (error: Error | string, customAttributes?: object) => unknown;
  setCustomAttribute: (name: string, value: string | number | boolean | null, persist?: boolean) => unknown;
}

declare global {
  interface Window {
    newrelic?: NewRelicGlobal;
  }
}

let nrAgent: object | null = null;

export async function initNewRelic(): Promise<object | null> {
  // Only run in browser
  if (typeof window === 'undefined') {
    return null;
  }

  // Only initialize in production
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  // Check if required env vars are present
  if (
    !process.env.NEXT_PUBLIC_NEW_RELIC_ACCOUNT_ID ||
    !process.env.NEXT_PUBLIC_NEW_RELIC_AGENT_ID ||
    !process.env.NEXT_PUBLIC_NEW_RELIC_LICENSE_KEY ||
    !process.env.NEXT_PUBLIC_NEW_RELIC_APPLICATION_ID
  ) {
    console.warn('New Relic browser monitoring disabled: missing configuration');
    return null;
  }

  if (!nrAgent) {
    try {
      // Dynamic import to avoid SSR issues
      const { BrowserAgent } = await import('@newrelic/browser-agent/loaders/browser-agent');

      nrAgent = new BrowserAgent({
        init: {
          distributed_tracing: { enabled: true },
          privacy: { cookies_enabled: true },
          ajax: { deny_list: ['bam.nr-data.net'] },
        },
        info: {
          beacon: 'bam.eu01.nr-data.net',
          errorBeacon: 'bam.eu01.nr-data.net',
          licenseKey: process.env.NEXT_PUBLIC_NEW_RELIC_LICENSE_KEY!,
          applicationID: process.env.NEXT_PUBLIC_NEW_RELIC_APPLICATION_ID!,
          sa: 1,
        },
        loader_config: {
          accountID: process.env.NEXT_PUBLIC_NEW_RELIC_ACCOUNT_ID!,
          agentID: process.env.NEXT_PUBLIC_NEW_RELIC_AGENT_ID!,
          licenseKey: process.env.NEXT_PUBLIC_NEW_RELIC_LICENSE_KEY!,
          applicationID: process.env.NEXT_PUBLIC_NEW_RELIC_APPLICATION_ID!,
          ...(process.env.NEXT_PUBLIC_NEW_RELIC_TRUST_KEY && {
            trustKey: process.env.NEXT_PUBLIC_NEW_RELIC_TRUST_KEY,
          }),
        },
      });
    } catch (error) {
      console.error('Failed to initialize New Relic:', error);
      return null;
    }
  }

  return nrAgent;
}

export function getNewRelicAgent(): object | null {
  return nrAgent;
}

function getNewRelicGlobal(): NewRelicGlobal | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.newrelic ?? null;
}

// Track custom events
export function trackBrowserEvent(
  eventName: string,
  attributes?: NewRelicAttributes
): void {
  if (typeof window === 'undefined') {
    return; // SSR guard
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Dev] New Relic Event:', eventName, attributes);
    return;
  }

  const newRelic = getNewRelicGlobal();
  if (newRelic) {
    try {
      newRelic.addPageAction(eventName, attributes ?? {});
    } catch (error) {
      console.error('New Relic trackBrowserEvent error:', error);
    }
  }
}

// Track errors
export function trackBrowserError(
  error: Error,
  customAttributes?: NewRelicAttributes
): void {
  if (typeof window === 'undefined') {
    return; // SSR guard
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('[Dev] New Relic Error:', error, customAttributes);
    return;
  }

  const newRelic = getNewRelicGlobal();
  if (newRelic) {
    try {
      newRelic.noticeError(error, customAttributes ?? {});
    } catch (err) {
      console.error('New Relic trackBrowserError error:', err);
    }
  }
}

// Set user context
export function setNewRelicUser(userId: string, attributes?: NewRelicAttributes): void {
  if (typeof window === 'undefined') {
    return; // SSR guard
  }

  // Validate userId is a non-empty string
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    console.warn('New Relic setNewRelicUser: Invalid userId provided', userId);
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Dev] New Relic User:', userId, attributes);
    return;
  }

  const newRelic = getNewRelicGlobal();
  if (newRelic) {
    try {
      newRelic.setCustomAttribute('userId', userId);
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          if (value !== undefined) {
            newRelic.setCustomAttribute(key, value);
          }
        });
      }
    } catch (error) {
      console.error('New Relic setNewRelicUser error:', error);
    }
  }
}
