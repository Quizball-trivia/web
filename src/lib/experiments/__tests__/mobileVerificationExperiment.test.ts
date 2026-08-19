import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthogMock = vi.hoisted(() => ({
  setPersonPropertiesForFlags: vi.fn(),
  getFeatureFlag: vi.fn(),
  reloadFeatureFlags: vi.fn(),
  onFeatureFlags: vi.fn(),
  featureFlags: {
    hasLoadedFlags: false,
    setReloadingPaused: vi.fn(),
  },
}));

vi.mock('@/lib/posthog', () => ({ posthog: posthogMock }));

import {
  loadMobileVerificationExperimentVariant,
  MOBILE_VERIFICATION_EXPERIMENT_KEY,
} from '../mobileVerificationExperiment';

const USER = {
  id: 'new-user-id',
  created_at: '2026-08-19T09:00:00.000Z',
  country: 'GE',
  onboarding_complete: false,
  phone_verified_at: null,
};

describe('mobile verification experiment assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    posthogMock.featureFlags.hasLoadedFlags = false;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('manually reloads the flag, records exposure, then pauses reloads again', async () => {
    posthogMock.getFeatureFlag.mockReturnValue('test');
    posthogMock.onFeatureFlags.mockImplementation((callback) => {
      posthogMock.reloadFeatureFlags.mockImplementation(() => {
        callback(
          [MOBILE_VERIFICATION_EXPERIMENT_KEY],
          { [MOBILE_VERIFICATION_EXPERIMENT_KEY]: 'test' },
          { errorsLoading: false },
        );
      });
      return vi.fn();
    });

    await expect(loadMobileVerificationExperimentVariant(USER)).resolves.toBe('test');

    expect(posthogMock.setPersonPropertiesForFlags).toHaveBeenCalledWith(
      expect.objectContaining({
        created_at: USER.created_at,
        onboarding_complete: false,
      }),
      false,
    );
    expect(posthogMock.getFeatureFlag).toHaveBeenCalledWith(
      MOBILE_VERIFICATION_EXPERIMENT_KEY,
    );
    expect(posthogMock.featureFlags.setReloadingPaused.mock.calls).toEqual([
      [false],
      [true],
    ]);
  });

  it('fails open to control when PostHog reports a flag loading error', async () => {
    posthogMock.onFeatureFlags.mockImplementation((callback) => {
      posthogMock.reloadFeatureFlags.mockImplementation(() => {
        callback([], {}, { errorsLoading: true });
      });
      return vi.fn();
    });

    await expect(loadMobileVerificationExperimentVariant(USER)).resolves.toBe('control');
    expect(posthogMock.getFeatureFlag).not.toHaveBeenCalled();
    expect(posthogMock.featureFlags.setReloadingPaused).toHaveBeenLastCalledWith(true);
  });

  it('uses control without any network work when PostHog is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');

    await expect(loadMobileVerificationExperimentVariant(USER)).resolves.toBe('control');
    expect(posthogMock.reloadFeatureFlags).not.toHaveBeenCalled();
  });
});
