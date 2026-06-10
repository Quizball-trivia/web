import type { AvatarCustomization } from "@/types/game";

export type MatchMode = 'friendly' | 'ranked';
export type LobbyGameMode = 'friendly_possession' | 'friendly_party_quiz' | 'ranked_sim';
export type MatchVariant = LobbyGameMode;
export type LobbyStatus = 'waiting' | 'active' | 'closed';
export type MatchPhase =
  | 'NORMAL_PLAY'
  | 'LAST_ATTACK'
  /** @deprecated Kept for compatibility with historical data only. */
  | 'SHOT_ON_GOAL'
  | 'HALFTIME'
  | 'PENALTY_SHOOTOUT'
  | 'COMPLETED';
export type MatchPhaseKind =
  | 'normal'
  | 'last_attack'
  /** @deprecated Kept for compatibility with historical data only. */
  | 'shot'
  | 'penalty';
export type TacticalCard = 'press-high' | 'play-safe' | 'all-in';

export type { GameStage } from '@/types/game.runtime';

export interface LobbyMember {
  userId: string;
  username: string;
  avatarUrl: string | null;
  avatarCustomization?: AvatarCustomization | null;
  rankPoints?: number;
  isReady: boolean;
  isHost: boolean;
}

export interface MatchParticipant {
  userId: string;
  username: string;
  avatarUrl: string | null;
  avatarCustomization?: AvatarCustomization | null;
  seat: number;
  rankPoints?: number;
  country?: string;
  countryCode?: string;
}

export interface LobbyState {
  lobbyId: string;
  mode: MatchMode;
  status: LobbyStatus;
  inviteCode: string | null;
  displayName: string;
  isPublic: boolean;
  hostUserId: string;
  settings: LobbySettings;
  members: LobbyMember[];
}

export interface LobbySettings {
  gameMode: LobbyGameMode;
  friendlyRandom: boolean;
  friendlyCategoryAId: string | null;
  friendlyCategoryBId: string | null;
}

export interface DraftCategory {
  id: string;
  name: string;
  icon: string | null;
  imageUrl?: string | null;
}

export interface DraftState {
  lobbyId: string;
  categories: DraftCategory[];
  turnUserId: string;
}

export interface DraftOpponentDisconnectedPayload {
  lobbyId: string;
  opponentId: string;
  graceMs: number;
}

export interface DraftResumePayload {
  lobbyId: string;
}

export interface OpponentInfo {
  id: string;
  username: string;
  avatarUrl: string | null;
  avatarCustomization?: AvatarCustomization | null;
  rp?: number;
  country?: string;
  countryCode?: string;
  city?: string;
  flag?: string;
  /** Opponent's favorite club (display name). Used by the showdown screen to render the club logo + primary-color chip. */
  favoriteClub?: string | null;
  /** Last few completed-match results (most recent first), e.g. ['W','L','W']. Used by the showdown form-strip. */
  recentForm?: Array<'W' | 'L' | 'D'>;
  lat?: number | string;
  lon?: number | string;
  lng?: number | string;
  long?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  x?: number | string;
  y?: number | string;
  location?: OpponentGeoPayload | string;
  geo?: OpponentGeoPayload | string;
}

export interface OpponentGeoPayload {
  country?: string;
  countryCode?: string;
  country_code?: string;
  countryName?: string;
  country_name?: string;
  city?: string;
  cityName?: string;
  region?: string;
  regionName?: string;
  flag?: string;
  lat?: number | string;
  lon?: number | string;
  lng?: number | string;
  long?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  x?: number | string;
  y?: number | string;
}

/** Wire format — i18n objects sent from backend. Resolved to strings in socket-handlers. */
export type MatchQuestionKind =
  | 'multipleChoice'
  | 'countdown'
  | 'putInOrder'
  | 'clues';

/** Image attached to an image-MCQ. Mirrors backend `QuestionImageDTO`.
 *  width/height let the client reserve space and avoid layout shift. */
export interface QuestionImageDTO {
  url: string;
  width: number;
  height: number;
  aspectRatio?: string;
}

export interface MultipleChoiceQuestionDTO {
  kind: 'multipleChoice';
  id: string;
  prompt: Record<string, string>;
  options: Array<Record<string, string>>;
  image?: QuestionImageDTO;
  categoryId?: string;
  categoryName?: Record<string, string>;
  difficulty?: string;
  explanation?: string | null;
}

export interface CountdownQuestionDTO {
  kind: 'countdown';
  id: string;
  prompt: Record<string, string>;
  answerSlotCount: number;
  categoryId?: string;
  categoryName?: Record<string, string>;
  difficulty?: string;
}

export interface PutInOrderQuestionItemDTO {
  id: string;
  label: Record<string, string>;
  details?: Record<string, string> | null;
  emoji?: string | null;
}

export interface PutInOrderQuestionDTO {
  kind: 'putInOrder';
  id: string;
  prompt: Record<string, string>;
  instruction: Record<string, string>;
  direction: 'asc' | 'desc';
  items: PutInOrderQuestionItemDTO[];
  categoryId?: string;
  categoryName?: Record<string, string>;
  difficulty?: string;
}

export interface ClueItemDTO {
  type: 'text' | 'emoji';
  content: Record<string, string>;
}

export interface CluesQuestionDTO {
  kind: 'clues';
  id: string;
  prompt: Record<string, string>;
  clues: ClueItemDTO[];
  categoryId?: string;
  categoryName?: Record<string, string>;
  difficulty?: string;
}

export type GameQuestionDTO =
  | MultipleChoiceQuestionDTO
  | CountdownQuestionDTO
  | PutInOrderQuestionDTO
  | CluesQuestionDTO;

/** Locale-resolved question stored in the Zustand store and consumed by components. */
export interface ResolvedMultipleChoiceQuestion {
  kind: 'multipleChoice';
  id: string;
  resolvedLocale?: string;
  prompt: string;
  options: string[];
  image?: QuestionImageDTO;
  categoryId?: string;
  categoryName?: string;
  difficulty?: string;
  explanation?: string | null;
}

export interface ResolvedCountdownQuestion {
  kind: 'countdown';
  id: string;
  resolvedLocale?: string;
  prompt: string;
  answerSlotCount: number;
  categoryId?: string;
  categoryName?: string;
  difficulty?: string;
}

export interface ResolvedPutInOrderQuestionItem {
  id: string;
  label: string;
  details?: string | null;
  emoji?: string | null;
}

export interface ResolvedPutInOrderQuestion {
  kind: 'putInOrder';
  id: string;
  resolvedLocale?: string;
  prompt: string;
  instruction: string;
  direction: 'asc' | 'desc';
  items: ResolvedPutInOrderQuestionItem[];
  categoryId?: string;
  categoryName?: string;
  difficulty?: string;
}

export interface ResolvedClueItem {
  type: 'text' | 'emoji';
  content: string;
}

export interface ResolvedCluesQuestion {
  kind: 'clues';
  id: string;
  resolvedLocale?: string;
  prompt: string;
  clues: ResolvedClueItem[];
  categoryId?: string;
  categoryName?: string;
  difficulty?: string;
}

export type ResolvedGameQuestion =
  | ResolvedMultipleChoiceQuestion
  | ResolvedCountdownQuestion
  | ResolvedPutInOrderQuestion
  | ResolvedCluesQuestion;

export interface MatchStartPayload {
  matchId: string;
  mode: MatchMode;
  variant: MatchVariant;
  mySeat?: number;
  opponent: OpponentInfo;
  /** Recipient's own last 3 match results (most recent first). Used by the showdown form-strip. */
  myRecentForm?: Array<'W' | 'L' | 'D'>;
  participants: MatchParticipant[];
  /** Resolved first-half category name (i18n). Lets the client skip the placeholder/flicker on the round-1 intro. */
  categoryName?: Record<string, string>;
}

export interface MatchCountdownPayload {
  matchId: string;
  seconds: number;
  startsAt: string;
  serverNow?: string;
  /** Client-computed offset from local Date.now() to server time. Not sent over the socket. */
  serverTimeOffsetMs?: number;
  reason?: 'kickoff' | 'resume';
}

export interface MatchQuestionPayload {
  matchId: string;
  qIndex: number;
  total: number;
  question: GameQuestionDTO;
  playableAt?: string;
  deadlineAt: string;
  serverNow?: string;
  /** MCQ correct index sent ahead so the client can show instant tap feedback. Server validates independently. */
  correctIndex?: number;
  phaseKind?: MatchPhaseKind;
  phaseRound?: number | null;
  shooterSeat?: 1 | 2 | null;
  attackerSeat?: 1 | 2 | null;
}

export interface MatchPlayAgainPayload {
  matchId: string;
}

/** Locale-resolved version of MatchQuestionPayload for use in the store & components. */
export type ResolvedMatchQuestionPayload = Omit<MatchQuestionPayload, 'question'> & {
  question: ResolvedGameQuestion;
  /** Client-computed offset from local Date.now() to server time. Not sent over the socket. */
  serverTimeOffsetMs?: number;
};

export interface MatchOpponentAnsweredPayload {
  matchId: string;
  qIndex: number;
  questionKind: MatchQuestionKind;
  opponentTotalPoints: number;
  pointsEarned: number;
  isCorrect: boolean;
  selectedIndex: number | null;
}

export interface MatchAnswerAckPayload {
  matchId: string;
  qIndex: number;
  questionKind: MatchQuestionKind;
  selectedIndex: number | null;
  isCorrect: boolean;
  correctIndex?: number;
  myTotalPoints: number;
  oppAnswered: boolean;
  pointsEarned: number;
  phaseKind?: MatchPhaseKind;
  phaseRound?: number | null;
  shooterSeat?: 1 | 2 | null;
  foundCount?: number;
  clueIndex?: number | null;
  cluesDisplayAnswer?: Record<string, string>;
  submittedOrderIds?: string[];
}

export interface MatchCountdownGuessAckPayload {
  matchId: string;
  qIndex: number;
  accepted: boolean;
  duplicate: boolean;
  foundCount: number;
  acceptedDisplay?: Record<string, string>;
  acceptedDisplays?: Array<Record<string, string>>;
}

export interface MatchOpponentCountdownProgressPayload {
  matchId: string;
  qIndex: number;
  opponentUserId: string;
  foundCount: number;
}

export interface MatchCluesGuessAckPayload {
  matchId: string;
  qIndex: number;
  clueIndex: number;
  revealCount: number;
}

export interface MatchRoundResultPlayer {
  selectedIndex: number | null;
  isCorrect: boolean;
  timeMs: number;
  pointsEarned: number;
  /** Points used for possession movement after applying any current-round 2x boost. */
  possessionPointsEarned?: number;
  totalPoints: number;
  foundCount?: number;
  foundAnswerIds?: string[];
  submittedOrderIds: string[];
  clueIndex?: number | null;
}

export interface MatchRoundResultDeltas {
  possessionDelta: number;
  penaltyOutcome: 'goal' | 'saved' | null;
  goalScoredBySeat: 1 | 2 | null;
  /** Seat holding the 2× speed streak AFTER this round (carries into next). */
  speedStreakHolderSeat?: 1 | 2 | null;
  /** Seat that had the 2× boost APPLIED this round (for a "boost fired" flourish). */
  speedStreakBoostedSeat?: 1 | 2 | null;
}

export interface MultipleChoiceRoundReveal {
  kind: 'multipleChoice';
  correctIndex: number;
}

export interface CountdownRoundReveal {
  kind: 'countdown';
  answerGroups: Array<{
    id: string;
    display: Record<string, string>;
  }>;
}

export interface PutInOrderRoundReveal {
  kind: 'putInOrder';
  correctOrder: Array<{
    id: string;
    label: Record<string, string>;
    details?: Record<string, string> | null;
    emoji?: string | null;
    sortValue: number;
  }>;
}

export interface CluesRoundReveal {
  kind: 'clues';
  displayAnswer: Record<string, string>;
}

export type MatchRoundReveal =
  | MultipleChoiceRoundReveal
  | CountdownRoundReveal
  | PutInOrderRoundReveal
  | CluesRoundReveal;

export interface MatchRoundResultPayload {
  matchId: string;
  qIndex: number;
  questionKind: MatchQuestionKind;
  reveal: MatchRoundReveal;
  players: Record<string, MatchRoundResultPlayer>;
  rankingOrder?: string[];
  phaseKind?: MatchPhaseKind;
  phaseRound?: number | null;
  shooterSeat?: 1 | 2 | null;
  attackerSeat?: 1 | 2 | null;
  deltas?: MatchRoundResultDeltas;
}

export interface MatchFinalResultPlayer {
  totalPoints: number;
  correctAnswers: number;
  avgTimeMs: number | null;
  goals?: number;
  penaltyGoals?: number;
}

export interface MatchStandingPayload {
  userId: string;
  rank: number;
  totalPoints: number;
  correctAnswers: number;
  avgTimeMs: number | null;
}

/**
 * Sent to the client when an achievement unlocks during a match.
 * `title` and `description` are I18nField objects (`{ en, ka, ... }`)
 * — resolve via the current locale before rendering.
 */
export interface AchievementUnlockPayload {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
  unlockedAt: string | null;
}

export interface RankedUserOutcomePayload {
  userId: string;
  oldRp: number;
  newRp: number;
  deltaRp: number;
  /** Coin participation reward granted with the ranked settlement (win/loss). */
  coinsAwarded?: number;
  oldTier: string;
  newTier: string;
  placementStatus: 'unplaced' | 'in_progress' | 'placed';
  placementPlayed: number;
  placementRequired: number;
  isPlacement: boolean;
}

export interface RankedMatchOutcomePayload {
  isPlacement: boolean;
  byUserId: Record<string, RankedUserOutcomePayload>;
}

export interface MatchFinalResultsPayload {
  matchId: string;
  variant?: 'friendly_possession' | 'friendly_party_quiz' | 'ranked_sim';
  winnerId: string | null;
  players: Record<string, MatchFinalResultPlayer>;
  participants?: MatchParticipant[];
  standings?: MatchStandingPayload[];
  totalQuestions?: number;
  questionResults?: Record<string, Array<'correct' | 'wrong' | null>>;
  unlockedAchievements?: Record<string, AchievementUnlockPayload[]>;
  durationMs: number;
  resultVersion: number;
  winnerDecisionMethod?: 'goals' | 'penalty_goals' | 'total_points' | 'total_points_fallback' | 'forfeit' | null;
  totalPointsFallbackUsed?: boolean;
  rankedOutcome?: RankedMatchOutcomePayload | null;
}

export interface MatchForfeitPendingPayload {
  matchId: string;
  reason: 'self_forfeit' | 'reconnect_limit' | 'opponent_forfeit' | 'opponent_reconnect_limit';
  message: string;
}

export interface MatchStatePayload {
  matchId: string;
  phase: MatchPhase;
  half: 1 | 2;
  possessionDiff: number;
  /** Live 2× speed-streak holder (drives the sticky HUD badge). null = none. */
  speedStreakHolderSeat?: 1 | 2 | null;
  normalQuestionsAnsweredInHalf: number;
  attackerSeat: 1 | 2 | null;
  kickOffSeat: 1 | 2;
  goals: {
    seat1: number;
    seat2: number;
  };
  penaltyGoals: {
    seat1: number;
    seat2: number;
  };
  penaltyAttempts?: {
    seat1: Array<'goal' | 'miss'>;
    seat2: Array<'goal' | 'miss'>;
  };
  phaseKind: MatchPhaseKind;
  phaseRound: number;
  shooterSeat: 1 | 2 | null;
  halftime: {
    deadlineAt: string | null;
    uiReadyAt?: string | null;
    categoryOptions: DraftCategory[];
    firstBanSeat: 1 | 2 | null;
    bans: {
      seat1: string | null;
      seat2: string | null;
    };
    /** Whether this ban interlude is the second-half pick or the pre-penalty pick. */
    purpose?: 'second_half' | 'penalty';
  };
  penaltySuddenDeath?: boolean;
  stateVersion?: number;
  /**
   * Raw image URLs the server wants preloaded for upcoming questions in the
   * current half (e.g. the reserved image-MCQ picture, sent from the half's
   * first question). Optimize client-side before warming — preload the SAME
   * transformed URL the question card will render.
   */
  preloadImageUrls?: string[];
}

export interface MatchPartyPlayerState {
  userId: string;
  totalPoints: number;
  correctAnswers: number;
  answered: boolean;
  rank: number;
  avgTimeMs: number | null;
  status?: 'active' | 'dropped';
}

export interface MatchPartyStatePayload {
  matchId: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  leaderUserId: string | null;
  rankingOrder: string[];
  players: MatchPartyPlayerState[];
  stateVersion: number;
}

export interface MatchOpponentDisconnectedPayload {
  matchId: string;
  opponentId: string;
  graceMs: number;
  remainingReconnects: number;
}

export interface MatchResumePayload {
  matchId: string;
  nextQIndex: number;
}

export interface MatchRejoinAvailablePayload {
  matchId: string;
  mode: MatchMode;
  variant: MatchVariant;
  opponent: OpponentInfo;
  participants: MatchParticipant[];
  graceMs: number;
  remainingReconnects: number;
}

export interface MatchPartyDropoutPayload {
  matchId: string;
  reason: 'disconnect_timeout' | 'self_forfeit';
  message: string;
}

export interface RankedSearchStartedPayload {
  durationMs: number;
}

export interface RankedMatchFoundPayload {
  lobbyId: string;
  opponent: OpponentInfo;
  /** Recipient's own last 3 match results (most recent first). */
  myRecentForm?: Array<'W' | 'L' | 'D'>;
}

export interface RankedQueueJoinPayload {
  searchMode?: 'human_first';
  geoHint?: {
    ip?: string;
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    countryCode?: string;
    timezone?: string;
    locale?: string;
    source?: 'ip_lookup' | 'browser_geolocation' | 'client_locale' | 'unknown';
  };
}

export interface WarmupTapPayload {
  tapX: number;
  tapY: number;
  tapSeq: number;
}

export interface WarmupDroppedPayload {
  clientTs: number;
  y: number;
}

export interface WarmupStatePayload {
  active: boolean;
  bounceCount: number;
  nextTurnUserId: string;
  lastTapperId: string | null;
  startedAt: number;
}

export interface WarmupTappedPayload {
  tapperId: string;
  tapX: number;
  tapY: number;
  bounceCount: number;
  nextTurnUserId: string;
}

export interface WarmupOverPayload {
  finalScore: number;
  playerBests: Record<string, number>;
  pairBest: number;
  isNewPlayerBest: Record<string, boolean>;
  isNewPairBest: boolean;
}

export interface WarmupRestartedPayload {
  firstTurnUserId: string;
}

export interface WarmupScoresPayload {
  playerBest: number;
  pairBest: number;
}

export interface PresenceOnlineCountPayload {
  onlineUsers: number;
}

export type SessionStateKind =
  | "IDLE"
  | "IN_QUEUE"
  | "IN_WAITING_LOBBY"
  | "IN_ACTIVE_MATCH"
  | "CORRUPT_MULTI_STATE";

export interface SessionStatePayload {
  state: SessionStateKind;
  activeMatchId: string | null;
  waitingLobbyId: string | null;
  queueSearchId: string | null;
  openLobbyIds: string[];
  resolvedAt: string;
}

export interface SessionBlockedPayload {
  reason:
    | "ACTIVE_MATCH"
    | "TRANSITION_IN_PROGRESS"
    | "INVALID_INVITE"
    | "LOBBY_NOT_FOUND"
    | "QUEUE_UNAVAILABLE";
  message: string;
  operation?: string;
  stateSnapshot: SessionStatePayload;
}

export type LobbyCreateResult =
  | {
      ok: true;
      lobbyId: string | null;
      inviteCode: string | null;
      correlationId: string;
    }
  | {
      ok: false;
      code: "ALREADY_IN_LOBBY" | "TRANSITION_IN_PROGRESS" | "INVALID_LOBBY_CREATE" | "LOBBY_CREATE_ERROR";
      message: string;
      retryable: boolean;
      correlationId: string;
      stateSnapshot?: SessionStatePayload;
    };

export type LobbyJoinByCodeResult =
  | {
      ok: true;
      lobbyId: string;
      inviteCode: string;
      alreadyMember: boolean;
      correlationId: string;
    }
  | {
      ok: false;
      code:
        | "ALREADY_IN_LOBBY"
        | "LOBBY_NOT_FOUND"
        | "LOBBY_FULL"
        | "TRANSITION_IN_PROGRESS"
        | "INVALID_INVITE"
        | "LOBBY_JOIN_ERROR";
      message: string;
      retryable: boolean;
      correlationId: string;
      stateSnapshot?: SessionStatePayload;
    };

export type LobbyLeaveResult =
  | {
      ok: true;
      lobbyId: string | null;
      closed: boolean;
      correlationId: string;
    }
  | {
      ok: false;
      code: "LOBBY_BUSY" | "LOBBY_ACTIVE" | "TRANSITION_IN_PROGRESS" | "LOBBY_LEAVE_ERROR";
      message: string;
      retryable: boolean;
      correlationId: string;
      stateSnapshot?: SessionStatePayload;
    };

export interface ErrorPayload {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface LobbyChallengeUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  avatarCustomization?: AvatarCustomization | null;
}

export interface LobbyChallengeInvitePayload {
  invitationId: string;
  lobbyId: string;
  inviteCode: string;
  fromUser: LobbyChallengeUser;
  expiresAt: string;
}

export interface LobbyChallengeCreatedPayload {
  invitationId: string;
  lobbyId: string;
  inviteCode: string;
  toUserId: string;
}

export interface LobbyChallengeStatusPayload {
  invitationId: string;
  status: "accepted" | "declined" | "canceled" | "expired";
  toUserId: string;
  lobbyId?: string;
  inviteCode?: string;
}

export interface MatchCluesAnswerGuessPayload {
  kind: 'guess';
  matchId: string;
  qIndex: number;
  guess: string;
  timeMs: number;
}

export interface MatchCluesAnswerGiveUpPayload {
  kind: 'giveUp';
  matchId: string;
  qIndex: number;
  giveUp: true;
  timeMs: number;
}

export type MatchCluesAnswerPayload =
  | MatchCluesAnswerGuessPayload
  | MatchCluesAnswerGiveUpPayload;

export interface ClientToServerEvents {
  'lobby:create': (
    data: { mode: MatchMode; isPublic?: boolean; correlationId?: string },
    ack?: (result: LobbyCreateResult) => void
  ) => void;
  'lobby:challenge': (data: { toUserId: string }) => void;
  'lobby:challenge_accept': (data: { invitationId: string }) => void;
  'lobby:challenge_decline': (data: { invitationId: string }) => void;
  'lobby:join_by_code': (
    data: { inviteCode: string; correlationId?: string },
    ack?: (result: LobbyJoinByCodeResult) => void
  ) => void;
  'lobby:leave': (data?: { correlationId?: string }, ack?: (result: LobbyLeaveResult) => void) => void;
  'lobby:ready': (data: { ready: boolean }) => void;
  'lobby:update_settings': (data: {
    lobbyId?: string;
    gameMode: LobbyGameMode;
    friendlyRandom?: boolean;
    friendlyCategoryAId?: string | null;
    friendlyCategoryBId?: string | null;
    isPublic?: boolean;
  }) => void;
  'lobby:start': (data?: { lobbyId?: string }) => void;
  'ranked:queue_join': (data?: RankedQueueJoinPayload) => void;
  'ranked:queue_leave': () => void;
  'draft:rejoin': (data?: { lobbyId?: string }) => void;
  'draft:ban': (data: { categoryId: string }) => void;
  'match:answer': (data: { matchId: string; qIndex: number; selectedIndex: number | null; timeMs: number }) => void;
  'match:countdown_guess': (data: { matchId: string; qIndex: number; guess: string }) => void;
  'match:put_in_order_answer': (data: { matchId: string; qIndex: number; orderedItemIds: string[]; timeMs: number }) => void;
  'match:clues_answer': (data: MatchCluesAnswerPayload) => void;
  'match:halftime_ban': (data: { matchId: string; categoryId: string }) => void;
  'match:halftime_ui_ready': (data: { matchId: string }) => void;
  'match:leave': (data?: { matchId?: string }) => void;
  'match:rejoin': (data?: { matchId?: string }) => void;
  'match:forfeit': (data?: { matchId?: string }) => void;
  'match:play_again': (data: MatchPlayAgainPayload) => void;
  'match:final_results_ack': (data: { matchId: string; resultVersion: number }) => void;
  'match:ready_for_next_question': (data: { matchId: string; qIndex: number }) => void;
  'warmup:tap': (data: WarmupTapPayload) => void;
  'warmup:dropped': (data: WarmupDroppedPayload) => void;
  'warmup:restart': () => void;
  'warmup:get_scores': () => void;
  'dev:quick_match': (data?: { skipTo?: 'halftime' | 'last_attack' | 'shot' | 'penalties' | 'penalty_ban' | 'second_half' }) => void;
  'dev:skip_to': (data: { matchId: string; target: 'halftime' | 'last_attack' | 'shot' | 'penalties' | 'penalty_ban' | 'second_half' }) => void;
  'dev:pause_match': (data: { matchId: string }) => void;
  'dev:resume_match': (data: { matchId: string }) => void;
}

export interface ForceLogoutPayload {
  reason: 'account_deleted' | 'admin_revoked';
}

export interface ServerToClientEvents {
  'error': (data: ErrorPayload) => void;
  'presence:online_count': (data: PresenceOnlineCountPayload) => void;
  'session:state': (data: SessionStatePayload) => void;
  'session:blocked': (data: SessionBlockedPayload) => void;
  'auth:force_logout': (data: ForceLogoutPayload) => void;
  'lobby:state': (data: LobbyState) => void;
  'lobby:challenge_created': (data: LobbyChallengeCreatedPayload) => void;
  'lobby:challenge_received': (data: LobbyChallengeInvitePayload) => void;
  'lobby:challenge_status': (data: LobbyChallengeStatusPayload) => void;
  'draft:start': (data: DraftState) => void;
  'draft:banned': (data: { actorId: string; categoryId: string }) => void;
  'draft:complete': (data: { halfOneCategoryId: string }) => void;
  'draft:opponent_disconnected': (data: DraftOpponentDisconnectedPayload) => void;
  'draft:resume': (data: DraftResumePayload) => void;
  'match:start': (data: MatchStartPayload) => void;
  'match:countdown': (data: MatchCountdownPayload) => void;
  'match:state': (data: MatchStatePayload) => void;
  'match:party_state': (data: MatchPartyStatePayload) => void;
  'match:question': (data: MatchQuestionPayload) => void;
  'match:opponent_answered': (data: MatchOpponentAnsweredPayload) => void;
  'match:answer_ack': (data: MatchAnswerAckPayload) => void;
  'match:countdown_guess_ack': (data: MatchCountdownGuessAckPayload) => void;
  'match:opponent_countdown_progress': (data: MatchOpponentCountdownProgressPayload) => void;
  'match:clues_guess_ack': (data: MatchCluesGuessAckPayload) => void;
  'match:round_result': (data: MatchRoundResultPayload) => void;
  'match:final_results': (data: MatchFinalResultsPayload) => void;
  'match:forfeit_pending': (data: MatchForfeitPendingPayload) => void;
  'match:opponent_disconnected': (data: MatchOpponentDisconnectedPayload) => void;
  'match:party_dropout': (data: MatchPartyDropoutPayload) => void;
  'match:resume': (data: MatchResumePayload) => void;
  'match:rejoin_available': (data: MatchRejoinAvailablePayload) => void;
  'ranked:search_started': (data: RankedSearchStartedPayload) => void;
  'ranked:match_found': (data: RankedMatchFoundPayload) => void;
  'ranked:queue_left': () => void;
  'warmup:state': (data: WarmupStatePayload) => void;
  'warmup:tapped': (data: WarmupTappedPayload) => void;
  'warmup:over': (data: WarmupOverPayload) => void;
  'warmup:restarted': (data: WarmupRestartedPayload) => void;
  'warmup:scores': (data: WarmupScoresPayload) => void;
}
