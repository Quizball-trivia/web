import type {
  DraftCategory,
  ErrorPayload,
  LobbyChallengeInvitePayload,
  LobbyState,
  MatchAnswerAckPayload,
  MatchCluesGuessAckPayload,
  MatchCountdownGuessAckPayload,
  MatchFinalResultsPayload,
  MatchForfeitPendingPayload,
  MatchParticipant,
  MatchPartyStatePayload,
  MatchRoundResultPayload,
  MatchStatePayload,
  MatchVariant,
  OpponentInfo,
  ResolvedMatchQuestionPayload,
  SessionStatePayload,
} from '@/lib/realtime/socket.types';

export interface DraftStatus {
  lobbyId: string;
  categories: DraftCategory[];
  bans: Record<string, string>;
  turnUserId: string | null;
  halfOneCategoryId: string | null;
}

export interface MatchQuestionState {
  payload: ResolvedMatchQuestionPayload;
  correctIndex?: number;
  /** Whether the self user answered this question correctly (set by round_result). */
  selfIsCorrect?: boolean;
  /** Whether the opponent answered this question correctly (set by round_result). */
  opponentIsCorrect?: boolean;
}

export interface MatchStatus {
  matchId: string;
  mode: 'friendly' | 'ranked';
  variant: MatchVariant;
  mySeat: number | null;
  opponent: OpponentInfo;
  /** Recipient's last 3 match results (most recent first) — surfaced to the showdown screen's form strip. */
  myRecentForm?: Array<'W' | 'L' | 'D'>;
  participants: MatchParticipant[];
  /** Resolved first-half category (i18n). Available immediately on match:start so the round-1 intro doesn't flash a placeholder. */
  categoryName?: Record<string, string>;
  countdownEndsAt: number | null;
  countdownReason: 'kickoff' | 'resume' | null;
  currentQuestion: ResolvedMatchQuestionPayload | null;
  pendingQuestion: ResolvedMatchQuestionPayload | null;
  questions: Record<number, MatchQuestionState>;
  answerAck: MatchAnswerAckPayload | null;
  countdownGuessAck: MatchCountdownGuessAckPayload | null;
  /** Live opponent countdown found-count, updated by the server when the
   *  opponent lands an answer. Replaces the legacy simulated counter. */
  opponentCountdownFoundCount: number;
  cluesGuessAck: MatchCluesGuessAckPayload | null;
  opponentAnswered: boolean;
  opponentSelectedIndex: number | null;
  myTotalPoints: number;
  oppTotalPoints: number;
  opponentRecentPoints: number;
  lastRoundResult: MatchRoundResultPayload | null;
  finalResults: MatchFinalResultsPayload | null;
  currentQuestionPhase: 'reveal' | 'playing';
  opponentAnsweredCorrectly: boolean | null;
  possessionState: MatchStatePayload | null;
  partyState: MatchPartyStatePayload | null;
  stateVersion: number;
  /** Estimated offset from local Date.now() to server time, derived from realtime payloads. */
  serverTimeOffsetMs?: number | null;
}

export interface RejoinMatchStatus {
  matchId: string;
  mode: 'friendly' | 'ranked';
  variant: MatchVariant;
  opponent: OpponentInfo;
  participants: MatchParticipant[];
  graceMs: number;
  remainingReconnects: number;
  createdAt: number;
}

export interface ForfeitPendingStatus extends MatchForfeitPendingPayload {
  createdAt: number;
}

export interface DevPossessionAnimation {
  id: number;
  result: 'goal' | 'saved' | 'miss';
  attackerSeat: 1 | 2;
}

export type LobbyChallengeInvite = LobbyChallengeInvitePayload;
export type LobbyBannerSuppressionReason = 'challenge';

/**
 * Shape of the Zustand store — both state fields and action methods.
 * Lives here so the per-slice files can type their `StateCreator<RealtimeState, ...>`
 * against the full store. Actions are added/removed here in lockstep with the
 * shell that composes the slices.
 */
export interface RealtimeState {
  lobby: LobbyState | null;
  challengeInvites: LobbyChallengeInvite[];
  pendingLobbyHandoffCode: string | null;
  suppressLobbyBannerUntil: number | null;
  suppressLobbyBannerReason: LobbyBannerSuppressionReason | null;
  draft: DraftStatus | null;
  match: MatchStatus | null;
  onlineUsers: number | null;
  sessionState: SessionStatePayload | null;
  selfUserId: string | null;
  matchPaused: boolean;
  pauseUntil: number | null;
  pausedAt: number | null;
  remainingReconnects: number | null;
  draftPaused: boolean;
  draftPauseUntil: number | null;
  draftDisconnectedUserId: string | null;
  rejoinMatch: RejoinMatchStatus | null;
  forfeitPending: ForfeitPendingStatus | null;
  devPossessionAnimation: DevPossessionAnimation | null;
  error: ErrorPayload | null;
  setSelfUserId: (userId: string | null) => void;
  setLobby: (lobby: LobbyState) => void;
  addChallengeInvite: (invite: LobbyChallengeInvite) => void;
  removeChallengeInvite: (invitationId: string) => void;
  beginLobbyHandoff: (inviteCode: string) => void;
  clearLobbyHandoff: () => void;
  suppressLobbyBanner: (durationMs?: number, reason?: LobbyBannerSuppressionReason) => void;
  clearLobbyBannerSuppression: () => void;
  setDraftStart: (draft: import('@/lib/realtime/socket.types').DraftState) => void;
  setDraftBan: (actorId: string, categoryId: string) => void;
  setDraftComplete: (halfOneCategoryId: string) => void;
  setMatchStart: (payload: import('@/lib/realtime/socket.types').MatchStartPayload) => void;
  setMatchCountdown: (payload: import('@/lib/realtime/socket.types').MatchCountdownPayload) => void;
  setMatchQuestion: (payload: ResolvedMatchQuestionPayload) => void;
  promotePendingQuestion: () => void;
  setMatchState: (payload: MatchStatePayload) => void;
  setPartyState: (payload: MatchPartyStatePayload) => void;
  setAnswerAck: (payload: MatchAnswerAckPayload) => void;
  setCountdownGuessAck: (payload: MatchCountdownGuessAckPayload) => void;
  setOpponentCountdownProgress: (payload: import('@/lib/realtime/socket.types').MatchOpponentCountdownProgressPayload) => void;
  setCluesGuessAck: (payload: MatchCluesGuessAckPayload) => void;
  setOpponentAnswered: (payload?: {
    matchId?: string;
    qIndex?: number;
    opponentTotalPoints?: number;
    pointsEarned?: number;
    isCorrect?: boolean;
    selectedIndex?: number | null;
  }) => void;
  setQuestionPhase: (phase: 'reveal' | 'playing') => void;
  setRoundResult: (payload: MatchRoundResultPayload) => void;
  setFinalResults: (payload: MatchFinalResultsPayload) => void;
  setForfeitPending: (payload: MatchForfeitPendingPayload) => void;
  clearForfeitPending: () => void;
  setMatchPaused: (payload: { graceMs: number; remainingReconnects: number }) => void;
  clearMatchPaused: () => void;
  setDraftPaused: (payload: import('@/lib/realtime/socket.types').DraftOpponentDisconnectedPayload) => void;
  clearDraftPaused: () => void;
  setRejoinAvailable: (payload: import('@/lib/realtime/socket.types').MatchRejoinAvailablePayload) => void;
  clearRejoinAvailable: () => void;
  setOnlineUsers: (data: import('@/lib/realtime/socket.types').PresenceOnlineCountPayload) => void;
  setSessionState: (payload: SessionStatePayload) => void;
  revertDraftBan: (actorId: string) => void;
  triggerDevPossessionAnimation: (payload: { result: 'goal' | 'saved' | 'miss'; attackerSeat: 1 | 2 }) => void;
  clearDevPossessionAnimation: () => void;
  exitCompletedMatchToLobby: () => void;
  setError: (error: ErrorPayload) => void;
  clearError: () => void;
  reset: () => void;
}
