import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserPreferences, setUserPreferences } from '@/lib/preferences/userPreferences';
import { AuctionAudioControl } from '../AuctionAudioControl';

const audio = vi.hoisted(() => ({
  muted: false,
  setMuted: vi.fn((muted: boolean, options?: { resumeBgm?: boolean }) => {
    void options;
    audio.muted = muted;
  }),
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'en',
    t: (key: string) => {
      const copy: Record<string, string> = {
        'auctionGame.audioControls': 'Sound controls',
        'auctionGame.audioControlsDescription': 'Choose what you hear during the auction.',
        'auctionGame.backgroundMusic': 'Background music',
        'auctionGame.backgroundMusicDescription': 'Stadium soundtrack throughout the match',
        'auctionGame.soundEffects': 'Sound effects',
        'auctionGame.soundEffectsDescription': 'Bids, clues, bells and result sounds',
        'auctionGame.audioOn': 'On',
        'auctionGame.audioOff': 'Off',
      };
      return copy[key] ?? key;
    },
  }),
}));

vi.mock('@/lib/sounds/gameSounds', () => ({
  isMuted: () => audio.muted,
  setMuted: audio.setMuted,
}));

describe('AuctionAudioControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    audio.muted = false;
    setUserPreferences({ soundEnabled: true, musicEnabled: true });
  });

  it('shows independent controls for background music and sound effects', () => {
    render(<AuctionAudioControl />);

    fireEvent.click(screen.getByRole('button', { name: 'Sound controls' }));

    expect(screen.getByRole('switch', { name: 'Background music: On' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Sound effects: On' })).toBeChecked();
  });

  it('changes only the selected audio preference', async () => {
    render(<AuctionAudioControl />);
    fireEvent.click(screen.getByRole('button', { name: 'Sound controls' }));

    fireEvent.click(screen.getByRole('switch', { name: 'Background music: On' }));

    await waitFor(() => {
      expect(getUserPreferences()).toMatchObject({
        musicEnabled: false,
        soundEnabled: true,
      });
    });
    expect(screen.getByRole('switch', { name: 'Background music: Off' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Sound effects: On' })).toBeChecked();
  });

  it('clears a legacy master mute when Auction audio is enabled', async () => {
    audio.muted = true;

    render(<AuctionAudioControl />);

    await waitFor(() => expect(audio.setMuted).toHaveBeenCalledWith(false, { resumeBgm: true }));
    expect(audio.muted).toBe(false);
  });

  it('does not resume background music when only sound effects are enabled', async () => {
    audio.muted = true;
    setUserPreferences({ soundEnabled: true, musicEnabled: false });

    render(<AuctionAudioControl />);

    await waitFor(() => expect(audio.setMuted).toHaveBeenCalledWith(false, { resumeBgm: false }));
  });
});
