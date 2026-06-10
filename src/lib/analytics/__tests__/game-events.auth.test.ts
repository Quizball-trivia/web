import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackEventMock = vi.fn();

vi.mock('@/lib/posthog', () => ({
  trackEvent: (event: string, props?: Record<string, unknown>) => trackEventMock(event, props),
}));

import {
  trackSignupStarted,
  trackOnboardingCompleted,
  trackLoginCompleted,
} from '../game-events';

// These tests pin the PROD-STYLE analytics shape restored by d3780cf
// ("test: restore prod-style posthog behavior"): plain { method } payloads,
// no in_app_browser enrichment, no persisted-method attribution. The richer
// shape from the auth-migration branch (b55912e) was deliberately rolled
// back; the previous version of this file still asserted it and failed ever
// since.
describe('auth analytics events', () => {
  beforeEach(() => {
    trackEventMock.mockClear();
  });

  it('auth_started carries the method and dual-fires the legacy signup_started', () => {
    trackSignupStarted('facebook');

    expect(trackEventMock).toHaveBeenCalledWith('auth_started', { method: 'facebook' });
    // still dual-fires the legacy event during the dashboard transition
    expect(trackEventMock).toHaveBeenCalledWith('signup_started', { method: 'facebook' });
  });

  it('onboarding_completed fires without attribution payload', () => {
    trackOnboardingCompleted();
    expect(trackEventMock).toHaveBeenCalledWith('onboarding_completed', undefined);
  });

  it('login_completed fires with the method', () => {
    trackLoginCompleted('email');
    expect(trackEventMock).toHaveBeenCalledWith('login_completed', { method: 'email' });
  });
});
