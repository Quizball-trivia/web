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
        'mobileVerificationExperiment.sendFailedReason': "Couldn't send: {reason}",
        'mobileVerificationExperiment.phoneHint': 'Georgian mobile only',
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
    fireEvent.input(screen.getByPlaceholderText('5XX XXX XXX'), {
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

    fireEvent.input(screen.getByPlaceholderText('5XX XXX XXX'), {
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

    fireEvent.input(screen.getByPlaceholderText('5XX XXX XXX'), {
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

describe('MobileVerificationStep phone input and failure reasons', () => {
  beforeEach(() => vi.clearAllMocks());

  const renderStep = () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    render(<MobileVerificationStep isCompleting={false} onContinue={onContinue} />);
    return { onContinue, input: screen.getByPlaceholderText('5XX XXX XXX') };
  };

  it('always posts canonical E.164 regardless of how the digits are typed', async () => {
    vi.mocked(startGeorgianPhoneLink).mockResolvedValue({
      message: 'Verification code sent', phone: '+995577123456', otp_required: true,
    });
    const { input } = renderStep();
    // Spaces, letters and a leading zero are stripped by the field itself.
    fireEvent.input(input, { target: { value: '0 5a77 123-456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await waitFor(() => {
      expect(startGeorgianPhoneLink).toHaveBeenCalledWith('+995577123456');
    });
  });

  it('caps input at 9 digits so an over-long number cannot be submitted', () => {
    const { input } = renderStep();
    fireEvent.input(input, { target: { value: '5771234567890' } });
    expect((input as HTMLInputElement).value).toBe('577123456');
  });

  it('strips a leading national 0 instead of truncating a valid number', () => {
    const { input } = renderStep();
    fireEvent.input(input, { target: { value: '0577123456' } });
    expect((input as HTMLInputElement).value).toBe('577123456');
  });

  it('disables submit only while the field is empty, so short input still explains itself', async () => {
    const { input } = renderStep();
    const submit = screen.getByRole('button', { name: 'Send code' });
    expect(submit).toBeDisabled();
    fireEvent.input(input, { target: { value: '577' } });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    expect(await screen.findByText('Invalid Georgian phone')).toBeInTheDocument();
    expect(startGeorgianPhoneLink).not.toHaveBeenCalled();
  });

  it('rejects a non-mobile Georgian number locally, without calling the API', async () => {
    const { input } = renderStep();
    fireEvent.input(input, { target: { value: '322334455' } }); // Tbilisi landline
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('Invalid Georgian phone')).toBeInTheDocument();
    expect(startGeorgianPhoneLink).not.toHaveBeenCalled();
    expect(analytics.failed).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'invalid_phone' }),
    );
  });

  it('shows the SERVER reason on a 400 instead of a bare "try again"', async () => {
    const { ApiError } = await import('@/lib/api/api');
    vi.mocked(startGeorgianPhoneLink).mockRejectedValue(
      new ApiError('Invalid phone number for SMS delivery', 400, null),
    );
    const { input } = renderStep();
    fireEvent.input(input, { target: { value: '577123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(
      await screen.findByText("Couldn't send: Invalid phone number for SMS delivery"),
    ).toBeInTheDocument();
    expect(analytics.failed).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'request_failed' }),
    );
  });

  it('still shows the dedicated message when the number belongs to another account (409)', async () => {
    const { ApiError } = await import('@/lib/api/api');
    vi.mocked(startGeorgianPhoneLink).mockRejectedValue(new ApiError('conflict', 409, null));
    const { input } = renderStep();
    fireEvent.input(input, { target: { value: '577123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('Number already linked')).toBeInTheDocument();
  });

  it('falls back to the generic message when a non-400 failure carries no usable reason', async () => {
    const { ApiError } = await import('@/lib/api/api');
    vi.mocked(startGeorgianPhoneLink).mockRejectedValue(new ApiError('boom', 502, null));
    const { input } = renderStep();
    fireEvent.input(input, { target: { value: '577123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('Send failed')).toBeInTheDocument();
  });
});
