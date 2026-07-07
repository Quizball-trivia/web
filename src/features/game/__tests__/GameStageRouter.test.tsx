import { act, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

import { GameStageRouter } from '../GameStageRouter';

// GameStageRouter reads the store wallet (Play Again ticket gate) via
// TanStack Query, so renders need a QueryClientProvider.
function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return {
    ...view,
    rerender: (nextUi: ReactElement) =>
      view.rerender(<QueryClientProvider client={queryClient}>{nextUi}</QueryClientProvider>),
  };
}

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

type RealtimeResultsScreenMockProps = {
  finalWinnerId?: string | null;
  totalQuestions?: number;
  opponentId?: string;
  opponentRankPoints?: number | null;
  playerQuestionResults?: Array<'correct' | 'wrong' | null>;
  opponentQuestionResults?: Array<'correct' | 'wrong' | null>;
  onMainMenu?: () => void;
};

const realtimeResultsRenderProps = vi.hoisted(() => [] as RealtimeResultsScreenMockProps[]);
const analyticsMocks = vi.hoisted(() => ({
  trackResultsMainMenuClicked: vi.fn(),
  trackExitToPlayStarted: vi.fn(),
  markExitToPlayPending: vi.fn(),
  markRankedQueueIntent: vi.fn(),
}));
const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
}));

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
    suppressAutoRejoin: vi.fn(),
  };
}

function createInitialRankedMatchmakingState() {
  return {
    rankedSearching: false,
    rankedSearchDurationMs: 0,
    rankedSearchStartedAt: null,
    rankedFoundOpponent: null,
    rankedCancelRequestedAt: null,
    rankedQueueLeftAt: null,
    rankedQueueLeftSeq: 0,
    rankedQueueLeftSource: null,
    markRankedSearchRequested: vi.fn(),
    markRankedCancelRequested: vi.fn(),
    clearRankedMatchmaking: vi.fn(),
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
  useRealtimeMatchStore: Object.assign(
    (selector: (state: typeof realtimeMatchState) => unknown) => selector(realtimeMatchState),
    { getState: () => realtimeMatchState },
  ),
}));

vi.mock('@/stores/rankedMatchmaking.store', () => ({
  useRankedMatchmakingStore: Object.assign(
    (selector: (state: typeof rankedMatchmakingState) => unknown) => selector(rankedMatchmakingState),
    { getState: () => rankedMatchmakingState },
  ),
}));

vi.mock('@/lib/realtime/useRealtimeConnection', () => ({
  useRealtimeConnection: () => socket,
}));

vi.mock('@/lib/realtime/socket-client', () => ({
  getSocket: () => socket,
}));

vi.mock('@/lib/match/useGameStageTransitions', () => ({
  useGameStageTransitions: () => {},
}));

vi.mock('@/lib/analytics/game-events', () => analyticsMocks);

vi.mock('sonner', () => ({
  toast: toastMocks,
}));

vi.mock('@/lib/queries/ranked.queries', () => ({
  useRankedProfile: () => ({ data: rankedProfileData }),
}));

vi.mock('@/lib/queries/store.queries', () => ({
  useStoreWallet: () => ({ data: { tickets: 5 }, isFetching: false }),
  getStoreWalletQuery: () => ({
    queryKey: ['store', 'wallet'],
    queryFn: async () => ({ tickets: 5 }),
  }),
}));

vi.mock('@/stores/possessionMatch.store', () => ({
  usePossessionMatchStore: (selector: (state: typeof possessionMatchState) => unknown) => selector(possessionMatchState),
}));

vi.mock('@/lib/avatars', () => ({
  resolveAvatarUrl: (value: string | null | undefined) => value ?? 'avatar-fallback',
}));

vi.mock('@/components/match/MatchmakingMapScreen', () => ({
  MatchmakingMapScreen: (props: { onCancel: () => void; notice?: { message: string } | null }) => (
    <div>
      <div>Matchmaking Map</div>
      {props.notice ? <div role="status">{props.notice.message}</div> : null}
      <button type="button" onClick={props.onCancel}>Cancel Matchmaking</button>
    </div>
  ),
}));

vi.mock('@/components/ShowdownScreen', () => ({
  ShowdownScreen: (props: { matchType: string }) => <div>Showdown {props.matchType}</div>,
}));

vi.mock('@/features/play/RankedCategoryBlockingScreen', () => ({
  RankedCategoryBlockingScreen: () => <div>Ranked Category Blocking</div>,
}));

vi.mock('@/features/game/RealtimeResultsScreen', () => ({
  RealtimeResultsScreen: (props: RealtimeResultsScreenMockProps) => {
    realtimeResultsRenderProps.push(props);
    return (
      <div>
        <div>Realtime Results {String(props.finalWinnerId)}</div>
        <button type="button" onClick={props.onMainMenu}>Main Menu</button>
      </div>
    );
  },
}));

vi.mock('@/features/possession/RealtimePossessionMatchScreen', () => ({
  RealtimePossessionMatchScreen: (props: { onForfeit: () => void }) => (
    <div>
      <div>Realtime Possession Match</div>
      <button type="button" onClick={props.onForfeit}>Forfeit Match</button>
    </div>
  ),
}));

vi.mock('@/features/party/RealtimePartyQuizScreen', () => ({
  RealtimePartyQuizScreen: () => <div>Realtime Party Quiz</div>,
}));

vi.mock('@/features/party/PartyQuizResultsScreen', () => ({
  PartyQuizResultsScreen: (props: { onMainMenu: () => void }) => (
    <div>
      <div>Party Quiz Results</div>
      <button type="button" onClick={props.onMainMenu}>Party Main Menu</button>
    </div>
  ),
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
    realtimeResultsRenderProps.length = 0;
    Object.assign(gameSessionState, createInitialGameSessionState());
    Object.assign(realtimeMatchState, createInitialRealtimeMatchState());
    Object.assign(rankedMatchmakingState, createInitialRankedMatchmakingState());
    possessionMatchState.totalCorrect = 0;
    possessionMatchState.totalQuestions = 12;
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

  it('ranked matchmaking cancel marks the search cancelled before emitting leave', () => {
    gameSessionState.stage = 'matchmaking';
    gameSessionState.config = {
      mode: 'ranked',
      matchType: 'ranked',
      categoryName: 'Football',
      categoryIcon: '⚽',
    };
    realtimeMatchState.match = {
      ...realtimeMatchState.match,
      matchId: '',
    };

    render(<GameStageRouter />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Matchmaking' }));

    expect(rankedMatchmakingState.markRankedCancelRequested).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith('ranked:queue_leave');
    expect(socket.emit).toHaveBeenCalledWith('lobby:leave');
    expect(router.push).toHaveBeenCalledWith('/play');
  });

  it('recovers ranked boot when the paired opponent leaves before match:start', async () => {
    gameSessionState.stage = 'categoryBlocking';
    gameSessionState.config = {
      mode: 'ranked',
      matchType: 'ranked',
      categoryName: 'Football',
      categoryIcon: '⚽',
    };
    realtimeMatchState.match = null as never;
    realtimeMatchState.lobby = {
      lobbyId: 'lobby-1',
      mode: 'ranked',
      status: 'active',
      inviteCode: null,
      displayName: 'Ranked',
      isPublic: false,
      hostUserId: 'self-1',
      settings: { gameMode: 'ranked_sim' },
      members: [],
    } as never;
    realtimeMatchState.draft = {
      lobbyId: 'lobby-1',
      categories: [],
      bans: {},
      turnUserId: null,
      halfOneCategoryId: 'category-1',
    } as never;
    realtimeMatchState.sessionState = {
      state: 'IN_ACTIVE_MATCH',
      activeMatchId: 'pending-match-1',
      waitingLobbyId: 'lobby-1',
      queueSearchId: null,
      openLobbyIds: ['lobby-1'],
      resolvedAt: '2026-07-07T00:00:00.000Z',
    } as never;

    const { rerender } = render(<GameStageRouter />);

    realtimeMatchState.lobby = {
      lobbyId: 'lobby-1',
      mode: 'ranked',
      status: 'closed',
      inviteCode: null,
      displayName: 'Ranked',
      isPublic: false,
      hostUserId: 'self-1',
      settings: { gameMode: 'ranked_sim' },
      members: [],
    } as never;
    realtimeMatchState.draft = null;
    realtimeMatchState.sessionState = {
      state: 'IDLE',
      activeMatchId: null,
      waitingLobbyId: null,
      queueSearchId: null,
      openLobbyIds: [],
      resolvedAt: '2026-07-07T00:01:05.000Z',
    } as never;
    const rankedMutableState = rankedMatchmakingState as {
      rankedQueueLeftAt: number | null;
      rankedQueueLeftSeq: number;
      rankedQueueLeftSource: 'server_event' | 'socket_error' | null;
    };
    rankedMutableState.rankedQueueLeftAt = Date.now();
    rankedMutableState.rankedQueueLeftSeq += 1;
    rankedMutableState.rankedQueueLeftSource = 'server_event';
    rerender(<GameStageRouter />);

    await waitFor(() => {
      expect(gameSessionState.setStage).toHaveBeenCalledWith('matchmaking');
    });
    expect(analyticsMocks.markRankedQueueIntent).toHaveBeenCalledWith('recovery');
    expect(toastMocks.info).toHaveBeenCalledWith("Opponent didn't show up");
  });

  it('returns to /play when ranked boot preparation exceeds the client timeout', async () => {
    vi.useFakeTimers();
    try {
      gameSessionState.stage = 'categoryBlocking';
      gameSessionState.config = {
        mode: 'ranked',
        matchType: 'ranked',
        categoryName: 'Football',
        categoryIcon: '⚽',
      };
      realtimeMatchState.match = null as never;
      realtimeMatchState.lobby = null;
      realtimeMatchState.draft = null;
      realtimeMatchState.sessionState = {
        state: 'IN_ACTIVE_MATCH',
        activeMatchId: 'pending-match-1',
        waitingLobbyId: null,
        queueSearchId: null,
        openLobbyIds: [],
        resolvedAt: '2026-07-07T00:00:00.000Z',
      } as never;

      render(<GameStageRouter />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(90_000);
      });

      expect(toastMocks.info).toHaveBeenCalledWith("Opponent didn't show up");
      expect(router.push).toHaveBeenCalledWith('/play');
      expect(analyticsMocks.markRankedQueueIntent).not.toHaveBeenCalledWith('recovery');
      expect(gameSessionState.setStage).not.toHaveBeenCalledWith('matchmaking');
    } finally {
      vi.useRealTimers();
    }
  });

  it('forfeit emits match:forfeit and moves the forfeiting player to the settling/results stage without navigating away', () => {
    gameSessionState.stage = 'playing';
    realtimeMatchState.match = {
      ...realtimeMatchState.match,
      matchId: 'match-forfeit-1',
      variant: 'friendly_possession',
    };

    render(<GameStageRouter />);

    fireEvent.click(screen.getByRole('button', { name: 'Forfeit Match' }));

    // The forfeit is reported and the trailing rejoin offer is suppressed.
    expect(socket.emit).toHaveBeenCalledWith('match:forfeit', { matchId: 'match-forfeit-1' });
    expect(realtimeMatchState.suppressAutoRejoin).toHaveBeenCalledWith('match-forfeit-1');

    // The forfeiter stays on the game route and is dropped into the
    // finalResults stage (the "match settling" loading screen), where the
    // authoritative match:final_results then renders the real results — rather
    // than being reset and bounced to /play/home where the result only showed
    // up later as a clickable badge.
    expect(gameSessionState.setStage).toHaveBeenCalledWith('finalResults');
    expect(realtimeMatchState.reset).not.toHaveBeenCalled();
    expect(gameSessionState.reset).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalledWith('/');
  });

  it('shows loading instead of possession final results until authoritative final payload arrives', () => {
    gameSessionState.stage = 'finalResults';
    realtimeMatchState.match = {
      ...realtimeMatchState.match,
      variant: 'friendly_possession',
      possessionState: {
        phase: 'COMPLETED',
        goals: { seat1: 1, seat2: 1 },
      },
      finalResults: null,
    } as typeof realtimeMatchState.match & {
      possessionState: { phase: string; goals: { seat1: number; seat2: number } };
      finalResults: null;
    };

    render(<GameStageRouter />);

    expect(screen.getByText('Loading Screen')).toBeInTheDocument();
    expect(screen.queryByText(/Realtime Results/)).not.toBeInTheDocument();
  });

  it('renders possession final results once authoritative final payload exists', () => {
    gameSessionState.stage = 'finalResults';
    realtimeMatchState.match = {
      ...realtimeMatchState.match,
      variant: 'friendly_possession',
      finalResults: {
        matchId: 'match-1',
        winnerId: 'self-1',
        winnerDecisionMethod: 'penalty_goals',
        players: {
          'self-1': { userId: 'self-1', goals: 1, correctAnswers: 12 },
          'opp-1': { userId: 'opp-1', goals: 1, correctAnswers: 10 },
        },
        unlockedAchievements: {},
        rankedOutcome: null,
      },
    } as typeof realtimeMatchState.match & {
      finalResults: {
        matchId: string;
        winnerId: string;
        winnerDecisionMethod: string;
        players: Record<string, { userId: string; goals: number; correctAnswers: number }>;
        unlockedAchievements: Record<string, unknown>;
        rankedOutcome: null;
      };
    };

    render(<GameStageRouter />);

    expect(screen.getByText('Realtime Results self-1')).toBeInTheDocument();
  });

  it('tracks results main-menu exits and marks the /play landing pending', () => {
    gameSessionState.stage = 'finalResults';
    gameSessionState.config = {
      mode: 'ranked',
      matchType: 'ranked',
      categoryName: 'Football',
      categoryIcon: '⚽',
    };
    realtimeMatchState.match = {
      ...realtimeMatchState.match,
      mode: 'ranked',
      variant: 'ranked_sim',
      finalResults: {
        matchId: 'match-results-1',
        resultVersion: 42,
        winnerId: 'self-1',
        winnerDecisionMethod: 'goals',
        players: {
          'self-1': { userId: 'self-1', goals: 2, correctAnswers: 9 },
          'opp-1': { userId: 'opp-1', goals: 1, correctAnswers: 7 },
        },
        unlockedAchievements: {},
        rankedOutcome: null,
      },
    } as unknown as typeof realtimeMatchState.match & {
      mode: 'ranked';
      finalResults: unknown;
    };

    render(<GameStageRouter />);

    fireEvent.click(screen.getByRole('button', { name: 'Main Menu' }));

    const expectedAnalytics = expect.objectContaining({
      source: 'results_main_menu',
      matchId: 'match-results-1',
      matchType: 'ranked',
      mode: 'ranked',
      variant: 'ranked_sim',
      resultVersion: 42,
      hadFinalResults: true,
      finalResultsAckSent: true,
      stage: 'finalResults',
    });
    expect(analyticsMocks.trackResultsMainMenuClicked).toHaveBeenCalledWith(expectedAnalytics);
    expect(analyticsMocks.trackExitToPlayStarted).toHaveBeenCalledWith(expectedAnalytics);
    expect(analyticsMocks.markExitToPlayPending).toHaveBeenCalledWith(expectedAnalytics);
    expect(socket.emit).toHaveBeenCalledWith('match:final_results_ack', {
      matchId: 'match-results-1',
      resultVersion: 42,
    });
    expect(realtimeMatchState.reset).toHaveBeenCalled();
    expect(rankedMatchmakingState.clearRankedMatchmaking).toHaveBeenCalled();
    expect(gameSessionState.reset).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/play');
  });

  it('renders replayed final results when a reload clears the game session', () => {
    gameSessionState.stage = 'idle';
    gameSessionState.config = null as never;
    realtimeMatchState.match = {
      ...realtimeMatchState.match,
      mode: 'ranked',
      variant: 'ranked_sim',
      finalResults: {
        matchId: 'match-1',
        winnerId: 'opp-1',
        winnerDecisionMethod: 'forfeit',
        players: {
          'self-1': { totalPoints: 0, goals: 0, correctAnswers: 0 },
          'opp-1': { totalPoints: 100, goals: 1, correctAnswers: 1 },
        },
        unlockedAchievements: {},
        rankedOutcome: null,
      },
    } as typeof realtimeMatchState.match & {
      mode: 'ranked';
      finalResults: unknown;
    };

    render(<GameStageRouter />);

    expect(screen.getByText('Realtime Results opp-1')).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalledWith('/play');
  });

  it('renders party quiz results for completed party quiz replays', () => {
    gameSessionState.stage = 'idle';
    gameSessionState.config = null as never;
    realtimeMatchState.match = {
      ...realtimeMatchState.match,
      mode: 'friendly',
      variant: 'friendly_party_quiz',
      finalResults: {
        matchId: 'match-party-1',
        variant: 'friendly_party_quiz',
        winnerId: 'opp-1',
        winnerDecisionMethod: 'total_points',
        players: {
          'self-1': { totalPoints: 120, goals: 0, correctAnswers: 4 },
          'opp-1': { totalPoints: 180, goals: 0, correctAnswers: 6 },
        },
        standings: [
          { userId: 'opp-1', rank: 1, totalPoints: 180, correctAnswers: 6, avgTimeMs: null },
          { userId: 'self-1', rank: 2, totalPoints: 120, correctAnswers: 4, avgTimeMs: null },
        ],
        totalQuestions: 10,
        durationMs: 60_000,
        resultVersion: 123,
        unlockedAchievements: {},
        rankedOutcome: null,
      },
    } as typeof realtimeMatchState.match & {
      mode: 'friendly';
      finalResults: unknown;
    };

    render(<GameStageRouter />);

    expect(screen.getByText('Party Quiz Results')).toBeInTheDocument();
    expect(screen.queryByText(/Realtime Results/)).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalledWith('/play');
  });

  it('keeps result dots and opponent RP when client totals are reset', () => {
    gameSessionState.stage = 'finalResults';
    gameSessionState.config = { ...gameSessionState.config, matchType: 'ranked' };
    possessionMatchState.totalQuestions = 0;
    realtimeMatchState.match = {
      ...realtimeMatchState.match,
      variant: 'ranked_sim',
      currentQuestion: null,
      questions: {
        0: {
          payload: {},
          selfIsCorrect: true,
          opponentIsCorrect: false,
        },
      },
      opponent: { id: 'opp-1', username: 'Opponent', avatarUrl: null, rp: 1900 },
      participants: [
        { userId: 'self-1', username: 'Player One', avatarUrl: null, seat: 1, rankPoints: 1000 },
        { userId: 'opp-1', username: 'Opponent', avatarUrl: null, seat: 2, rankPoints: 1900 },
      ],
      finalResults: {
        matchId: 'match-1',
        winnerId: 'opp-1',
        winnerDecisionMethod: 'goals',
        players: {
          'self-1': { totalPoints: 100, goals: 0, correctAnswers: 1 },
          'opp-1': { totalPoints: 200, goals: 1, correctAnswers: 0 },
        },
        unlockedAchievements: {},
        rankedOutcome: {
          isPlacement: false,
          byUserId: {
            'self-1': {
              userId: 'self-1',
              oldRp: 1000,
              newRp: 975,
              deltaRp: -25,
              oldTier: 'Academy',
              newTier: 'Academy',
              placementStatus: 'placed',
              placementPlayed: 3,
              placementRequired: 3,
              isPlacement: false,
            },
          },
        },
      },
    } as unknown as typeof realtimeMatchState.match & {
      currentQuestion: null;
      questions: Record<number, unknown>;
      finalResults: unknown;
    };

    render(<GameStageRouter />);

    const props = realtimeResultsRenderProps.at(-1);
    expect(props?.totalQuestions).toBe(12);
    expect(props?.playerQuestionResults?.[0]).toBe('correct');
    expect(props?.opponentQuestionResults?.[0]).toBe('wrong');
    expect(props?.opponentRankPoints).toBe(1900);
    expect(props?.opponentId).toBe('opp-1');
  });

  it('fills empty final-results dot arrays from captured round results', () => {
    gameSessionState.stage = 'finalResults';
    gameSessionState.config = { ...gameSessionState.config, matchType: 'ranked' };
    realtimeMatchState.match = {
      ...realtimeMatchState.match,
      variant: 'ranked_sim',
      currentQuestion: null,
      questions: {
        0: {
          payload: {},
          selfIsCorrect: false,
          opponentIsCorrect: true,
        },
        1: {
          payload: {},
          selfIsCorrect: true,
          opponentIsCorrect: false,
        },
      },
      finalResults: {
        matchId: 'match-1',
        winnerId: 'opp-1',
        winnerDecisionMethod: 'goals',
        totalQuestions: 12,
        questionResults: {
          'self-1': Array.from({ length: 12 }, () => null),
          'opp-1': Array.from({ length: 12 }, () => null),
        },
        players: {
          'self-1': { totalPoints: 100, goals: 0, correctAnswers: 1 },
          'opp-1': { totalPoints: 200, goals: 1, correctAnswers: 1 },
        },
        unlockedAchievements: {},
      },
    } as unknown as typeof realtimeMatchState.match & {
      currentQuestion: null;
      questions: Record<number, unknown>;
      finalResults: unknown;
    };

    render(<GameStageRouter />);

    const props = realtimeResultsRenderProps.at(-1);
    expect(props?.playerQuestionResults?.slice(0, 2)).toEqual(['wrong', 'correct']);
    expect(props?.opponentQuestionResults?.slice(0, 2)).toEqual(['correct', 'wrong']);
  });
});
