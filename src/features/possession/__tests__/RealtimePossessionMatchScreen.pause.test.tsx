import { render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      const copy: Record<string, string> = {
        'possession.matchPaused': 'Match paused',
        'possession.opponentDisconnected': 'Opponent disconnected',
        'possession.opponentDisconnectedWinIfNotReturn': `Win if they do not return in ${vars?.seconds}s`,
        'possession.leaveSafely': 'Leave safely',
        'possession.muteAudio': 'Mute audio',
        'possession.unmuteAudio': 'Unmute audio',
        'common.mute': 'Mute',
        'common.unmute': 'Unmute',
      };
      return copy[key] ?? key;
    },
  }),
}));

vi.mock('../hooks/useRealtimePossessionMatchController', () => ({
  useRealtimePossessionMatchController: () => ({
    isReady: true,
    showStartCountdown: false,
    countdownDisplay: 0,
    countdownPhase: 'kickoff',
    penaltyCountdownActive: false,
    penaltyCountdownDisplay: 0,
    muted: false,
    toggleMuted: vi.fn(),
    viewportModel: {},
    questionAreaModel: null,
    showQuestionArea: false,
    halftimeModel: { visible: true },
    quitModalOpen: false,
    setQuitModalOpen: vi.fn(),
    handleTemporaryQuit: vi.fn(),
    handleForfeit: vi.fn(),
  }),
}));

vi.mock('@/lib/match/useMatchUiReadyAcks', () => ({
  useMatchUiReadyAcks: vi.fn(),
}));

vi.mock('@/lib/realtime/useMatchStagePresence', () => ({
  useMatchStagePresence: vi.fn(),
}));

vi.mock('@/components/shared/RealtimeConnectionBanner', () => ({
  RealtimeConnectionBanner: () => null,
}));

vi.mock('@/components/shared/ConnectionQualitySignal', () => ({
  ConnectionQualitySignal: () => null,
}));

vi.mock('@/components/match/QuitMatchModal', () => ({
  QuitMatchModal: () => null,
}));

vi.mock('../components/PossessionMatchViewport', () => ({
  PossessionMatchViewport: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="viewport">{children}</div>
  ),
}));

vi.mock('../components/HalftimeScreen', () => ({
  HalftimeScreen: () => <div data-testid="halftime-screen" className="fixed inset-0 z-50" />,
}));

vi.mock('../components/MatchHudPrimitives', () => ({
  MatchHudIconButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock('../components/KickoffCountdownOverlay', () => ({
  KickoffCountdownOverlay: () => null,
}));

vi.mock('../components/PenaltyStartCountdownOverlay', () => ({
  PenaltyStartCountdownOverlay: () => null,
}));

vi.mock('../components/PenaltyMatchEndOverlay', () => ({
  PenaltyMatchEndOverlay: () => null,
}));

vi.mock('../components/PossessionQuestionArea', () => ({
  PossessionQuestionArea: () => null,
}));

vi.mock('../components/BarBattleFlightOverlay', () => ({
  BarBattleFlightOverlay: () => null,
}));

vi.mock('../hooks/usePossessionBarBattleFlights', () => ({
  usePossessionBarBattleFlights: () => ({
    suppressScoreSplash: false,
    flights: [],
    handleFlightArrive: vi.fn(),
  }),
}));

import { RealtimePossessionMatchScreen } from '../RealtimePossessionMatchScreen';

const baseProps = {
  playerAvatar: 'me.png',
  playerUsername: 'Me',
  opponentAvatar: 'opponent.png',
  opponentUsername: 'Opponent',
  onQuit: vi.fn(),
  onForfeit: vi.fn(),
};

describe('RealtimePossessionMatchScreen pause overlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-16T12:00:00.000Z'));
    useRealtimeMatchStore.getState().reset();
    const store = useRealtimeMatchStore.getState();
    store.setMatchStart({
      matchId: 'match-1',
      mode: 'ranked',
      variant: 'ranked_sim',
      mySeat: 1,
      opponent: { id: 'u2', username: 'Opponent', avatarUrl: null },
      participants: [
        { userId: 'u1', username: 'Me', avatarUrl: null, seat: 1 },
        { userId: 'u2', username: 'Opponent', avatarUrl: null, seat: 2 },
      ],
    });
    store.setMatchPaused({ graceMs: 8_000, remainingReconnects: 2 });
  });

  it('renders the pause overlay above the fixed halftime screen', () => {
    render(<RealtimePossessionMatchScreen {...baseProps} />);

    const overlayCopy = screen.getByText('Opponent disconnected');
    let overlay = overlayCopy.parentElement;
    while (overlay && !overlay.className.toString().includes('z-[')) {
      overlay = overlay.parentElement;
    }

    expect(screen.getByTestId('halftime-screen')).toHaveClass('z-50');
    expect(overlay).not.toBeNull();
    expect(overlay?.className.toString()).toContain('fixed');
    expect(overlay?.className.toString()).toContain('z-[80]');
  });
});
