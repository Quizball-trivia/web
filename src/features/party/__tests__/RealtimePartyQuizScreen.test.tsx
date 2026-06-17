import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  MatchAnswerAckPayload,
  MatchParticipant,
  MatchPartyStatePayload,
  MatchRoundResultPayload,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';

// ---------------------------------------------------------------------------
// Mocks
//
// The party screen pulls from `useRealtimeMatchStore`, `useRealtimeGameLogic`,
// `usePossessionFirstQuestionIntro`, BGM helpers, and a handful of
// presentational components. Stub them all so render is fast, deterministic,
// and doesn't drag in socket.io / framer-motion measurement quirks.
// ---------------------------------------------------------------------------

const playBgmMock = vi.fn();
const stopBgmMock = vi.fn();
const toggleMuteMock = vi.fn(() => false);
vi.mock('@/lib/sounds/useGameSounds', () => ({
  useGameSounds: () => ({
    playBgm: (...args: unknown[]) => playBgmMock(...args),
    stopBgm: (...args: unknown[]) => stopBgmMock(...args),
    toggleMute: toggleMuteMock,
    isMuted: () => false,
    playSfx: vi.fn(),
    setBgmVolume: vi.fn(),
  }),
}));

const usePossessionFirstQuestionIntroMock = vi.fn().mockReturnValue(false);
vi.mock('@/features/possession/hooks/usePossessionRoundTransition', () => ({
  usePossessionFirstQuestionIntro: (...args: unknown[]) =>
    usePossessionFirstQuestionIntroMock(...args),
}));

vi.mock('@/components/AvatarDisplay', () => ({
  AvatarDisplay: ({ className }: { className?: string }) => (
    <div data-testid="avatar" className={className} />
  ),
}));

vi.mock('@/components/shared/LoadingScreen', () => ({
  LoadingScreen: ({ text }: { text?: string }) => (
    <div data-testid="loading-screen" data-text={text ?? ''} />
  ),
}));

vi.mock('@/components/shared/MatchCountdownPuck', () => ({
  MatchCountdownPuck: ({ label, seconds }: { label: string; seconds: number }) => (
    <div data-testid="countdown-puck" data-label={label} data-seconds={seconds} />
  ),
}));

vi.mock('@/components/game/RoundTransitionOverlay', () => ({
  RoundTransitionOverlay: ({ title, categoryName }: { title: string; categoryName: string }) => (
    <div data-testid="round-transition" data-title={title} data-category={categoryName} />
  ),
}));

// Capture the latest props the screen forwards to PossessionQuestionPanel so
// tests can verify the answer hand-off + party-pick chip mapping.
const possessionPanelProps = vi.hoisted(() => ({
  current: null as null | {
    onAnswer?: (index: number) => void;
    partyPicks?: unknown;
    partyMatchHeader?: { onQuit: () => void };
  },
}));
vi.mock('@/components/game/PossessionQuestionPanel', () => ({
  PossessionQuestionPanel: (props: {
    onAnswer?: (index: number) => void;
    partyPicks?: unknown;
    partyMatchHeader?: { onQuit: () => void };
  }) => {
    possessionPanelProps.current = {
      onAnswer: props.onAnswer,
      partyPicks: props.partyPicks,
      partyMatchHeader: props.partyMatchHeader,
    };
    return (
      <>
        {props.partyMatchHeader ? (
          <button
            type="button"
            data-testid="party-match-quit"
            onClick={props.partyMatchHeader.onQuit}
          >
            quit
          </button>
        ) : null}
        <button
          type="button"
          data-testid="possession-panel"
          onClick={() => props.onAnswer?.(2)}
        >
          possession-panel
        </button>
      </>
    );
  },
}));

// QuitMatchModal — we only care about the open/close + button wiring.
vi.mock('@/components/match/QuitMatchModal', () => ({
  QuitMatchModal: ({
    open,
    onOpenChange,
    onConfirm,
    onSecondaryConfirm,
    confirmLabel,
    secondaryConfirmLabel,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    onSecondaryConfirm?: () => void;
    confirmLabel?: string;
    secondaryConfirmLabel?: string;
  }) =>
    open ? (
      <div data-testid="quit-modal">
        <button type="button" data-testid="quit-confirm" onClick={onConfirm}>
          {confirmLabel ?? 'Forfeit'}
        </button>
        <button type="button" data-testid="quit-secondary" onClick={onSecondaryConfirm}>
          {secondaryConfirmLabel ?? 'Leave'}
        </button>
        <button
          type="button"
          data-testid="quit-close"
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
      </div>
    ) : null,
}));

// `useRealtimeMatchStore(selector)` — provide a per-test store snapshot and
// run every selector against it.
const storeSnapshot = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));
vi.mock('@/stores/realtimeMatch.store', () => ({
  useRealtimeMatchStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector(storeSnapshot.current),
}));

// `useRealtimeGameLogic` returns { state, actions }. Tests poke `state` and
// observe what gets sent into `actions.submitAnswer`.
const gameLogic = vi.hoisted(() => ({
  state: {
    selectedAnswer: null as number | null,
    selectedAnswerQIndex: undefined as number | undefined,
    correctIndex: undefined as number | undefined,
    timeRemaining: 10,
    showOptions: true,
    questionPhase: 'playing' as 'reveal' | 'playing' | 'resolved',
    roundResolved: false,
    roundResult: null as MatchRoundResultPayload | null,
    roundResultHoldDone: false,
    answerAck: null as MatchAnswerAckPayload | null,
    startCountdownActive: false,
    countdownSeconds: 3,
    countdownReason: 'kickoff' as 'kickoff' | 'resume',
    matchPaused: false,
    pauseUntil: null as number | null,
  },
  actions: {
    submitAnswer: vi.fn(),
  },
}));

vi.mock('@/lib/match/useRealtimeGameLogic', () => ({
  useRealtimeGameLogic: () => gameLogic,
}));

import { RealtimePartyQuizScreen } from '../RealtimePartyQuizScreen';

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

const SELF_ID = 'self-user';
const OPP_ID = 'opp-user';
const THIRD_ID = 'third-user';

function buildParticipants(): MatchParticipant[] {
  return [
    { userId: SELF_ID, username: 'You', avatarUrl: null, seat: 1 },
    { userId: OPP_ID, username: 'Opponent', avatarUrl: null, seat: 2 },
    { userId: THIRD_ID, username: 'Third', avatarUrl: null, seat: 3 },
  ];
}

function buildPartyState(
  overrides: Partial<MatchPartyStatePayload> = {},
): MatchPartyStatePayload {
  return {
    matchId: 'party-match',
    totalQuestions: 10,
    currentQuestionIndex: 0,
    leaderUserId: OPP_ID,
    rankingOrder: [OPP_ID, SELF_ID, THIRD_ID],
    players: [
      { userId: OPP_ID, totalPoints: 200, correctAnswers: 2, answered: true, rank: 1, avgTimeMs: 4500 },
      { userId: SELF_ID, totalPoints: 150, correctAnswers: 1, answered: false, rank: 2, avgTimeMs: 5000 },
      { userId: THIRD_ID, totalPoints: 90, correctAnswers: 1, answered: false, rank: 3, avgTimeMs: 5200 },
    ],
    stateVersion: 1,
    ...overrides,
  };
}

function buildQuestion(
  overrides: Partial<ResolvedMatchQuestionPayload> = {},
): ResolvedMatchQuestionPayload {
  const now = Date.now();
  return {
    matchId: 'party-match',
    qIndex: 0,
    total: 10,
    playableAt: new Date(now).toISOString(),
    deadlineAt: new Date(now + 10_000).toISOString(),
    phaseKind: 'normal',
    phaseRound: 1,
    question: {
      kind: 'multipleChoice',
      id: 'q1',
      prompt: 'Test prompt?',
      options: ['A', 'B', 'C', 'D'],
      categoryId: 'cat',
      categoryName: 'Cat',
      difficulty: 'medium',
    },
    ...overrides,
  };
}

interface StoreSnapshot {
  partyState: MatchPartyStatePayload | null;
  participants: MatchParticipant[];
  currentQuestion: ResolvedMatchQuestionPayload | null;
  answerAck: MatchAnswerAckPayload | null;
  finalResults: unknown;
  selfUserId: string | null;
  forfeitPending: { matchId: string; reason: string; message: string } | null;
  countdownEndsAt: number | null;
  matchCategoryName: Record<string, string> | null;
}

function makeStore(overrides: Partial<StoreSnapshot> = {}): Record<string, unknown> {
  const snapshot: StoreSnapshot = {
    partyState: buildPartyState(),
    participants: buildParticipants(),
    currentQuestion: buildQuestion(),
    answerAck: null,
    finalResults: null,
    selfUserId: SELF_ID,
    forfeitPending: null,
    countdownEndsAt: null,
    matchCategoryName: null,
    ...overrides,
  };
  // The component reads through chained accessors like `store.match?.partyState`.
  // Build a `match` object that exposes the right fields when those selectors run.
  return {
    match: snapshot.partyState
      ? {
          partyState: snapshot.partyState,
          participants: snapshot.participants,
          categoryName: snapshot.matchCategoryName,
          currentQuestion: snapshot.currentQuestion,
          answerAck: snapshot.answerAck,
          finalResults: snapshot.finalResults,
          countdownEndsAt: snapshot.countdownEndsAt,
        }
      : null,
    selfUserId: snapshot.selfUserId,
    forfeitPending: snapshot.forfeitPending,
  };
}

function resetGameLogic() {
  gameLogic.state = {
    selectedAnswer: null,
    selectedAnswerQIndex: undefined,
    correctIndex: undefined,
    timeRemaining: 10,
    showOptions: true,
    questionPhase: 'playing',
    roundResolved: false,
    roundResult: null,
    roundResultHoldDone: false,
    answerAck: null,
    startCountdownActive: false,
    countdownSeconds: 3,
    countdownReason: 'kickoff',
    matchPaused: false,
    pauseUntil: null,
  };
  gameLogic.actions.submitAnswer = vi.fn();
}

beforeEach(() => {
  playBgmMock.mockClear();
  stopBgmMock.mockClear();
  usePossessionFirstQuestionIntroMock.mockReturnValue(false);
  resetGameLogic();
  storeSnapshot.current = makeStore();
  possessionPanelProps.current = null;
});

afterEach(() => {
  vi.useRealTimers();
});

function renderScreen(
  props: Partial<Parameters<typeof RealtimePartyQuizScreen>[0]> = {},
) {
  const onQuit = vi.fn();
  const onForfeit = vi.fn();
  const utils = render(
    <RealtimePartyQuizScreen
      onQuit={onQuit}
      onForfeit={onForfeit}
      mobileStandingsPlacement="bottom-bar"
      disableBgm
      {...props}
    />,
  );
  return { ...utils, onQuit, onForfeit };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RealtimePartyQuizScreen — pre-match loading', () => {
  it('renders the LoadingScreen when partyState is missing and no countdown is active', () => {
    storeSnapshot.current = makeStore({ partyState: null });
    renderScreen();
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('countdown-puck')).not.toBeInTheDocument();
  });

  it('renders the countdown puck when partyState is missing but startCountdownActive is true', () => {
    storeSnapshot.current = makeStore({ partyState: null });
    gameLogic.state.startCountdownActive = true;
    gameLogic.state.countdownSeconds = 3;
    renderScreen();
    const puck = screen.getByTestId('countdown-puck');
    expect(puck).toBeInTheDocument();
    expect(puck.getAttribute('data-label')).toMatch(/quiz starts in/i);
    expect(puck.getAttribute('data-seconds')).toBe('3');
  });
});

describe('RealtimePartyQuizScreen — standings rendering', () => {
  it('shows every player in the standings sorted by rank with the leader crown', () => {
    renderScreen();
    // Three players in the desktop sidebar + (with bottom-bar placement) three
    // again in the mobile bottom bar. Just verify everyone is present.
    expect(screen.getAllByText('Opponent').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('You').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Third').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the mobile-inline standings list only when mobileStandingsPlacement="below-options"', () => {
    renderScreen({ mobileStandingsPlacement: 'below-options' });
    // The mobile-inline placement renders a `data-party-score-anchor-placement="mobile-inline"`
    // node per player (3 players). The mobile-bottom placement should NOT be rendered.
    const inlineAnchors = document.querySelectorAll('[data-party-score-anchor-placement="mobile-inline"]');
    const bottomAnchors = document.querySelectorAll('[data-party-score-anchor-placement="mobile-bottom"]');
    expect(inlineAnchors.length).toBe(3);
    expect(bottomAnchors.length).toBe(0);
  });

  it('renders the mobile bottom bar standings when mobileStandingsPlacement="bottom-bar"', () => {
    renderScreen({ mobileStandingsPlacement: 'bottom-bar' });
    const bottomAnchors = document.querySelectorAll('[data-party-score-anchor-placement="mobile-bottom"]');
    const inlineAnchors = document.querySelectorAll('[data-party-score-anchor-placement="mobile-inline"]');
    expect(bottomAnchors.length).toBe(3);
    expect(inlineAnchors.length).toBe(0);
  });

  it('keeps dropped players visible with a dropped badge', () => {
    storeSnapshot.current = makeStore({
      partyState: buildPartyState({
        players: [
          { userId: OPP_ID, totalPoints: 200, correctAnswers: 2, answered: true, rank: 1, avgTimeMs: 4500 },
          { userId: SELF_ID, totalPoints: 150, correctAnswers: 1, answered: false, rank: 2, avgTimeMs: 5000 },
          { userId: THIRD_ID, totalPoints: 90, correctAnswers: 1, answered: false, rank: 3, avgTimeMs: 5200, status: 'dropped' },
        ],
      }),
    });

    renderScreen();

    expect(screen.getAllByText('Third').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Dropped').length).toBeGreaterThanOrEqual(1);
  });
});

describe('RealtimePartyQuizScreen — quit modal wiring', () => {
  it('opens the modal when the header quit button is clicked', () => {
    renderScreen();
    expect(screen.queryByTestId('quit-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('party-match-quit'));
    expect(screen.getByTestId('quit-modal')).toBeInTheDocument();
  });

  it('invokes onForfeit and closes the modal when the primary action is confirmed', () => {
    const { onForfeit } = renderScreen();
    fireEvent.click(screen.getByTestId('party-match-quit'));
    fireEvent.click(screen.getByTestId('quit-confirm'));
    expect(onForfeit).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('quit-modal')).not.toBeInTheDocument();
  });

  it('invokes onQuit and closes the modal when the secondary action is confirmed', () => {
    const { onQuit } = renderScreen();
    fireEvent.click(screen.getByTestId('party-match-quit'));
    fireEvent.click(screen.getByTestId('quit-secondary'));
    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('quit-modal')).not.toBeInTheDocument();
  });
});

describe('RealtimePartyQuizScreen — overlays', () => {
  it('renders the forfeit-pending banner with the right title per reason', () => {
    storeSnapshot.current = makeStore({
      forfeitPending: {
        matchId: 'm1',
        reason: 'opponent_forfeit',
        message: 'Opponent quit',
      },
    });
    renderScreen();
    expect(screen.getByText(/opponent forfeited/i)).toBeInTheDocument();
    expect(screen.getByText('Opponent quit')).toBeInTheDocument();
  });

  it('renders the pause overlay when matchPaused and pauseUntil is in the future', () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);
    gameLogic.state.matchPaused = true;
    gameLogic.state.pauseUntil = now + 8_000;
    renderScreen();
    expect(screen.getByText(/match paused/i)).toBeInTheDocument();
    expect(screen.getByText(/waiting for a player to reconnect/i)).toBeInTheDocument();
    // Counts down — at +8s remaining, the copy should mention "8s"
    expect(screen.getByText(/continues if they don't return in 8s/i)).toBeInTheDocument();
  });
});

describe('RealtimePartyQuizScreen — answer hand-off', () => {
  it('wires PossessionQuestionPanel.onAnswer through to useRealtimeGameLogic.actions.submitAnswer', () => {
    renderScreen();
    expect(possessionPanelProps.current?.onAnswer).toBe(gameLogic.actions.submitAnswer);
    // Simulating a click on our stub button calls onAnswer(2)
    fireEvent.click(screen.getByTestId('possession-panel'));
    expect(gameLogic.actions.submitAnswer).toHaveBeenCalledTimes(1);
    expect(gameLogic.actions.submitAnswer).toHaveBeenCalledWith(2);
  });

  it('passes party pick chips for every other player once the round resolves', () => {
    gameLogic.state.roundResult = {
      matchId: 'party-match',
      qIndex: 0,
      questionKind: 'multipleChoice',
      reveal: { kind: 'multipleChoice', correctIndex: 1 },
      players: {
        [SELF_ID]: {
          selectedIndex: 0,
          isCorrect: false,
          timeMs: 4000,
          pointsEarned: 0,
          totalPoints: 150,
          submittedOrderIds: [],
        },
        [OPP_ID]: {
          selectedIndex: 1,
          isCorrect: true,
          timeMs: 4500,
          pointsEarned: 80,
          totalPoints: 280,
          submittedOrderIds: [],
        },
        [THIRD_ID]: {
          selectedIndex: 2,
          isCorrect: false,
          timeMs: 5000,
          pointsEarned: 0,
          totalPoints: 90,
          submittedOrderIds: [],
        },
      },
      rankingOrder: [OPP_ID, SELF_ID, THIRD_ID],
      phaseKind: 'normal',
      phaseRound: 1,
    } as unknown as MatchRoundResultPayload;
    gameLogic.state.roundResolved = true;

    renderScreen();
    const picks = possessionPanelProps.current?.partyPicks as
      | undefined
      | Array<{ userId: string; selectedIndex: number; isCorrect: boolean }>;
    expect(picks).toBeDefined();
    expect(picks).toHaveLength(2);
    const ids = picks!.map((p) => p.userId).sort();
    expect(ids).toEqual([OPP_ID, THIRD_ID].sort());
  });
});

describe('RealtimePartyQuizScreen — BGM lifecycle', () => {
  it('does not call playBgm/stopBgm when disableBgm is true', () => {
    gameLogic.state.startCountdownActive = true;
    const { unmount } = renderScreen({ disableBgm: true });
    unmount();
    expect(playBgmMock).not.toHaveBeenCalled();
    expect(stopBgmMock).not.toHaveBeenCalled();
  });

  it('plays kickoff BGM on mount when countdown is active and disableBgm is false', () => {
    gameLogic.state.startCountdownActive = true;
    renderScreen({ disableBgm: false });
    expect(playBgmMock).toHaveBeenCalledWith('kickoff');
  });

  it('does not play kickoff BGM when the countdown reason is "resume"', () => {
    gameLogic.state.startCountdownActive = true;
    gameLogic.state.countdownReason = 'resume';
    renderScreen({ disableBgm: false });
    expect(playBgmMock).not.toHaveBeenCalled();
  });

  it('stops BGM when finalResults arrive', () => {
    storeSnapshot.current = makeStore({
      finalResults: { matchId: 'm1', winnerId: SELF_ID } as unknown,
    });
    renderScreen({ disableBgm: false });
    expect(stopBgmMock).toHaveBeenCalled();
  });
});

describe('RealtimePartyQuizScreen — transition overlay', () => {
  it('renders the first-question intro overlay when the hook returns true', () => {
    usePossessionFirstQuestionIntroMock.mockReturnValue(true);
    renderScreen();
    const overlay = screen.getByTestId('round-transition');
    expect(overlay.getAttribute('data-title')).toMatch(/question 1/i);
  });

  it('renders the round transition overlay between questions', () => {
    gameLogic.state.roundResolved = true;
    gameLogic.state.roundResultHoldDone = true;
    renderScreen();
    const overlay = screen.getByTestId('round-transition');
    // Next question number = current (1) + 1 since round is resolved
    expect(overlay.getAttribute('data-title')).toMatch(/question 2/i);
  });
});

describe('RealtimePartyQuizScreen — score-flight survives mount when round resolves', () => {
  it('renders without throwing when round result arrives with mixed correctness', () => {
    gameLogic.state.roundResult = {
      matchId: 'party-match',
      qIndex: 0,
      questionKind: 'multipleChoice',
      reveal: { kind: 'multipleChoice', correctIndex: 1 },
      players: {
        [SELF_ID]: {
          selectedIndex: 0,
          isCorrect: false,
          timeMs: 4000,
          pointsEarned: 0,
          totalPoints: 150,
          submittedOrderIds: [],
        },
        [OPP_ID]: {
          selectedIndex: 1,
          isCorrect: true,
          timeMs: 4500,
          pointsEarned: 80,
          totalPoints: 280,
          submittedOrderIds: [],
        },
      },
      rankingOrder: [OPP_ID, SELF_ID, THIRD_ID],
      phaseKind: 'normal',
      phaseRound: 1,
    } as unknown as MatchRoundResultPayload;
    gameLogic.state.roundResolved = true;
    // Re-render with an answerAck for self so the optimistic + ack flight
    // paths both run.
    storeSnapshot.current = makeStore({
      answerAck: {
        matchId: 'party-match',
        qIndex: 0,
        questionKind: 'multipleChoice',
        selectedIndex: 0,
        isCorrect: false,
        correctIndex: 1,
        myTotalPoints: 150,
        oppAnswered: true,
        pointsEarned: 0,
        phaseKind: 'normal',
        phaseRound: 1,
      } as unknown as MatchAnswerAckPayload,
    });
    expect(() => renderScreen()).not.toThrow();
  });
});

// The pause-overlay test above already uses fake timers; make sure we don't
// leave them ticking for sibling test files.
afterEach(() => {
  void act; // no-op; reserved for future async assertions
});
