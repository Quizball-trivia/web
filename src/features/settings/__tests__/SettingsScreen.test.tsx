import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsScreen } from '../SettingsScreen';
import { requestAccountDeletion } from '@/lib/repositories/users.repo';
import { startGeorgianPhoneLink, verifyGeorgianPhoneLink } from '@/lib/auth/auth.service';

const logoutMock = vi.fn();
const setAuthenticatedMock = vi.fn();
const georgianPhoneAvailabilityMock = vi.fn(() => ({
  country: 'GE',
  isAvailable: true,
  isLoading: false,
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    logout: logoutMock,
    setAuthenticated: setAuthenticatedMock,
    user: {
      id: 'user-id',
      preferred_language: 'en',
      phone_number: null,
      phone_verified_at: null,
    },
  }),
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'en',
    setLocale: vi.fn(),
    t: (key: string, params?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        'settings.title': 'Settings',
        'settings.languageAndExperience': 'Language & Experience',
        'settings.languageCurrentEnglish': 'English (US)',
        'settings.switchToGeorgian': 'Switch to Georgian',
        'settings.matchAtmosphere': 'Match Atmosphere',
        'settings.matchSounds': 'Match Sounds',
        'settings.matchSoundsDescription': 'Crowd reactions, kick effects, and whistles',
        'settings.stadiumMusic': 'Stadium Music',
        'settings.stadiumMusicDescription': 'Background anthems and lobby tracks',
        'settings.gameAlerts': 'Game Alerts',
        'settings.matchInvites': 'Match Invites',
        'settings.matchInvitesDescription': 'Get notified when friends challenge you',
        'settings.dailyQuestReminders': 'Daily Quest Reminders',
        'settings.dailyQuestRemindersDescription': "Don't miss out on daily XP bonuses",
        'settings.accountAndSafety': 'Account & Safety',
        'settings.addOrChangePhone': 'Add or change phone',
        'settings.addOrChangePhoneDescription': 'Link a Georgian mobile number for SMS sign-in',
        'settings.phoneCurrentDescription': 'Linked number: {phone}',
        'settings.phoneNotLinkedDescription': 'No phone number linked yet',
        'settings.changePhoneTitle': 'Add or change phone',
        'settings.changePhoneModalDescription': 'Link a Georgian mobile number to this account.',
        'settings.changePhoneOtpDescription': 'Enter the 6-digit code we sent to {phone}.',
        'settings.phoneSendCode': 'Send code',
        'settings.phoneVerifyCode': 'Verify phone',
        'settings.phoneCodeSent': 'We sent a code to {phone}.',
        'settings.phoneLinkSuccess': 'Phone number linked.',
        'settings.phoneLinkFailed': "Couldn't update your phone number.",
        'settings.phoneAlreadyLinked': 'This phone number is already linked to your account.',
        'settings.phoneLinkedElsewhere': 'This phone number is already linked to another account.',
        'settings.phoneOtpFailed': "That code didn't work.",
        'welcome.phoneLabel': 'Georgian mobile number',
        'welcome.phonePlaceholder': '+995 5XX XXX XXX',
        'welcome.otpLabel': 'Verification code',
        'welcome.otpPlaceholder': '123456',
        'authValidation.phoneRequired': 'Phone number is required.',
        'authValidation.phoneInvalidGeorgian': 'Enter a Georgian mobile number.',
        'authValidation.otpRequired': 'Verification code is required.',
        'authValidation.otpInvalid': 'Enter the 6-digit verification code.',
        'settings.deleteAccount': 'Delete Account',
        'settings.deleteAccountDescription': 'Disable this account and start the 30-day deletion window',
        'settings.deleteAccountTitle': 'Delete account?',
        'settings.deleteAccountModalDescription': 'Your account will be disabled immediately.',
        'settings.deleteAccountConfirmLabel': 'Type DELETE to confirm',
        'settings.deleteAccountConfirmWord': 'DELETE',
        'settings.deleteAccountDeleting': 'Deleting...',
        'settings.deleteAccountScheduled': 'Account deletion scheduled',
        'settings.deleteAccountFailed': 'Failed to schedule account deletion',
        'settings.logOut': 'Log Out',
        'settings.about': 'About',
        'settings.version': 'Version 0.9.1 (Beta)',
        'common.cancel': 'Cancel',
        'common.change': 'Change',
        'resetPassword.submitting': 'Updating...',
      };
      return (messages[key] ?? key).replace(/\{(\w+)\}/g, (_match, token) => String(params?.[token] ?? `{${token}}`));
    },
  }),
}));

vi.mock('@/lib/repositories/users.repo', () => ({
  requestAccountDeletion: vi.fn(),
}));

vi.mock('@/lib/api/endpoints', () => ({
  updateMe: vi.fn(),
}));

vi.mock('@/lib/auth/auth.service', () => ({
  resetPassword: vi.fn(),
  startGeorgianPhoneLink: vi.fn(),
  verifyGeorgianPhoneLink: vi.fn(),
}));

vi.mock('@/lib/auth/useGeorgianPhoneAuthAvailability', () => ({
  useGeorgianPhoneAuthAvailability: () => georgianPhoneAvailabilityMock(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SettingsScreen account deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    georgianPhoneAvailabilityMock.mockReturnValue({
      country: 'GE',
      isAvailable: true,
      isLoading: false,
    });
    vi.mocked(startGeorgianPhoneLink).mockReset();
    vi.mocked(verifyGeorgianPhoneLink).mockReset();
  });

  it('requires exact DELETE confirmation before submitting account deletion', async () => {
    render(<SettingsScreen onBack={vi.fn()} />);

    fireEvent.click(screen.getByText('Delete Account'));

    const confirmButton = screen.getByRole('button', { name: 'Delete Account' });
    expect(confirmButton).toBeDisabled();

    const input = screen.getByLabelText('Type DELETE to confirm');
    fireEvent.input(input, { target: { value: 'delete' } });
    expect(input).toHaveValue('delete');
    expect(screen.getByRole('button', { name: 'Delete Account' })).toBeDisabled();

    fireEvent.input(input, { target: { value: 'DELETE' } });
    expect(input).toHaveValue('DELETE');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete Account' })).not.toBeDisabled();
    });
  });

  it('keeps the user signed in when deletion request fails', async () => {
    vi.mocked(requestAccountDeletion).mockRejectedValue(new Error('network'));
    render(<SettingsScreen onBack={vi.fn()} />);

    fireEvent.click(screen.getByText('Delete Account'));
    fireEvent.input(screen.getByLabelText('Type DELETE to confirm'), {
      target: { value: 'DELETE' },
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete Account' })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));

    await waitFor(() => {
      expect(requestAccountDeletion).toHaveBeenCalled();
    });

    expect(logoutMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete Account' })).not.toBeDisabled();
  });

  it('links a Georgian phone number through the OTP modal', async () => {
    vi.mocked(startGeorgianPhoneLink).mockResolvedValue({
      message: 'Verification code sent',
      phone: '+995577123456',
      otp_required: true,
    });
    vi.mocked(verifyGeorgianPhoneLink).mockResolvedValue({
      id: 'user-id',
      email: 'player@example.com',
      phone_number: '+995577123456',
      phone_verified_at: '2026-05-28T20:00:00.000Z',
      role: 'user',
      nickname: 'Player',
      country: null,
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
      created_at: '2026-05-28T19:00:00.000Z',
    });

    render(<SettingsScreen onBack={vi.fn()} />);

    fireEvent.click(screen.getByText('Add or change phone'));
    fireEvent.input(screen.getByPlaceholderText('+995 5XX XXX XXX'), {
      target: { value: '577123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    await waitFor(() => {
      expect(startGeorgianPhoneLink).toHaveBeenCalledWith('+995577123456');
    });
    expect(await screen.findByText('We sent a code to +995577123456.')).toBeInTheDocument();

    fireEvent.input(screen.getByPlaceholderText('123456'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify phone' }));

    await waitFor(() => {
      expect(verifyGeorgianPhoneLink).toHaveBeenCalledWith('+995577123456', '123456');
    });
    expect(setAuthenticatedMock).toHaveBeenCalledWith(expect.objectContaining({
      phone_number: '+995577123456',
      phone_verified_at: '2026-05-28T20:00:00.000Z',
    }));
  });

  it('hides phone setup outside Georgia', () => {
    georgianPhoneAvailabilityMock.mockReturnValue({
      country: 'US',
      isAvailable: false,
      isLoading: false,
    });

    render(<SettingsScreen onBack={vi.fn()} />);

    expect(screen.queryByText('Add or change phone')).not.toBeInTheDocument();
    expect(screen.queryByText('No phone number linked yet')).not.toBeInTheDocument();
  });
});
