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
        'possession.waitingForOpponent': 'Waiting for opponent',
        'possession.startsAfterReady': 'Starts after ready',
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
  KickoffCountdownOverlay: (props: {
    waiting?: boolean;
    waitingLabel?: string;
    playerReady?: boolean;
    opponentReady?: boolean;
  }) => (
    <div data-testid="kickoff-overlay">
      <span>{props.waiting ? 'waiting' : 'countdown'}</span>
      <span>{props.waitingLabel}</span>
      <span>{props.playerReady ? 'player-ready' : 'player-waiting'}</span>
      <span>{props.opponentReady ? 'opponent-ready' : 'opponent-waiting'}</span>
    </div>
  ),
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
import { useMatchStagePresence } from '@/lib/realtime/useMatchStagePresence';

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
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-16T12:00:00.000Z'));
    useRealtimeMatchStore.getState().reset();
    const store = useRealtimeMatchStore.getState();
    store.setSelfUserId('u1');
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

  it('uses kickoff ready badges instead of the ready overlay before ranked kickoff countdown starts', () => {
    useRealtimeMatchStore.getState().reset();
    const store = useRealtimeMatchStore.getState();
    store.setSelfUserId('u1');
    store.setMatchStart({
      matchId: 'match-2',
      mode: 'ranked',
      variant: 'ranked_sim',
      mySeat: 1,
      opponent: { id: 'u2', username: 'Opponent', avatarUrl: null },
      participants: [
        { userId: 'u1', username: 'Me', avatarUrl: null, seat: 1 },
        { userId: 'u2', username: 'Opponent', avatarUrl: null, seat: 2 },
      ],
    });
    store.setMatchWaitingForReady({
      matchId: 'match-2',
      phase: 'kickoff',
      readyCount: 1,
      totalCount: 2,
      readyUserIds: ['u1'],
      waitingUserIds: ['u1', 'u2'],
      forceStartsAt: new Date(Date.now() + 10_000).toISOString(),
    });

    render(<RealtimePossessionMatchScreen {...baseProps} matchType="ranked" />);

    expect(screen.getByTestId('kickoff-overlay')).toHaveTextContent('waiting');
    expect(screen.getByTestId('kickoff-overlay')).toHaveTextContent('Waiting for opponent');
    expect(screen.getByTestId('kickoff-overlay')).toHaveTextContent('player-ready');
    expect(screen.getByTestId('kickoff-overlay')).toHaveTextContent('opponent-waiting');
    expect(screen.queryByText('possession.playersReadyCount')).not.toBeInTheDocument();
    expect(vi.mocked(useMatchStagePresence)).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: 'match-2',
        stageKey: 'kickoff',
      }),
    );
  });

  it('maps kickoff ready badges by user id instead of ready count order', () => {
    useRealtimeMatchStore.getState().reset();
    const store = useRealtimeMatchStore.getState();
    store.setSelfUserId('u1');
    store.setMatchStart({
      matchId: 'match-3',
      mode: 'ranked',
      variant: 'ranked_sim',
      mySeat: 1,
      opponent: { id: 'u2', username: 'Opponent', avatarUrl: null },
      participants: [
        { userId: 'u1', username: 'Me', avatarUrl: null, seat: 1 },
        { userId: 'u2', username: 'Opponent', avatarUrl: null, seat: 2 },
      ],
    });
    store.setMatchWaitingForReady({
      matchId: 'match-3',
      phase: 'kickoff',
      readyCount: 1,
      totalCount: 2,
      readyUserIds: ['u2'],
      waitingUserIds: ['u1', 'u2'],
      forceStartsAt: new Date(Date.now() + 10_000).toISOString(),
    });

    render(<RealtimePossessionMatchScreen {...baseProps} matchType="ranked" />);

    expect(screen.getByTestId('kickoff-overlay')).toHaveTextContent('player-waiting');
    expect(screen.getByTestId('kickoff-overlay')).toHaveTextContent('opponent-ready');
  });

  it('does not guess a ready side from count-only two-human ready payloads', () => {
    useRealtimeMatchStore.getState().reset();
    const store = useRealtimeMatchStore.getState();
    store.setSelfUserId('u1');
    store.setMatchStart({
      matchId: 'match-4',
      mode: 'ranked',
      variant: 'ranked_sim',
      mySeat: 1,
      opponent: { id: 'u2', username: 'Opponent', avatarUrl: null },
      participants: [
        { userId: 'u1', username: 'Me', avatarUrl: null, seat: 1 },
        { userId: 'u2', username: 'Opponent', avatarUrl: null, seat: 2 },
      ],
    });
    store.setMatchWaitingForReady({
      matchId: 'match-4',
      phase: 'kickoff',
      readyCount: 1,
      totalCount: 2,
      forceStartsAt: new Date(Date.now() + 10_000).toISOString(),
    });

    render(<RealtimePossessionMatchScreen {...baseProps} matchType="ranked" />);

    expect(screen.getByTestId('kickoff-overlay')).toHaveTextContent('player-waiting');
    expect(screen.getByTestId('kickoff-overlay')).toHaveTextContent('opponent-waiting');
  });
});
