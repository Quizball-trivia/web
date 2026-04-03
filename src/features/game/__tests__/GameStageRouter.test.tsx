import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GameStageRouter } from '../GameStageRouter';

const router = {
  push: vi.fn(),
  replace: vi.fn(),
};

const socket = {
  connected: true,
  id: 'socket-1',
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

function createInitialGameSessionState() {
  return {
    stage: 'showdown',
    config: { mode: 'ranked', matchType: 'friendly', categoryName: 'Football', categoryIcon: '⚽' },
    questions: [],
    setStage: vi.fn(),
    reset: vi.fn(),
  };
}

function createInitialRealtimeMatchState() {
  return {
    lobby: null,
    draft: null,
    match: {
      matchId: 'match-1',
      variant: 'friendly_party_quiz',
      opponent: { id: 'opp-1', username: 'Opponent', avatarUrl: null, rp: 1200 },
      participants: [
        { userId: 'self-1', username: 'Player One', avatarUrl: null, seat: 1 },
        { userId: 'opp-1', username: 'Opponent', avatarUrl: null, seat: 2 },
      ],
    },
    error: null,
    sessionState: { state: 'READY' },
    selfUserId: 'self-1',
    exitCompletedMatchToLobby: vi.fn(),
    reset: vi.fn(),
  };
}

function createInitialRankedMatchmakingState() {
  return {
    rankedSearching: false,
    rankedSearchDurationMs: 0,
    rankedSearchStartedAt: null,
    rankedFoundOpponent: null,
  };
}

const gameSessionState = createInitialGameSessionState();

const realtimeMatchState = createInitialRealtimeMatchState();

const rankedMatchmakingState = createInitialRankedMatchmakingState();

const playerState = {
  player: {
    id: 'self-1',
    username: 'Player One',
    avatar: 'avatar-1',
    avatarCustomization: { base: 'avatar-1' },
    rankPoints: 1000,
    level: 7,
  },
};

const authState = {
  user: {
    id: 'self-1',
    avatar_url: null,
    progression: null,
    country: 'US',
    favorite_club: 'Chelsea',
  },
};

const rankedProfileData = {
  rp: 1000,
  placementStatus: 'placed',
};

const possessionMatchState = {
  totalCorrect: 0,
  totalQuestions: 12,
};

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('@/stores/gameSession.store', () => ({
  useGameSessionStore: (selector: (state: typeof gameSessionState) => unknown) => selector(gameSessionState),
}));

vi.mock('@/contexts/PlayerContext', () => ({
  usePlayer: () => playerState,
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('@/stores/realtimeMatch.store', () => ({
  useRealtimeMatchStore: (selector: (state: typeof realtimeMatchState) => unknown) => selector(realtimeMatchState),
}));

vi.mock('@/stores/rankedMatchmaking.store', () => ({
  useRankedMatchmakingStore: (selector: (state: typeof rankedMatchmakingState) => unknown) => selector(rankedMatchmakingState),
}));

vi.mock('@/lib/realtime/useRealtimeConnection', () => ({
  useRealtimeConnection: () => socket,
}));

vi.mock('@/lib/realtime/socket-client', () => ({
  getSocket: () => socket,
}));

vi.mock('@/features/game/hooks/useGameStageTransitions', () => ({
  useGameStageTransitions: () => {},
}));

vi.mock('@/lib/queries/ranked.queries', () => ({
  useRankedProfile: () => ({ data: rankedProfileData }),
}));

vi.mock('@/stores/possessionMatch.store', () => ({
  usePossessionMatchStore: (selector: (state: typeof possessionMatchState) => unknown) => selector(possessionMatchState),
}));

vi.mock('@/lib/avatars', () => ({
  resolveAvatarUrl: (value: string | null | undefined) => value ?? 'avatar-fallback',
}));

vi.mock('@/features/game/components/MatchmakingMapScreen', () => ({
  MatchmakingMapScreen: () => <div>Matchmaking Map</div>,
}));

vi.mock('@/features/game/components/ShowdownScreen', () => ({
  ShowdownScreen: (props: { matchType: string }) => <div>Showdown {props.matchType}</div>,
}));

vi.mock('@/features/play/RankedCategoryBlockingScreen', () => ({
  RankedCategoryBlockingScreen: () => <div>Ranked Category Blocking</div>,
}));

vi.mock('@/features/game/RealtimeResultsScreen', () => ({
  RealtimeResultsScreen: () => <div>Realtime Results</div>,
}));

vi.mock('@/features/possession/RealtimePossessionMatchScreen', () => ({
  RealtimePossessionMatchScreen: () => <div>Realtime Possession Match</div>,
}));

vi.mock('@/features/party/RealtimePartyQuizScreen', () => ({
  RealtimePartyQuizScreen: () => <div>Realtime Party Quiz</div>,
}));

vi.mock('@/features/party/PartyQuizResultsScreen', () => ({
  PartyQuizResultsScreen: () => <div>Party Quiz Results</div>,
}));

vi.mock('@/components/shared/LoadingScreen', () => ({
  LoadingScreen: () => <div>Loading Screen</div>,
}));

vi.mock('@/features/training/TrainingMatchScreen', () => ({
  TrainingMatchScreen: () => <div>Training Match</div>,
}));

describe('GameStageRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(gameSessionState, createInitialGameSessionState());
    Object.assign(realtimeMatchState, createInitialRealtimeMatchState());
    Object.assign(rankedMatchmakingState, createInitialRankedMatchmakingState());
  });

  it('keeps party showdown flow in the centralized router', () => {
    render(<GameStageRouter />);

    expect(screen.getByText('Showdown friendly')).toBeInTheDocument();
  });

  it('renders the party quiz screen for party matches during playing', () => {
    gameSessionState.stage = 'playing';
    realtimeMatchState.match = {
      ...realtimeMatchState.match,
      variant: 'friendly_party_quiz',
    };

    render(<GameStageRouter />);

    expect(screen.getByText('Realtime Party Quiz')).toBeInTheDocument();
  });

  it('renders possession UI for friendly_possession matches', () => {
    gameSessionState.stage = 'playing';
    realtimeMatchState.match = {
      ...realtimeMatchState.match,
      variant: 'friendly_possession',
    };

    render(<GameStageRouter />);

    expect(screen.getByText('Realtime Possession Match')).toBeInTheDocument();
  });
});
