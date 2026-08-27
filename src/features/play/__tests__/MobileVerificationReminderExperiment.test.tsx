import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileVerificationReminderExperiment } from '../MobileVerificationReminderExperiment';
import {
  startGeorgianPhoneLink,
  verifyGeorgianPhoneLink,
} from '@/lib/auth/auth.service';

const analytics = vi.hoisted(() => ({
  completed: vi.fn(),
  failed: vi.fn(),
  reminderClicked: vi.fn(),
  reminderDismissed: vi.fn(),
  reminderShown: vi.fn(),
  started: vi.fn(),
}));
const experiment = vi.hoisted(() => ({
  isEligible: vi.fn(() => true),
  isSnoozed: vi.fn(() => false),
  loadVariant: vi.fn(() => Promise.resolve('test')),
  snooze: vi.fn(),
}));

const VERIFIED_USER = {
  id: 'existing-ge-user',
  email: 'player@example.com',
  phone_number: '+995577123456',
  phone_verified_at: '2026-08-27T20:00:00.000Z',
  role: 'user' as const,
  nickname: 'Player',
  country: 'GE',
  avatar_url: null,
  avatar_customization: null,
  favorite_club: null,
  preferred_language: 'en',
  onboarding_complete: true,
  progression: {
    level: 1,
    totalXp: 0,
    currentLevelXp: 0,
    xpForNextLevel: 100,
    progressPct: 0,
  },
  created_at: '2026-08-01T09:00:00.000Z',
};

const authState = {
  user: { ...VERIFIED_USER, phone_number: null, phone_verified_at: null },
  setAuthenticated: vi.fn(),
  bootstrap: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('@/lib/auth/useGeorgianPhoneAuthAvailability', () => ({
  useGeorgianPhoneAuthAvailability: () => ({
    country: 'GE',
    isAvailable: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/experiments/playHomeMobileVerificationExperiment', () => ({
  MOBILE_VERIFICATION_REMINDER_SNOOZE_DAYS: 7,
  isEligibleForPlayHomeMobileVerificationReminder: experiment.isEligible,
  isPlayHomeMobileVerificationReminderSnoozed: experiment.isSnoozed,
  loadPlayHomeMobileVerificationExperimentVariant: experiment.loadVariant,
  snoozePlayHomeMobileVerificationReminder: experiment.snooze,
}));

vi.mock('@/lib/auth/auth.service', () => ({
  startGeorgianPhoneLink: vi.fn(),
  verifyGeorgianPhoneLink: vi.fn(),
}));

vi.mock('@/lib/analytics/game-events', () => ({
  trackMobileVerificationCompleted: analytics.completed,
  trackMobileVerificationFailed: analytics.failed,
  trackMobileVerificationReminderClicked: analytics.reminderClicked,
  trackMobileVerificationReminderDismissed: analytics.reminderDismissed,
  trackMobileVerificationReminderShown: analytics.reminderShown,
  trackMobileVerificationStarted: analytics.started,
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        'mobileVerificationReminder.eyebrow': 'Account security',
        'mobileVerificationReminder.title': 'Verify your mobile number',
        'mobileVerificationReminder.body': 'Protect your account.',
        'mobileVerificationReminder.cta': 'Verify now',
        'mobileVerificationReminder.later': 'Later',
        'mobileVerificationReminder.time': '1 min',
        'mobileVerificationReminder.dialogTitle': 'Verify your mobile',
        'mobileVerificationReminder.phoneDescription': 'Enter your phone.',
        'mobileVerificationReminder.otpDescription': 'Enter the code.',
        'mobileVerificationReminder.verified': 'Mobile verified',
        'mobileVerificationReminder.verifiedBody': 'Your account is protected.',
        'mobileVerificationExperiment.codeSent': 'Code sent to {phone}.',
        'mobileVerificationExperiment.changeNumber': 'Change number',
        'mobileVerificationExperiment.sendFailed': 'Send failed',
        'settings.phoneLinkedElsewhere': 'Number already linked',
        'settings.phoneOtpFailed': 'Code failed',
        'settings.phoneSendCode': 'Send code',
        'settings.phoneVerifyCode': 'Verify phone',
        'welcome.phoneLabel': 'Phone number',
        'welcome.phonePlaceholder': '+995 5XX XXX XXX',
        'welcome.otpLabel': 'Verification code',
        'welcome.otpPlaceholder': '123456',
        'authValidation.phoneInvalidGeorgian': 'Invalid phone',
        'authValidation.otpInvalid': 'Invalid code',
        'onboarding.saving': 'Saving',
      };
      return (messages[key] ?? key).replace(
        /\{(\w+)\}/g,
        (_match, token) => String(params?.[token] ?? `{${token}}`),
      );
    },
  }),
}));

describe('MobileVerificationReminderExperiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    experiment.isEligible.mockReturnValue(true);
    experiment.isSnoozed.mockReturnValue(false);
    experiment.loadVariant.mockResolvedValue('test');
  });

  it('shows only the test variant and records a seven-day dismissal', async () => {
    render(<MobileVerificationReminderExperiment />);

    expect(await screen.findByText('Verify your mobile number')).toBeInTheDocument();
    expect(analytics.reminderShown).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByRole('button', { name: 'Later' })[0]);

    expect(experiment.snooze).toHaveBeenCalledWith('existing-ge-user');
    expect(analytics.reminderDismissed).toHaveBeenCalledWith({ snoozeDays: 7 });
    expect(screen.queryByText('Verify your mobile number')).not.toBeInTheDocument();
  });

  it('uses the real phone and OTP services and records a source-safe completion', async () => {
    vi.mocked(startGeorgianPhoneLink).mockResolvedValue({
      message: 'Code sent',
      phone: '+995577123456',
      otp_required: true,
    });
    vi.mocked(verifyGeorgianPhoneLink).mockResolvedValue(VERIFIED_USER);

    render(<MobileVerificationReminderExperiment />);
    await screen.findByText('Verify your mobile number');
    fireEvent.click(screen.getAllByRole('button', { name: 'Verify now' })[0]);
    fireEvent.input(screen.getByPlaceholderText('+995 5XX XXX XXX'), {
      target: { value: '577123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    await waitFor(() => expect(startGeorgianPhoneLink).toHaveBeenCalledWith('+995577123456'));
    fireEvent.input(await screen.findByPlaceholderText('123456'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify phone' }));

    await waitFor(() => expect(verifyGeorgianPhoneLink).toHaveBeenCalledWith(
      '+995577123456',
      '123456',
    ));
    expect(authState.setAuthenticated).toHaveBeenCalledWith(VERIFIED_USER);
    expect(analytics.completed).toHaveBeenCalledWith(expect.objectContaining({
      source: 'play_home_reminder',
      method: 'otp',
      sendAttempts: 1,
      verifyAttempts: 1,
    }));
    expect(await screen.findByText('Mobile verified')).toBeInTheDocument();
  });

  it('does not render the control variant', async () => {
    experiment.loadVariant.mockResolvedValue('control');
    render(<MobileVerificationReminderExperiment />);
    await waitFor(() => expect(experiment.loadVariant).toHaveBeenCalled());
    expect(screen.queryByText('Verify your mobile number')).not.toBeInTheDocument();
  });
});
