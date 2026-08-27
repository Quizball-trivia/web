import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadExperimentVariantMock = vi.hoisted(() => vi.fn());

vi.mock('../loadExperimentVariant', () => ({
  loadExperimentVariant: loadExperimentVariantMock,
}));

import {
  PLAY_HOME_MOBILE_VERIFICATION_EXPERIMENT_KEY,
  isEligibleForPlayHomeMobileVerificationReminder,
  isPlayHomeMobileVerificationReminderSnoozed,
  loadPlayHomeMobileVerificationExperimentVariant,
  snoozePlayHomeMobileVerificationReminder,
} from '../playHomeMobileVerificationExperiment';

const ELIGIBLE_USER = {
  id: 'existing-ge-user',
  created_at: '2026-08-01T09:00:00.000Z',
  country: 'GE',
  onboarding_complete: true,
  phone_verified_at: null,
};

describe('Play-home mobile verification experiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    loadExperimentVariantMock.mockResolvedValue('test');
  });

  it('limits eligibility to existing Georgian users without a verified phone', () => {
    expect(isEligibleForPlayHomeMobileVerificationReminder(ELIGIBLE_USER, true)).toBe(true);
    expect(isEligibleForPlayHomeMobileVerificationReminder(
      { ...ELIGIBLE_USER, country: 'US' },
      true,
    )).toBe(false);
    expect(isEligibleForPlayHomeMobileVerificationReminder(
      { ...ELIGIBLE_USER, phone_verified_at: '2026-08-20T00:00:00.000Z' },
      true,
    )).toBe(false);
    expect(isEligibleForPlayHomeMobileVerificationReminder(
      { ...ELIGIBLE_USER, created_at: '2026-08-28T00:00:00.000Z' },
      true,
    )).toBe(false);
    expect(isEligibleForPlayHomeMobileVerificationReminder(ELIGIBLE_USER, false)).toBe(false);
  });

  it('loads the experiment only after application eligibility is proven', async () => {
    await expect(loadPlayHomeMobileVerificationExperimentVariant(
      ELIGIBLE_USER,
      true,
    )).resolves.toBe('test');

    expect(loadExperimentVariantMock).toHaveBeenCalledWith(
      PLAY_HOME_MOBILE_VERIFICATION_EXPERIMENT_KEY,
      {
        created_at: ELIGIBLE_USER.created_at,
        country: 'GE',
        onboarding_complete: true,
        phone_verified_at: undefined,
      },
    );

    await expect(loadPlayHomeMobileVerificationExperimentVariant(
      { ...ELIGIBLE_USER, country: 'US' },
      true,
    )).resolves.toBe('not_enrolled');
    expect(loadExperimentVariantMock).toHaveBeenCalledTimes(1);
  });

  it('snoozes a dismissal for seven days on the current device', () => {
    const now = Date.parse('2026-08-27T20:00:00.000Z');
    snoozePlayHomeMobileVerificationReminder(ELIGIBLE_USER.id, now);

    expect(isPlayHomeMobileVerificationReminderSnoozed(
      ELIGIBLE_USER.id,
      now + 6 * 24 * 60 * 60 * 1_000,
    )).toBe(true);
    expect(isPlayHomeMobileVerificationReminderSnoozed(
      ELIGIBLE_USER.id,
      now + 8 * 24 * 60 * 60 * 1_000,
    )).toBe(false);
  });
});
