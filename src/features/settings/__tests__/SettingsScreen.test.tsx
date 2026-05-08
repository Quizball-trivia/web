import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsScreen } from '../SettingsScreen';
import { requestAccountDeletion } from '@/lib/repositories/users.repo';

const logoutMock = vi.fn();
const setAuthenticatedMock = vi.fn();

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    logout: logoutMock,
    setAuthenticated: setAuthenticatedMock,
    user: {
      id: 'user-id',
      preferred_language: 'en',
    },
  }),
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'en',
    setLocale: vi.fn(),
    t: (key: string) => {
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
      };
      return messages[key] ?? key;
    },
  }),
}));

vi.mock('@/lib/repositories/users.repo', () => ({
  requestAccountDeletion: vi.fn(),
}));

vi.mock('@/lib/api/endpoints', () => ({
  updateMe: vi.fn(),
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
});
