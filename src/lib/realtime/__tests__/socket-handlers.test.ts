import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useRankedMatchmakingStore } from '@/stores/rankedMatchmaking.store';
import { useGameSessionStore } from '@/stores/gameSession.store';
import { useFriendDuelHandoffStore } from '@/stores/friendDuelHandoff.store';
import { __setSocketOverride } from '../socket-client';
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket.types';

const getMeMock = vi.fn().mockResolvedValue({ id: 'self-1' });
const authState = {
  user: { id: 'self-1' },
  setAuthenticated: vi.fn(),
};

vi.mock('@/lib/api/endpoints', () => ({
  getMe: (...args: unknown[]) => getMeMock(...args),
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: {
    getState: () => authState,
  },
}));

import { registerSocketHandlers, resetSocketHandlers } from '../socket-handlers';
import { useFriendRoomHandoffStore } from '@/stores/friendRoomHandoff.store';

// ---------------------------------------------------------------------------
// Minimal mock socket that tracks .on() listeners so we can fire them
// ---------------------------------------------------------------------------
type EventMap = ServerToClientEvents;

function createMockSocket() {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  const socket = {
    connected: true,
    id: 'mock-socket-id',
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
      return socket;
    }),
    off: vi.fn((event: string, handler?: (...args: unknown[]) => void) => {
      if (handler) {
        listeners.get(event)?.delete(handler);
      } else {
        listeners.delete(event);
      }
      return socket;
    }),
    emit: vi.fn(),
  } as unknown as Socket<ServerToClientEvents, ClientToServerEvents>;

  function fire<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void;
  function fire(event: string, ...args: unknown[]): void;
  function fire(event: string, ...args: unknown[]) {
    const handlers = listeners.get(event as string);
    if (handlers) {
      for (const handler of handlers) {
        handler(...args);
      }
    }
  }

  return { socket, fire };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('registerSocketHandlers', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    // Reset store to clean state
    useRealtimeMatchStore.getState().reset();
    useRealtimeMatchStore.setState({ selfUserId: null });
    useFriendRoomHandoffStore.getState().reset();
    useGameSessionStore.getState().reset();
    useRankedMatchmakingStore.setState({
      rankedSearchDurationMs: null,
      rankedSearchStartedAt: null,
      rankedFoundOpponent: null,
      rankedFoundMyRecentForm: null,
      rankedSearching: false,
      rankedCancelRequestedAt: null,
      rankedQueueLeftAt: null,
      rankedQueueLeftSeq: 0,
      rankedQueueLeftSource: null,
    });
    getMeMock.mockClear();
    authState.setAuthenticated.mockClear();

    // Reset handler registration so each test gets fresh handlers
    resetSocketHandlers();

    // Create fresh mock socket and install as override
    mockSocket = createMockSocket();
    __setSocketOverride(mockSocket.socket);
  });

  afterEach(() => {
    __setSocketOverride(null);
  });

  // A partner ranked entry rebuilds the socket (token source); leaving and entering again must not leave the new
  // socket without listeners, while the same socket never gets duplicates.
  it('registers once per socket instance: enter → exit → enter gets listeners on the rebuilt socket', () => {
    registerSocketHandlers();
    registerSocketHandlers();
    const first = mockSocket.socket.on as unknown as ReturnType<typeof vi.fn>;
    const firstCount = first.mock.calls.filter(([event]) => event === 'match:question').length;
    expect(firstCount).toBe(1);

    const rebuilt = createMockSocket();
    __setSocketOverride(rebuilt.socket);
    registerSocketHandlers();
    registerSocketHandlers();
    const second = rebuilt.socket.on as unknown as ReturnType<typeof vi.fn>;
    expect(second.mock.calls.filter(([event]) => event === 'match:question')).toHaveLength(1);
    expect(second.mock.calls.filter(([event]) => event === 'ranked:match_found')).toHaveLength(1);
  });

  // Regression: the error handler must read selfUserId fresh via getState(),
  // not from a stale snapshot captured at registration time.
  it('reads fresh selfUserId when reverting draft ban on BAN_FAILED error', () => {
    // 1. Register handlers — at this point selfUserId is null
    registerSocketHandlers();

    // 2. Seed a draft so revertDraftBan has something to operate on
    useRealtimeMatchStore.getState().setDraftStart({
      lobbyId: 'lobby-1',
      categories: [
        { id: 'cat-1', name: { en: 'Science' }, icon: '🔬' },
        { id: 'cat-2', name: { en: 'History' }, icon: '📜' },
      ],
      turnUserId: 'user-123',
    });
    // Simulate the user banning a category
    useRealtimeMatchStore.getState().setDraftBan('user-123', 'cat-1');

    // 3. Set selfUserId AFTER registration (simulates late identification)
    useRealtimeMatchStore.setState({ selfUserId: 'user-123' });

    // 4. Fire a BAN_FAILED error
    mockSocket.fire('error', {
      code: 'BAN_FAILED',
      message: 'Ban failed',
      meta: {},
    });

    // 5. The draft ban for user-123 should have been reverted.
    //    revertDraftBan removes the user's ban and sets turnUserId back to them.
    const draft = useRealtimeMatchStore.getState().draft;
    expect(draft).not.toBeNull();
    expect(draft!.bans).not.toHaveProperty('user-123');
    expect(draft!.turnUserId).toBe('user-123');
  });

  it('does NOT revert draft ban when selfUserId is still null', () => {
    // Register handlers — selfUserId is null
    registerSocketHandlers();

    // Seed a draft with a ban
    useRealtimeMatchStore.getState().setDraftStart({
      lobbyId: 'lobby-1',
      categories: [
        { id: 'cat-1', name: { en: 'Science' }, icon: '🔬' },
        { id: 'cat-2', name: { en: 'History' }, icon: '📜' },
      ],
      turnUserId: 'user-456',
    });
    useRealtimeMatchStore.getState().setDraftBan('user-456', 'cat-1');

    // Do NOT set selfUserId — it remains null

    // Fire BAN_FAILED
    mockSocket.fire('error', {
      code: 'BAN_FAILED',
      message: 'Ban failed',
      meta: {},
    });

    // Ban should NOT have been reverted (no selfUserId to revert for)
    const draft = useRealtimeMatchStore.getState().draft;
    expect(draft).not.toBeNull();
    expect(draft!.bans).toHaveProperty('user-456');
  });

  it('turns MATCH_ABANDONED into a cancelled terminal state and refreshes the refunded wallet', () => {
    const queryClient = {
      invalidateQueries: vi.fn(),
    };
    registerSocketHandlers(queryClient as never);
    useRealtimeMatchStore.getState().setMatchStart({
      matchId: 'match-abandoned',
      mode: 'ranked',
      variant: 'ranked_sim',
      mySeat: 1,
      opponent: { id: 'opp-1', username: 'Opponent', avatarUrl: null },
      participants: [],
    });

    mockSocket.fire('error', {
      code: 'MATCH_ABANDONED',
      message: 'Match abandoned because it could not be resolved from active progress',
    });

    const state = useRealtimeMatchStore.getState();
    expect(state.match).toBeNull();
    expect(state.cancelledMatch).toEqual({
      matchId: 'match-abandoned',
      ticketRefunded: true,
    });
    expect(state.error).toBeNull();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.store.wallet(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.ranked.profile(),
    });
  });

  it('preserves the ranked refund on the rehydrated active-match fallback', () => {
    registerSocketHandlers();
    useGameSessionStore.getState().startSession({
      mode: 'ranked',
      matchType: 'ranked',
      opponentId: 'opp-1',
      opponentUsername: 'Opponent',
    });
    useGameSessionStore.getState().setStage('playing');
    useRealtimeMatchStore.getState().setSessionState({
      state: 'IN_ACTIVE_MATCH',
      waitingLobbyId: null,
      activeMatchId: 'match-rehydrated',
      queueSearchId: null,
      openLobbyIds: [],
      resolvedAt: '2026-07-10T00:00:00.000Z',
    });

    mockSocket.fire('error', {
      code: 'MATCH_ABANDONED',
      message: 'Match abandoned because it could not be resolved from active progress',
    });

    expect(useRealtimeMatchStore.getState().cancelledMatch).toEqual({
      matchId: 'match-rehydrated',
      ticketRefunded: true,
    });
  });

  it('ignores ranked lobby state that arrives after local matchmaking cancel', () => {
    registerSocketHandlers();
    useRankedMatchmakingStore.getState().markRankedCancelRequested();

    mockSocket.fire('lobby:state', {
      lobbyId: 'ranked-late',
      mode: 'ranked',
      status: 'waiting',
      inviteCode: null,
      displayName: 'Ranked',
      isPublic: false,
      hostUserId: 'self-1',
      settings: {
        gameMode: 'ranked_sim',
        duelGame: null,
        friendlyRandom: true,
        friendlyCategoryAId: null,
        friendlyCategoryBId: null,
      },
      members: [
        { userId: 'self-1', username: 'Self', avatarUrl: null, isReady: true, isHost: true },
        { userId: 'opp-1', username: 'Opponent', avatarUrl: null, isReady: true, isHost: false },
      ],
    });

    expect(useRealtimeMatchStore.getState().lobby).toBeNull();
  });

  it('keeps a friend room duel:found for the room screen hand-off', () => {
    useFriendDuelHandoffStore.setState({ found: null });
    registerSocketHandlers();
    mockSocket.fire('duel:found', { matchId: 'duel-1', game: 'pistas', lobbyId: 'lobby-1' });
    expect(useFriendDuelHandoffStore.getState().found).toMatchObject({ matchId: 'duel-1', lobbyId: 'lobby-1', receivedAt: expect.any(Number) });
    useFriendDuelHandoffStore.getState().consume('other');
    expect(useFriendDuelHandoffStore.getState().found?.matchId).toBe('duel-1');
    useFriendDuelHandoffStore.getState().consume('duel-1');
    expect(useFriendDuelHandoffStore.getState().found).toBeNull();
  });

  it('ignores lobby state when the current user is not a lobby member', () => {
    useRealtimeMatchStore.setState({ selfUserId: 'current-user' });
    registerSocketHandlers();

    mockSocket.fire('lobby:state', {
      lobbyId: 'other-user-lobby',
      mode: 'friendly',
      status: 'waiting',
      inviteCode: 'OLD123',
      displayName: 'Other Account Lobby',
      isPublic: true,
      hostUserId: 'old-user',
      settings: {
        gameMode: 'friendly_party_quiz',
        duelGame: null,
        friendlyRandom: true,
        friendlyCategoryAId: null,
        friendlyCategoryBId: null,
      },
      members: [
        { userId: 'old-user', username: 'Old User', avatarUrl: null, isReady: false, isHost: true },
      ],
    });

    expect(useRealtimeMatchStore.getState().lobby).toBeNull();
  });

  it('stores party dropout and clears rejoin/pause state', () => {
    registerSocketHandlers();
    useRealtimeMatchStore.getState().setRejoinAvailable({
      matchId: 'party-1',
      mode: 'friendly',
      variant: 'friendly_party_quiz',
      opponent: { id: 'opp-1', username: 'Opponent', avatarUrl: null },
      participants: [],
      graceMs: 60000,
      remainingReconnects: 2,
    });
    useRealtimeMatchStore.getState().setMatchPaused({ graceMs: 60000, remainingReconnects: 2 });

    mockSocket.fire('match:party_dropout', {
      matchId: 'party-1',
      reason: 'disconnect_timeout',
      message: 'Dropped',
    });

    const state = useRealtimeMatchStore.getState();
    expect(state.partyDropout?.matchId).toBe('party-1');
    expect(state.rejoinMatch).toBeNull();
    expect(state.matchPaused).toBe(false);
  });

  it('auto-emits match:rejoin when rejoin is available on the kickoff ready gate', () => {
    const opponent = { id: 'opp-1', username: 'Opponent', avatarUrl: null };
    const participants = [
      { userId: 'self-1', username: 'Me', avatarUrl: null, seat: 1 },
      { userId: 'opp-1', username: 'Opponent', avatarUrl: null, seat: 2 },
    ];

    registerSocketHandlers();
    useRealtimeMatchStore.getState().setMatchStart({
      matchId: 'match-ready',
      mode: 'ranked',
      variant: 'ranked_sim',
      mySeat: 1,
      opponent,
      participants,
    });
    useRealtimeMatchStore.getState().setMatchWaitingForReady({
      matchId: 'match-ready',
      phase: 'kickoff',
      readyCount: 0,
      totalCount: 2,
      readyUserIds: [],
      waitingUserIds: ['self-1', 'opp-1'],
      forceStartsAt: new Date(Date.now() + 10_000).toISOString(),
    });

    mockSocket.fire('match:rejoin_available', {
      matchId: 'match-ready',
      mode: 'ranked',
      variant: 'ranked_sim',
      opponent,
      participants,
      graceMs: 60_000,
      remainingReconnects: 2,
    });

    expect(mockSocket.socket.emit).toHaveBeenCalledWith('match:rejoin', { matchId: 'match-ready' });
    expect(useRealtimeMatchStore.getState().rejoinMatch).toBeNull();
  });

  it('auto-rejoins every reconnect offer while the same match remains active', () => {
    const opponent = { id: 'opp-1', username: 'Opponent', avatarUrl: null };
    const participants = [
      { userId: 'self-1', username: 'Me', avatarUrl: null, seat: 1 },
      { userId: 'opp-1', username: 'Opponent', avatarUrl: null, seat: 2 },
    ];
    const offer = {
      matchId: 'match-flapping',
      mode: 'ranked' as const,
      variant: 'ranked_sim' as const,
      opponent,
      participants,
      graceMs: 20_000,
      remainingReconnects: 2,
    };

    registerSocketHandlers();
    useRealtimeMatchStore.getState().setMatchStart({
      matchId: offer.matchId,
      mode: offer.mode,
      variant: offer.variant,
      mySeat: 1,
      opponent,
      participants,
    });

    mockSocket.fire('match:rejoin_available', offer);
    mockSocket.fire('match:rejoin_available', { ...offer, remainingReconnects: 1 });

    expect(mockSocket.socket.emit).toHaveBeenCalledTimes(2);
    expect(mockSocket.socket.emit).toHaveBeenNthCalledWith(1, 'match:rejoin', { matchId: offer.matchId });
    expect(mockSocket.socket.emit).toHaveBeenNthCalledWith(2, 'match:rejoin', { matchId: offer.matchId });
    expect(useRealtimeMatchStore.getState().rejoinMatch).toBeNull();
  });

  it('patches ranked profile cache from match:final_results when rankedOutcome exists for self', () => {
    const profileKey = queryKeys.ranked.profile();
    let cachedProfile: Record<string, unknown> = {
      rp: 7,
      tier: 'Academy',
      placementStatus: 'placed',
      placementPlayed: 3,
      placementRequired: 3,
    };
    const queryClient = {
      setQueryData: vi.fn((queryKey: unknown, updater: unknown) => {
        expect(queryKey).toEqual(profileKey);
        expect(typeof updater).toBe('function');
        cachedProfile = (updater as (current: unknown) => unknown)(cachedProfile) as Record<string, unknown>;
      }),
      invalidateQueries: vi.fn(),
    };

    useRealtimeMatchStore.setState({ selfUserId: 'self-1' });
    registerSocketHandlers(queryClient as never);

    mockSocket.fire('match:final_results', {
      matchId: 'match-1',
      winnerId: 'opp-1',
      players: {
        'self-1': { totalPoints: 400, correctAnswers: 2, avgTimeMs: 1200, goals: 0, penaltyGoals: 0 },
        'opp-1': { totalPoints: 700, correctAnswers: 6, avgTimeMs: 1000, goals: 1, penaltyGoals: 0 },
      },
      unlockedAchievements: {},
      durationMs: 60000,
      resultVersion: 123,
      winnerDecisionMethod: 'goals',
      totalPointsFallbackUsed: false,
      rankedOutcome: {
        isPlacement: false,
        byUserId: {
          'self-1': {
            userId: 'self-1',
            oldRp: 7,
            newRp: 0,
            deltaRp: -7,
            oldTier: 'Academy',
            newTier: 'Academy',
            placementStatus: 'placed',
            placementPlayed: 3,
            placementRequired: 3,
            isPlacement: false,
          },
          'opp-1': {
            userId: 'opp-1',
            oldRp: 900,
            newRp: 915,
            deltaRp: 15,
            oldTier: 'Bench',
            newTier: 'Bench',
            placementStatus: 'placed',
            placementPlayed: 3,
            placementRequired: 3,
            isPlacement: false,
          },
        },
      },
    });

    expect(queryClient.setQueryData).toHaveBeenCalledTimes(1);
    expect(cachedProfile).toMatchObject({
      rp: 0,
      tier: 'Academy',
      placementStatus: 'placed',
      placementPlayed: 3,
      placementRequired: 3,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
    expect(mockSocket.socket.emit).toHaveBeenCalledWith('match:final_results_ack', {
      matchId: 'match-1',
      resultVersion: 123,
    });
  });

  it('does not patch ranked profile cache when match:final_results has no rankedOutcome for self', () => {
    const queryClient = {
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    };

    useRealtimeMatchStore.setState({ selfUserId: 'self-1' });
    registerSocketHandlers(queryClient as never);

    mockSocket.fire('match:final_results', {
      matchId: 'match-2',
      winnerId: 'opp-1',
      players: {
        'self-1': { totalPoints: 400, correctAnswers: 2, avgTimeMs: 1200, goals: 0, penaltyGoals: 0 },
        'opp-1': { totalPoints: 700, correctAnswers: 6, avgTimeMs: 1000, goals: 1, penaltyGoals: 0 },
      },
      unlockedAchievements: {},
      durationMs: 60000,
      resultVersion: 456,
      winnerDecisionMethod: 'goals',
      totalPointsFallbackUsed: false,
    });

    expect(queryClient.setQueryData).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
    expect(mockSocket.socket.emit).toHaveBeenCalledWith('match:final_results_ack', {
      matchId: 'match-2',
      resultVersion: 456,
    });
  });

  const roomLobby = (lobbyId: string) => ({
    lobbyId, mode: 'friendly', status: 'active', inviteCode: 'ROOM01', displayName: 'Room', isPublic: false, hostUserId: 'u1',
    settings: { gameMode: 'room_game', duelGame: null, roomGame: 'aproximado', friendlyRandom: true, friendlyCategoryAId: null, friendlyCategoryBId: null },
    members: [{ userId: 'u1', username: 'A', avatarUrl: null, isReady: true, isHost: true }, { userId: 'u2', username: 'B', avatarUrl: null, isReady: true, isHost: false }],
  });
  const ENDED_AT = '2026-10-06T10:00:00.000Z';
  const T = Date.parse(ENDED_AT);

  it('the end of a room match reopens its room on screen once the server confirms no live match (its own update was missed)', () => {
    registerSocketHandlers();
    useRealtimeMatchStore.getState().setLobby(roomLobby('L') as never);
    mockSocket.fire('room:state' as never, { matchId: 'M', lobbyId: 'L', status: 'completed', serverNow: ENDED_AT } as never);
    // Not on a guess: it asks the server where this player stands.
    expect(useRealtimeMatchStore.getState().lobby!.status).toBe('active');
    expect(mockSocket.socket.emit).toHaveBeenCalledWith('room:pointer');
    mockSocket.fire('room:active' as never, null as never, { asOf: T + 50 } as never);
    mockSocket.fire('room:sitting_out' as never, null as never, { asOf: T + 50 } as never);
    const after = useRealtimeMatchStore.getState().lobby!;
    expect(after.status).toBe('waiting');
    expect(after.members.every((m) => !m.isReady)).toBe(true);
    // Another room's match, or a live state, changes nothing.
    useRealtimeMatchStore.getState().setLobby(roomLobby('L') as never);
    mockSocket.fire('room:state' as never, { matchId: 'X', lobbyId: 'OTHER', status: 'completed', serverNow: ENDED_AT } as never);
    mockSocket.fire('room:state' as never, { matchId: 'M', lobbyId: 'L', status: 'active', serverNow: ENDED_AT } as never);
    expect(useRealtimeMatchStore.getState().lobby!.status).toBe('active');
  });

  it('review 2026-10-06 W5: an old match\'s end seen after the newer match\'s room update never reopens the room by itself', () => {
    registerSocketHandlers();
    useRealtimeMatchStore.getState().setLobby(roomLobby('L5') as never); // M2 is running (its room update arrived)
    mockSocket.fire('room:state' as never, { matchId: 'M1', lobbyId: 'L5', status: 'completed', serverNow: ENDED_AT } as never); // M1's end, first seen now
    expect(useRealtimeMatchStore.getState().lobby!.status).toBe('active');
    expect(useRealtimeMatchStore.getState().lobby!.members.every((m) => m.isReady)).toBe(true);
    // The server's answer points at M2: nothing to reopen.
    mockSocket.fire('room:active' as never, { matchId: 'M2', game: 'aproximado', lobbyId: 'L5' } as never, { asOf: T + 50 } as never);
    mockSocket.fire('room:sitting_out' as never, null as never, { asOf: T + 50 } as never);
    expect(useRealtimeMatchStore.getState().lobby!.status).toBe('active');
  });

  it('review 2026-10-06 W5: a "no live match" answer older than the end, or a fresher room update in between, reopens nothing', () => {
    registerSocketHandlers();
    useRealtimeMatchStore.getState().setLobby(roomLobby('L6') as never);
    mockSocket.fire('room:state' as never, { matchId: 'N1', lobbyId: 'L6', status: 'completed', serverNow: ENDED_AT } as never);
    mockSocket.fire('room:active' as never, null as never, { asOf: T - 500 } as never); // read before the end
    mockSocket.fire('room:sitting_out' as never, null as never, { asOf: T - 500 } as never);
    expect(useRealtimeMatchStore.getState().lobby!.status).toBe('active');
    mockSocket.fire('room:state' as never, { matchId: 'N2', lobbyId: 'L6', status: 'completed', serverNow: ENDED_AT } as never);
    mockSocket.fire('lobby:state' as never, { ...roomLobby('L6'), members: roomLobby('L6').members } as never); // the server's own word, after the ask
    mockSocket.fire('room:active' as never, null as never, { asOf: T + 50 } as never);
    mockSocket.fire('room:sitting_out' as never, null as never, { asOf: T + 50 } as never);
    expect(useRealtimeMatchStore.getState().lobby!.status).toBe('active');
  });

  it('review 2026-10-06 W6: a stale "no live seat" answer never cancels a start already heard', () => {
    registerSocketHandlers();
    useFriendRoomHandoffStore.getState().setFound({ matchId: 'S2', game: 'aproximado', lobbyId: 'L7', startedAt: 10_000 } as never);
    const answers = useFriendRoomHandoffStore.getState().answers;
    mockSocket.fire('room:active' as never, null as never, { asOf: 9_500 } as never); // read on another replica before the start
    expect(useFriendRoomHandoffStore.getState().found?.matchId).toBe('S2');
    expect(useFriendRoomHandoffStore.getState().answers).toBe(answers); // not an answer: the screen keeps asking
    mockSocket.fire('room:active' as never, null as never, { asOf: 30_000 } as never); // a real "none", well after the start
    expect(useFriendRoomHandoffStore.getState().found).toBeNull();
    expect(useFriendRoomHandoffStore.getState().answers).toBe(answers + 1);
  });

  it('a replayed end of an earlier match never reopens the room of the newer one', () => {
    registerSocketHandlers();
    const lobby = {
      lobbyId: 'L2', mode: 'friendly', status: 'active', inviteCode: 'ROOM02', displayName: 'Room', isPublic: false, hostUserId: 'u1',
      settings: { gameMode: 'room_game', duelGame: null, roomGame: 'aproximado', friendlyRandom: true, friendlyCategoryAId: null, friendlyCategoryBId: null },
      members: [{ userId: 'u1', username: 'A', avatarUrl: null, isReady: true, isHost: true }],
    };
    mockSocket.fire('room:state' as never, { matchId: 'M1', lobbyId: 'L2', status: 'completed' } as never); // first sight of M1's end
    useRealtimeMatchStore.getState().setLobby(lobby as never); // M2 started
    mockSocket.fire('room:state' as never, { matchId: 'M1', lobbyId: 'L2', status: 'completed' } as never); // a focus resync replays M1
    expect(useRealtimeMatchStore.getState().lobby!.status).toBe('active');
    useFriendRoomHandoffStore.getState().setFound({ matchId: 'M2', game: 'aproximado', lobbyId: 'L2' });
    mockSocket.fire('room:state' as never, { matchId: 'M0', lobbyId: 'L2', status: 'cancelled' } as never); // an end first seen late
    expect(useRealtimeMatchStore.getState().lobby!.status).toBe('active');
  });

  it('review round 4 (#3): a confirmed pointer keeps the start fence, and an answer older than one already taken is ignored', () => {
    registerSocketHandlers();
    useFriendRoomHandoffStore.getState().setFound({ matchId: 'P2', game: 'aproximado', lobbyId: 'L8', startedAt: 10_000 } as never);
    mockSocket.fire('room:active' as never, { matchId: 'P2', game: 'aproximado', lobbyId: 'L8' } as never, { asOf: 12_000 } as never);
    mockSocket.fire('room:active' as never, null as never, { asOf: 11_000 } as never); // an older read, delivered late
    expect(useFriendRoomHandoffStore.getState().found?.matchId).toBe('P2');
  });

  it('review round 4 (#4): an answer older than the end neither confirms nor uses up the pending reopen', () => {
    registerSocketHandlers();
    useRealtimeMatchStore.getState().setLobby(roomLobby('L9') as never);
    mockSocket.fire('room:state' as never, { matchId: 'Q1', lobbyId: 'L9', status: 'completed', serverNow: ENDED_AT } as never);
    mockSocket.fire('room:active' as never, null as never, { asOf: T - 500 } as never);
    mockSocket.fire('room:sitting_out' as never, null as never, { asOf: T - 500 } as never);
    expect(useRealtimeMatchStore.getState().lobby!.status).toBe('active');
    mockSocket.fire('room:active' as never, null as never, { asOf: T + 50 } as never); // the answer to our question
    mockSocket.fire('room:sitting_out' as never, null as never, { asOf: T + 50 } as never);
    expect(useRealtimeMatchStore.getState().lobby!.status).toBe('waiting');
  });

  it('review round 4 (#4): a newer match starting in the room cancels the pending reopen', () => {
    registerSocketHandlers();
    useRealtimeMatchStore.getState().setLobby(roomLobby('L10') as never);
    mockSocket.fire('room:state' as never, { matchId: 'R1', lobbyId: 'L10', status: 'completed', serverNow: ENDED_AT } as never);
    mockSocket.fire('room:found' as never, { matchId: 'R2', game: 'aproximado', lobbyId: 'L10', startedAt: T + 1_000 } as never);
    mockSocket.fire('room:active' as never, null as never, { asOf: T + 500 } as never); // stale: read before R2 started
    mockSocket.fire('room:sitting_out' as never, null as never, { asOf: T + 500 } as never);
    expect(useRealtimeMatchStore.getState().lobby!.status).toBe('active');
    expect(useFriendRoomHandoffStore.getState().found?.matchId).toBe('R2');
  });

  it('review round 5 (#3): a delayed live reply for an older match never replaces a newer start', () => {
    registerSocketHandlers();
    mockSocket.fire('room:active' as never, { matchId: 'OLD', game: 'aproximado', lobbyId: 'L11' } as never, { asOf: 9_000 } as never);
    mockSocket.fire('room:found' as never, { matchId: 'NEW', game: 'aproximado', lobbyId: 'L11', startedAt: 12_000 } as never);
    mockSocket.fire('room:active' as never, { matchId: 'OLD', game: 'aproximado', lobbyId: 'L11' } as never, { asOf: 11_000 } as never);
    expect(useFriendRoomHandoffStore.getState().found?.matchId).toBe('NEW');
  });

  it('review round 5 (#4): the sitting-out half of an ignored (older) reply changes nothing', () => {
    registerSocketHandlers();
    mockSocket.fire('room:active' as never, null as never, { asOf: 20_000 } as never);
    mockSocket.fire('room:sitting_out' as never, { matchId: 'S', lobbyId: 'L12', reason: 'left' } as never, { asOf: 20_000 } as never);
    expect(useFriendRoomHandoffStore.getState().sittingOut).toEqual({ matchId: 'S', lobbyId: 'L12' });
    mockSocket.fire('room:active' as never, null as never, { asOf: 15_000 } as never); // an older read, late
    mockSocket.fire('room:sitting_out' as never, null as never, { asOf: 15_000 } as never);
    expect(useFriendRoomHandoffStore.getState().sittingOut).toEqual({ matchId: 'S', lobbyId: 'L12' });
  });
});

