import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const trackEventMock = vi.fn();
let inAppBrowserApp: string | null = null;

vi.mock('@/lib/posthog', () => ({
  trackEvent: (event: string, props?: Record<string, unknown>) => trackEventMock(event, props),
}));

vi.mock('@/lib/auth/in-app-browser', () => ({
  getInAppBrowserApp: () => inAppBrowserApp,
}));

import {
  trackSignupStarted,
  trackOnboardingCompleted,
  trackLoginCompleted,
} from '../game-events';
import { storage, STORAGE_KEYS } from '@/utils/storage';

describe('auth analytics events', () => {
  beforeEach(() => {
    trackEventMock.mockClear();
    inAppBrowserApp = null;
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('auth_started carries method + in_app_browser and persists the method', () => {
    inAppBrowserApp = 'facebook';
    trackSignupStarted('facebook');

    expect(trackEventMock).toHaveBeenCalledWith('auth_started', {
      method: 'facebook',
      in_app_browser: 'facebook',
    });
    // still dual-fires the legacy event during transition
    expect(trackEventMock).toHaveBeenCalledWith('signup_started', {
      method: 'facebook',
      in_app_browser: 'facebook',
    });
    expect(storage.get(STORAGE_KEYS.SIGNUP_METHOD, null)).toBe('facebook');
  });

  it('onboarding_completed is attributed by the persisted method', () => {
    trackSignupStarted('google');
    trackEventMock.mockClear();

    trackOnboardingCompleted();

    expect(trackEventMock).toHaveBeenCalledWith('onboarding_completed', { method: 'google' });
  });

  it('onboarding_completed omits method when none was stored', () => {
    trackOnboardingCompleted();
    expect(trackEventMock).toHaveBeenCalledWith('onboarding_completed', {});
  });

  it('trackLoginCompleted is a client no-op (backend is authoritative)', () => {
    trackLoginCompleted('email');
    expect(trackEventMock).not.toHaveBeenCalledWith('login_completed', expect.anything());
  });
});
