import type {
  LobbyState,
  MatchAnswerAckPayload,
  MatchFinalResultsPayload,
  MatchParticipant,
  MatchPartyStatePayload,
  MatchRoundResultPayload,
  MatchStatePayload,
  MatchVariant,
  OpponentInfo,
  ResolvedMatchQuestionPayload,
  SessionStatePayload,
} from '@/lib/realtime/socket.types';
import type { MatchStatus, RejoinMatchStatus } from './types';

/**
 * Pure helpers extracted from the realtime-match store setters. Each helper
 * encapsulates a single decision or transformation so the setters in the
 * slice files read like a series of well-named steps instead of inline
 * branchy logic. No I/O or analytics here — the slice wrapper owns those.
 */

// ── Draft ───────────────────────────────────────────────────────────────────

/**
 * Compute the next draft actor after `actorId` bans a category.
 * Looks at the current lobby member list and picks the other member.
 * Returns `null` when there's no lobby (matches today's behaviour).
 */
export function computeNextDraftTurn(
  lobbyMembers: LobbyState['members'] | undefined,
  actorId: string,
): string | null {
  if (!lobbyMembers) return null;
  return lobbyMembers.find((m) => m.userId !== actorId)?.userId ?? null;
}

// ── Match state (possession) ────────────────────────────────────────────────

/**
 * Reject out-of-order `match:state` events using the monotonic stateVersion.
 * Versions of 0 (or absent) always pass — they predate version tracking.
 */
export function isStaleStateEvent(
  incomingVersion: number,
  currentVersion: number,
): boolean {
  return incomingVersion > 0 && incomingVersion <= currentVersion;
}

/**
 * On a `match:state` transition, decide whether the active question + answer-
 * acks should be wiped (e.g. moving into halftime or completed). The kickoff
 * of the second half is the special "we crossed a half boundary" case.
 */
export function shouldClearQuestionOnStateChange(
  previousPhase: MatchStatePayload['phase'] | null | undefined,
  incoming: Pick<MatchStatePayload, 'phase' | 'half'>,
  hasLastRoundResult: boolean,
): boolean {
  const isSecondHalfKickoff =
    previousPhase === 'HALFTIME' && incoming.phase === 'NORMAL_PLAY' && incoming.half === 2;
  return (
    isSecondHalfKickoff ||
    (incoming.phase === 'HALFTIME' && !hasLastRoundResult)
  );
}

/**
 * On a `match:state` transition, decide whether the kickoff countdown should
 * be cleared. Stays only at the very start of a fresh half (round 1, no Qs
 * answered, phase = NORMAL_PLAY); otherwise the countdown is stale.
 */
export function shouldClearCountdownOnStateChange(
  incoming: Pick<MatchStatePayload, 'phase' | 'normalQuestionsAnsweredInHalf' | 'phaseRound'>,
): boolean {
  return (
    incoming.phase !== 'NORMAL_PLAY' ||
    incoming.normalQuestionsAnsweredInHalf > 0 ||
    incoming.phaseRound > 1
  );
}

/**
 * A `match:question` payload is authoritative for question timing. The kickoff
 * countdown is only a pre-question overlay, so it must not keep gating q0 once
 * the server sends the first question. Resume countdowns are a separate
 * reconnect handoff and must keep blocking until `match:resume` clears pause.
 */
export function shouldClearCountdownOnNewQuestion(
  qIndex: number,
  countdownReason: MatchStatus['countdownReason'],
): boolean {
  return qIndex > 0 || countdownReason === 'kickoff';
}

// ── Countdown timing ────────────────────────────────────────────────────────

/**
 * Resolve the absolute ms-deadline for a `match:countdown` event. Prefers the
 * server's ISO `startsAt`; falls back to `now + seconds` if the ISO is bad
 * (defensive — should not happen with a well-behaved server).
 */
export function parseCountdownDeadline(
  startsAtIso: string,
  seconds: number,
  now: number,
): number {
  const startsAtMs = new Date(startsAtIso).getTime();
  if (Number.isFinite(startsAtMs)) return startsAtMs;
  return now + Math.max(0, seconds) * 1000;
}

// ── match:question buffering / timing-refresh ───────────────────────────────

/**
 * For the same qIndex as the active question, decide whether the incoming
 * payload is a timing refresh worth applying. We only re-apply when the
 * server moved the deadline (pause/resume) and the new deadline is no
 * earlier than the current one. Non-finite deadlines pass through (treated
 * as "always refresh") since the legacy DEFAULT_COUNTDOWN_MS path produces
 * those.
 */
export function hasTimingRefresh(
  current: ResolvedMatchQuestionPayload | null,
  incoming: ResolvedMatchQuestionPayload,
): boolean {
  if (!current) return false;
  const fieldsChanged =
    current.deadlineAt !== incoming.deadlineAt ||
    current.playableAt !== incoming.playableAt;
  if (!fieldsChanged) return false;
  const currentDeadlineMs = current.deadlineAt ? new Date(current.deadlineAt).getTime() : Number.NaN;
  const incomingDeadlineMs = incoming.deadlineAt ? new Date(incoming.deadlineAt).getTime() : Number.NaN;
  return (
    !Number.isFinite(currentDeadlineMs) ||
    !Number.isFinite(incomingDeadlineMs) ||
    incomingDeadlineMs >= currentDeadlineMs
  );
}

/**
 * Decide whether a new question should buffer as `pendingQuestion` (instead
 * of being promoted to `currentQuestion`). We buffer while the last round
 * result is still on screen, except when the server has already moved on to
 * HALFTIME — in which case an out-of-order arrival would otherwise wedge us.
 */
export function shouldBufferQuestion(
  hasLastRoundResult: boolean,
  possessionPhase: MatchStatePayload['phase'] | null | undefined,
): boolean {
  return hasLastRoundResult && possessionPhase !== 'HALFTIME';
}

// ── Round result / answer ack ───────────────────────────────────────────────

/**
 * From a `match:round_result` payload, pull the self + opponent player rows.
 * Returns null entries when `selfUserId` isn't set yet (early bootstrap).
 */
export function extractPlayerTotals(
  players: MatchRoundResultPayload['players'],
  selfUserId: string | null,
):
  | { myTotals: undefined; opponentTotals: undefined }
  | {
      myTotals: MatchRoundResultPayload['players'][string] | undefined;
      opponentTotals: MatchRoundResultPayload['players'][string] | undefined;
    } {
  if (!selfUserId) return { myTotals: undefined, opponentTotals: undefined };
  const myTotals = players[selfUserId];
  const opponentTotals = Object.entries(players).find(([userId]) => userId !== selfUserId)?.[1];
  return { myTotals, opponentTotals };
}

// ── Party state ─────────────────────────────────────────────────────────────

/**
 * Resolve {self, firstOpponent} player rows from a party state payload. If
 * `selfUserId` is unknown, fall back to `players[0]` as the opponent for
 * display purposes (legacy behaviour).
 */
export function resolvePartyPlayers(
  players: MatchPartyStatePayload['players'],
  selfUserId: string | null,
): {
  myPlayer: MatchPartyStatePayload['players'][number] | undefined;
  firstOpponent: MatchPartyStatePayload['players'][number] | undefined;
} {
  const myPlayer = selfUserId ? players.find((p) => p.userId === selfUserId) : undefined;
  const firstOpponent = selfUserId
    ? players.find((p) => p.userId !== selfUserId)
    : players[0];
  return { myPlayer, firstOpponent };
}

// ── Final results — fallback match construction ─────────────────────────────

/**
 * When a `match:final_results` payload arrives and we have no active `match`
 * (e.g. ranked-rejoin from a cold tab), build a minimal MatchStatus from the
 * payload + any pending `rejoinMatch` hint + the resolved participants list.
 * Lets the UI go straight to the results screen instead of stranding the
 * user on a blank state.
 */
export function constructFallbackMatchFromResults(
  payload: MatchFinalResultsPayload,
  selfUserId: string | null,
  rejoin: RejoinMatchStatus | null,
): MatchStatus {
  const replayVariant: MatchVariant =
    rejoin?.variant ??
    payload.variant ??
    (payload.standings ? 'friendly_party_quiz' : payload.rankedOutcome ? 'ranked_sim' : 'friendly_possession');

  const userIds = Object.keys(payload.players);
  const fallbackParticipants: MatchParticipant[] = userIds.map((userId, index) => ({
    userId,
    username: userId === selfUserId ? 'You' : `Player ${index + 1}`,
    avatarUrl: null,
    avatarCustomization: null,
    seat: index + 1,
  }));
  const participants = rejoin?.participants ?? payload.participants ?? fallbackParticipants;
  const opponentParticipant =
    participants.find((participant) => participant.userId !== selfUserId) ?? participants[0];
  const opponent: OpponentInfo =
    rejoin?.opponent ??
    {
      id: opponentParticipant?.userId ?? 'opponent',
      username: opponentParticipant?.username ?? 'Opponent',
      avatarUrl: opponentParticipant?.avatarUrl ?? null,
      avatarCustomization: opponentParticipant?.avatarCustomization ?? null,
      ...(opponentParticipant?.rankPoints != null ? { rp: opponentParticipant.rankPoints } : {}),
      ...(opponentParticipant?.country ? { country: opponentParticipant.country } : {}),
      ...(opponentParticipant?.countryCode ? { countryCode: opponentParticipant.countryCode } : {}),
    };

  return {
    matchId: payload.matchId,
    mode: rejoin?.mode ?? (payload.rankedOutcome ? 'ranked' : 'friendly'),
    variant: replayVariant,
    mySeat: participants.find((participant) => participant.userId === selfUserId)?.seat ?? null,
    opponent,
    participants,
    countdownEndsAt: null,
    countdownReason: null,
    currentQuestion: null,
    pendingQuestion: null,
    questions: {},
    answerAck: null,
    countdownGuessAck: null,
    opponentCountdownFoundCount: 0,
    cluesGuessAck: null,
    opponentAnswered: false,
    opponentSelectedIndex: null,
    myTotalPoints: selfUserId ? payload.players[selfUserId]?.totalPoints ?? 0 : 0,
    oppTotalPoints: opponentParticipant ? payload.players[opponentParticipant.userId]?.totalPoints ?? 0 : 0,
    opponentRecentPoints: 0,
    lastRoundResult: null,
    finalResults: payload,
    currentQuestionPhase: 'reveal',
    opponentAnsweredCorrectly: null,
    possessionState: null,
    partyState: null,
    stateVersion: 0,
    serverTimeOffsetMs: null,
  };
}

/**
 * When `match:final_results` arrives over an active match with refreshed
 * participants, return the new OpponentInfo. Otherwise pass the existing
 * opponent through unchanged.
 */
export function mergeOpponentFromFinalParticipants(
  payloadParticipants: MatchFinalResultsPayload['participants'],
  resolvedParticipants: MatchParticipant[],
  selfUserId: string | null,
  currentOpponent: OpponentInfo,
): OpponentInfo {
  if (!payloadParticipants) return currentOpponent;
  const opponentParticipant =
    resolvedParticipants.find((p) => p.userId !== selfUserId) ?? resolvedParticipants[0];
  if (!opponentParticipant) return currentOpponent;
  return {
    ...currentOpponent,
    id: opponentParticipant.userId,
    username: opponentParticipant.username,
    avatarUrl: opponentParticipant.avatarUrl,
    avatarCustomization: opponentParticipant.avatarCustomization,
    ...(opponentParticipant.rankPoints != null ? { rp: opponentParticipant.rankPoints } : {}),
    ...(opponentParticipant.country ? { country: opponentParticipant.country } : {}),
    ...(opponentParticipant.countryCode ? { countryCode: opponentParticipant.countryCode } : {}),
  };
}

// ── Session state containment ───────────────────────────────────────────────

/**
 * When a `session:state` payload arrives, decide whether the local lobby
 * snapshot should be cleared because the server no longer considers that
 * lobby part of the user's session.
 */
export function shouldClearLobbyOnSessionChange(
  currentLobbyId: string | null,
  payload: Pick<SessionStatePayload, 'waitingLobbyId' | 'openLobbyIds'>,
): boolean {
  if (currentLobbyId === null) return false;
  const sessionLobbyIds = new Set(
    [payload.waitingLobbyId, ...payload.openLobbyIds].filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    ),
  );
  return !sessionLobbyIds.has(currentLobbyId);
}

// ── Answer ack staleness ────────────────────────────────────────────────────

/**
 * True when an answer-ack event arrives for a qIndex that doesn't match
 * the currently-active question. `undefined` currentQIndex (no active
 * question) treats every ack as valid — matches the legacy behaviour.
 */
export function isStaleAnswerAck(
  payload: Pick<MatchAnswerAckPayload, 'qIndex'>,
  currentQIndex: number | undefined,
): boolean {
  return currentQIndex !== undefined && payload.qIndex !== currentQIndex;
}
