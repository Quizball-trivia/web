import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import type { MatchStatePayload, ResolvedMatchQuestionPayload } from '@/lib/realtime/socket.types';

const mockOverlayState = {
  isHalftime: false,
  penaltyCountdownActive: false,
  penaltyCountdownDisplay: 5,
  showRoundTransition: false,
  showPenaltyTransition: false,
  transitionSnapshot: {
    title: 'Question 1',
    categoryName: 'Football',
    subtitle: '1st Half',
  },
};

const mockQuestion: ResolvedMatchQuestionPayload = {
  matchId: 'match-1',
  qIndex: 0,
  total: 12,
  phaseKind: 'normal',
  phaseRound: 1,
  deadlineAt: new Date(Date.now() + 10000).toISOString(),
  question: {
    kind: 'multipleChoice',
    id: 'q-1',
    prompt: 'Question 1',
    options: ['A', 'B', 'C', 'D'],
    categoryName: 'Football',
  },
};

vi.mock('@/features/game/hooks/useRealtimeGameLogic', () => ({
  useRealtimeGameLogic: () => ({
    state: {
      currentQuestion: mockQuestion,
      roundResult: null,
      roundResultHoldDone: false,
      roundResolved: false,
      questionPhase: 'playing',
      selectedAnswer: null,
      selectedAnswerQIndex: null,
      correctIndex: 0,
      opponentAnswered: false,
      showOptions: true,
      startCountdownActive: false,
      countdownSeconds: 0,
      playerScore: 120,
      opponentScore: 90,
      matchPaused: false,
      timeRemaining: 8,
    },
    actions: {
      submitAnswer: vi.fn(),
    },
  }),
}));

vi.mock('@/lib/queries/store.queries', () => ({
  useStoreInventory: () => ({
    data: {
      items: [],
    },
  }),
}));

vi.mock('@/lib/sounds/useGameSounds', () => ({
  useGameSounds: () => ({
    playSfx: vi.fn(),
    toggleMute: () => true,
    isMuted: () => false,
  }),
}));

vi.mock('../usePossessionGoalCelebration', () => ({
  usePossessionGoalCelebration: () => ({
    goalCelebration: null,
  }),
}));

vi.mock('../usePossessionRoundTransition', () => ({
  usePossessionFirstQuestionIntro: () => false,
  usePossessionRoundTransition: () => mockOverlayState,
}));

vi.mock('../usePossessionScoreSplashes', () => ({
  usePossessionScoreSplashes: () => ({
    showPlayerSplash: false,
    showOpponentSplash: false,
    playerSplashPoints: null,
    opponentSplashPoints: null,
    playerSplashVariant: 'points',
    opponentSplashVariant: 'points',
    onPlayerSplashComplete: vi.fn(),
    onOpponentSplashComplete: vi.fn(),
  }),
}));

vi.mock('../usePossessionFieldState', () => ({
  usePossessionFieldState: () => ({
    mySeat: 1,
    phaseKind: 'normal',
    isPenaltyQuestion: false,
    isLastAttackQuestion: false,
    isShotQuestion: false,
    isAttackAnimationPhase: false,
    isShotVisualPhase: false,
    attackerIsMe: true,
    shooterIsMe: false,
    resultShooterIsMe: false,
    delayedIsShooter: false,
    myGoals: 1,
    oppGoals: 0,
    myPenaltyGoals: 0,
    oppPenaltyGoals: 0,
    questionDurationSeconds: 10,
    zone: 'ATT',
    zoneColor: '#fff',
    visualMyPossessionPct: 65,
    shotResult: 'pending',
    penaltyResult: null,
    uiPhase: 'playing',
    pitchProps: {
      playerPosition: 65,
      playerAvatarUrl: '/me.png',
      opponentAvatarUrl: '/opp.png',
      playerName: 'me',
      opponentName: 'opp',
      mirrored: false,
      ballOnPlayer: true,
    },
  }),
}));

import { useRealtimePossessionMatchController } from '../useRealtimePossessionMatchController';

const MATCH_ID = 'match-1';

function seedMatchState(phase: MatchStatePayload['phase'] = 'NORMAL_PLAY') {
  const store = useRealtimeMatchStore.getState();
  store.setMatchStart({
    matchId: MATCH_ID,
    mode: 'ranked',
    variant: 'ranked_sim',
    mySeat: 1,
    opponent: { id: 'user-b', username: 'opponent', avatarUrl: null },
    participants: [
      { userId: 'user-a', username: 'me', avatarUrl: null, seat: 1 },
      { userId: 'user-b', username: 'opponent', avatarUrl: null, seat: 2 },
    ],
  });
  store.setSelfUserId('user-a');
  store.setMatchState({
    matchId: MATCH_ID,
    phase,
    half: 1,
    possessionDiff: 30,
    normalQuestionsAnsweredInHalf: 1,
    attackerSeat: 1,
    kickOffSeat: 1,
    goals: { seat1: 1, seat2: 0 },
    penaltyGoals: { seat1: 0, seat2: 0 },
    phaseKind: 'normal',
    phaseRound: 1,
    shooterSeat: null,
    halftime: {
      deadlineAt: null,
      categoryOptions: [],
      firstBanSeat: null,
      bans: { seat1: null, seat2: null },
    },
    stateVersion: 1,
  });
}

describe('useRealtimePossessionMatchController', () => {
  beforeEach(() => {
    useRealtimeMatchStore.getState().reset();
    mockOverlayState.isHalftime = false;
    seedMatchState();
  });

  it('builds a multiple-choice question area model and viewport model for a live normal round', () => {
    const { result } = renderHook(() => useRealtimePossessionMatchController({
      playerAvatar: '/me.png',
      playerUsername: 'me',
      opponentAvatar: '/opp.png',
      opponentUsername: 'opp',
      onQuit: vi.fn(),
      onForfeit: vi.fn(),
    }));

    expect(result.current.isReady).toBe(true);
    expect(result.current.viewportModel?.hud.kind).toBe('possession');
    expect(result.current.questionAreaModel?.content.kind).toBe('multipleChoice');
    expect(result.current.showQuestionArea).toBe(true);
    expect(result.current.halftimeModel).toBeNull();
  });

  it('builds a halftime model when the overlay state enters halftime', () => {
    mockOverlayState.isHalftime = true;

    const { result } = renderHook(() => useRealtimePossessionMatchController({
      playerAvatar: '/me.png',
      playerUsername: 'me',
      opponentAvatar: '/opp.png',
      opponentUsername: 'opp',
      onQuit: vi.fn(),
      onForfeit: vi.fn(),
    }));

    expect(result.current.showMainUI).toBe(false);
    expect(result.current.showQuestionArea).toBe(false);
    expect(result.current.halftimeModel?.visible).toBe(true);
    expect(result.current.halftimeModel?.playerGoals).toBe(1);
  });
});
