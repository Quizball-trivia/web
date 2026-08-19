import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileVerificationStep } from '../MobileVerificationStep';
import { startGeorgianPhoneLink, verifyGeorgianPhoneLink } from '@/lib/auth/auth.service';

const setAuthenticatedMock = vi.fn();
const analytics = vi.hoisted(() => ({
  completed: vi.fn(),
  failed: vi.fn(),
  shown: vi.fn(),
  skipped: vi.fn(),
  started: vi.fn(),
}));

vi.mock('@/components/AppLogo', () => ({
  AppLogo: () => <div>QuizBall</div>,
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        'mobileVerificationExperiment.title': 'Verify Your Mobile',
        'mobileVerificationExperiment.description': 'Add a Georgian mobile number.',
        'mobileVerificationExperiment.phoneLabel': 'Georgian mobile number',
        'mobileVerificationExperiment.codeTitle': 'Enter Your Code',
        'mobileVerificationExperiment.codeDescription': 'Enter the code sent to {phone}.',
        'mobileVerificationExperiment.codeSent': 'Code sent to {phone}.',
        'mobileVerificationExperiment.changeNumber': 'Change number',
        'mobileVerificationExperiment.privacyNote': 'Privacy note',
        'mobileVerificationExperiment.skip': 'Maybe later',
        'mobileVerificationExperiment.sendFailed': 'Send failed',
        'settings.phoneSendCode': 'Send code',
        'settings.phoneVerifyCode': 'Verify phone',
        'settings.phoneLinkedElsewhere': 'Number already linked',
        'settings.phoneOtpFailed': 'Code failed',
        'welcome.phonePlaceholder': '+995 5XX XXX XXX',
        'welcome.otpLabel': 'Verification code',
        'welcome.otpPlaceholder': '123456',
        'authValidation.phoneInvalidGeorgian': 'Invalid Georgian phone',
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

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { setAuthenticated: typeof setAuthenticatedMock }) => unknown) =>
    selector({ setAuthenticated: setAuthenticatedMock }),
}));

vi.mock('@/lib/auth/auth.service', () => ({
  startGeorgianPhoneLink: vi.fn(),
  verifyGeorgianPhoneLink: vi.fn(),
}));

vi.mock('@/lib/analytics/game-events', () => ({
  trackMobileVerificationCompleted: analytics.completed,
  trackMobileVerificationFailed: analytics.failed,
  trackMobileVerificationPromptShown: analytics.shown,
  trackMobileVerificationSkipped: analytics.skipped,
  trackMobileVerificationStarted: analytics.started,
}));

const VERIFIED_USER = {
  id: 'user-id',
  email: 'player@example.com',
  phone_number: '+995577123456',
  phone_verified_at: '2026-08-19T10:00:00.000Z',
  role: 'user' as const,
  nickname: 'Player',
  country: 'GE',
  avatar_url: null,
  avatar_customization: null,
  favorite_club: null,
  preferred_language: 'en',
  onboarding_complete: false,
  progression: {
    level: 1,
    totalXp: 0,
    currentLevelXp: 0,
    xpForNextLevel: 100,
    progressPct: 0,
  },
  created_at: '2026-08-19T09:00:00.000Z',
};

describe('MobileVerificationStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes the phone and OTP flow without putting the phone number in analytics', async () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    vi.mocked(startGeorgianPhoneLink).mockResolvedValue({
      message: 'Verification code sent',
      phone: '+995577123456',
      otp_required: true,
    });
    vi.mocked(verifyGeorgianPhoneLink).mockResolvedValue(VERIFIED_USER);

    render(<MobileVerificationStep isCompleting={false} onContinue={onContinue} />);

    expect(analytics.shown).toHaveBeenCalledTimes(1);
    fireEvent.input(screen.getByPlaceholderText('+995 5XX XXX XXX'), {
      target: { value: '577123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    await waitFor(() => {
      expect(startGeorgianPhoneLink).toHaveBeenCalledWith('+995577123456');
    });
    expect(await screen.findByText('Code sent to +995577123456.')).toBeInTheDocument();
    expect(analytics.started).toHaveBeenCalledWith(expect.objectContaining({ attempt: 1 }));

    fireEvent.input(screen.getByPlaceholderText('123456'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify phone' }));

    await waitFor(() => {
      expect(verifyGeorgianPhoneLink).toHaveBeenCalledWith('+995577123456', '123456');
    });
    expect(setAuthenticatedMock).toHaveBeenCalledWith(VERIFIED_USER);
    expect(analytics.completed).toHaveBeenCalledWith(expect.objectContaining({
      method: 'otp',
      sendAttempts: 1,
      verifyAttempts: 1,
    }));
    expect(analytics.completed.mock.calls[0]?.[0]).not.toHaveProperty('phone');
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('records where the user skipped and continues onboarding', async () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    vi.mocked(startGeorgianPhoneLink).mockResolvedValue({
      message: 'Verification code sent',
      phone: '+995577123456',
      otp_required: true,
    });

    render(<MobileVerificationStep isCompleting={false} onContinue={onContinue} />);

    fireEvent.input(screen.getByPlaceholderText('+995 5XX XXX XXX'), {
      target: { value: '577123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByText('Code sent to +995577123456.');
    fireEvent.click(screen.getByRole('button', { name: 'Maybe later' }));

    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
    expect(analytics.skipped).toHaveBeenCalledWith(expect.objectContaining({ step: 'otp' }));
  });

  it('keeps invalid phone input client-side and records the validation failure', () => {
    render(<MobileVerificationStep isCompleting={false} onContinue={vi.fn()} />);

    fireEvent.input(screen.getByPlaceholderText('+995 5XX XXX XXX'), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid Georgian phone');
    expect(startGeorgianPhoneLink).not.toHaveBeenCalled();
    expect(analytics.failed).toHaveBeenCalledWith({
      step: 'phone',
      reason: 'invalid_phone',
      attempt: 1,
    });
  });
});
