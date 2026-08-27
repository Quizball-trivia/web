import type { User } from '@/lib/types';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { loadExperimentVariant, type ExperimentVariant } from './loadExperimentVariant';

export const PLAY_HOME_MOBILE_VERIFICATION_EXPERIMENT_KEY =
  'play-home-mobile-verification-reminder';

// Freeze the cohort to accounts that existed before this experiment was built.
// New users are handled by the shipped onboarding verification experience.
export const PLAY_HOME_MOBILE_VERIFICATION_EXISTING_USER_CUTOFF =
  '2026-08-27T19:35:30.000Z';

export const MOBILE_VERIFICATION_REMINDER_SNOOZE_DAYS = 7;
const REMINDER_SNOOZE_MS =
  MOBILE_VERIFICATION_REMINDER_SNOOZE_DAYS * 24 * 60 * 60 * 1_000;

type EligibleUser = Pick<
  User,
  'id' | 'created_at' | 'country' | 'onboarding_complete' | 'phone_verified_at'
>;

type ReminderDismissals = Record<string, string>;

export function isEligibleForPlayHomeMobileVerificationReminder(
  user: EligibleUser,
  phoneAuthAvailable: boolean,
): boolean {
  const createdAt = Date.parse(user.created_at);
  const cutoff = Date.parse(PLAY_HOME_MOBILE_VERIFICATION_EXISTING_USER_CUTOFF);

  return (
    phoneAuthAvailable
    && user.onboarding_complete
    && !user.phone_verified_at
    && user.country?.trim().toUpperCase() === 'GE'
    && Number.isFinite(createdAt)
    && createdAt <= cutoff
  );
}

export function isPlayHomeMobileVerificationReminderSnoozed(
  userId: string,
  now = Date.now(),
): boolean {
  const dismissals = storage.get<ReminderDismissals>(
    STORAGE_KEYS.MOBILE_VERIFICATION_REMINDER_DISMISSALS,
    {},
  );
  const dismissedUntil = Date.parse(dismissals[userId] ?? '');
  return Number.isFinite(dismissedUntil) && dismissedUntil > now;
}

export function snoozePlayHomeMobileVerificationReminder(
  userId: string,
  now = Date.now(),
): void {
  const dismissals = storage.get<ReminderDismissals>(
    STORAGE_KEYS.MOBILE_VERIFICATION_REMINDER_DISMISSALS,
    {},
  );
  storage.set(STORAGE_KEYS.MOBILE_VERIFICATION_REMINDER_DISMISSALS, {
    ...dismissals,
    [userId]: new Date(now + REMINDER_SNOOZE_MS).toISOString(),
  });
}

export function loadPlayHomeMobileVerificationExperimentVariant(
  user: EligibleUser,
  phoneAuthAvailable: boolean,
): Promise<ExperimentVariant> {
  if (!isEligibleForPlayHomeMobileVerificationReminder(user, phoneAuthAvailable)) {
    return Promise.resolve('not_enrolled');
  }

  return loadExperimentVariant(PLAY_HOME_MOBILE_VERIFICATION_EXPERIMENT_KEY, {
    created_at: user.created_at,
    country: 'GE',
    onboarding_complete: true,
    phone_verified_at: user.phone_verified_at ?? undefined,
  });
}
