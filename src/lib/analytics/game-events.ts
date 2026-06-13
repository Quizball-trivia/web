import { trackEvent } from '@/lib/posthog';

type AuthMethod = 'google' | 'facebook' | 'email' | 'phone';

export type ExitToPlaySource =
  | 'results_main_menu'
  | 'party_results_main_menu'
  | 'match_quit'
  | 'matchmaking_exit'
  | 'training_complete'
  | 'generic';

export interface ExitToPlayAnalyticsProps {
  source: ExitToPlaySource;
  matchId?: string | null;
  matchType?: string | null;
  mode?: string | null;
  variant?: string | null;
  resultVersion?: number | null;
  hadFinalResults?: boolean;
  finalResultsAckSent?: boolean;
  stage?: string | null;
}

interface PendingExitToPlayAnalytics extends ExitToPlayAnalyticsProps {
  startedAtMs: number;
  fromPath?: string | null;
}

const EXIT_TO_PLAY_PENDING_KEY = 'quizball.exit_to_play.pending';
const EXIT_TO_PLAY_PENDING_TTL_MS = 10 * 60 * 1000;

function resultsExitProps(props: ExitToPlayAnalyticsProps) {
  return {
    source: props.source,
    match_id: props.matchId ?? null,
    match_type: props.matchType ?? null,
    mode: props.mode ?? null,
    variant: props.variant ?? null,
    result_version: props.resultVersion ?? null,
    had_final_results: Boolean(props.hadFinalResults),
    final_results_ack_sent: Boolean(props.finalResultsAckSent),
    stage: props.stage ?? null,
  };
}

function readPendingExitToPlay(): PendingExitToPlayAnalytics | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(EXIT_TO_PLAY_PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingExitToPlayAnalytics>;
    if (typeof parsed.startedAtMs !== 'number' || !Number.isFinite(parsed.startedAtMs)) {
      window.sessionStorage.removeItem(EXIT_TO_PLAY_PENDING_KEY);
      return null;
    }
    return parsed as PendingExitToPlayAnalytics;
  } catch {
    window.sessionStorage.removeItem(EXIT_TO_PLAY_PENDING_KEY);
    return null;
  }
}

export function trackSignupStarted(method: AuthMethod = 'google') {
  // Fires when a user TAPS an auth button (Google/Facebook/email-signup) — this
  // is auth *intent*, not a real signup, and covers both new signups and
  // returning logins (the server only knows new-vs-returning after auth).
  // `auth_started` is the honest name; `signup_started` is kept for historical
  // dashboards (dual-fire) and should be retired once charts are migrated.
  // Real new-account signal = `onboarding_completed` (only new users see it).
  trackEvent('auth_started', { method });
  trackEvent('signup_started', { method });
}

export function trackSignupCompleted(method: AuthMethod = 'google') {
  trackEvent('signup_completed', { method });
}

export function trackLoginCompleted(method: AuthMethod = 'google') {
  trackEvent('login_completed', { method });
}

export function trackLogout() {
  trackEvent('logout');
}

export function trackOnboardingStarted() {
  trackEvent('onboarding_started');
}

export function trackOnboardingStepCompleted(step: string) {
  trackEvent('onboarding_step_completed', { step });
}

export function trackOnboardingCompleted() {
  trackEvent('onboarding_completed');
}

export function trackInAppBrowserBlocked(browser: string, isIOS: boolean, isAndroid: boolean) {
  trackEvent('in_app_browser_blocked', {
    in_app_browser: browser,
    platform: isIOS ? 'ios' : isAndroid ? 'android' : 'other',
  });
}

export function trackMatchmakingStarted(mode: string, variant?: string) {
  trackEvent('matchmaking_started', { mode, variant });
}

export function trackMatchmakingAiFallback(mode: string, wait_ms: number) {
  trackEvent('matchmaking_ai_fallback', { mode, wait_ms });
}

export function trackMatchmakingHumanFound(mode: string, wait_ms: number) {
  trackEvent('matchmaking_human_found', { mode, wait_ms });
}

export function trackMatchmakingCancelled(mode: string, wait_ms: number) {
  trackEvent('matchmaking_cancelled', { mode, wait_ms });
}

export function trackMatchStarted(props: {
  matchId: string;
  mode: string;
  variant?: string;
  opponentIsAi: boolean;
  opponentRp?: number;
}) {
  trackEvent('match_started', {
    match_id: props.matchId,
    mode: props.mode,
    variant: props.variant,
    opponent_is_ai: props.opponentIsAi,
    opponent_rp: props.opponentRp,
  });
}

export function trackMatchCompleted(props: {
  matchId: string;
  mode: string;
  variant?: string;
  won: boolean;
  score: number;
  opponentScore: number;
  durationSec?: number;
  questionsAnswered?: number;
  correctAnswers?: number;
  rpChange?: number;
  opponentIsAi?: boolean;
  goalsFor?: number;
  goalsAgainst?: number;
  penaltyGoalsFor?: number;
  penaltyGoalsAgainst?: number;
  winnerDecisionMethod?: string | null;
}) {
  const accuracy =
    props.questionsAnswered && props.correctAnswers !== undefined
      ? (props.correctAnswers / Math.max(1, props.questionsAnswered)) * 100
      : undefined;
  trackEvent('match_completed', {
    match_id: props.matchId,
    mode: props.mode,
    variant: props.variant,
    won: props.won,
    score: props.score,
    opponent_score: props.opponentScore,
    duration_sec: props.durationSec,
    questions_answered: props.questionsAnswered,
    correct_answers: props.correctAnswers,
    accuracy,
    rp_change: props.rpChange,
    opponent_is_ai: props.opponentIsAi,
    goals_for: props.goalsFor,
    goals_against: props.goalsAgainst,
    penalty_goals_for: props.penaltyGoalsFor,
    penalty_goals_against: props.penaltyGoalsAgainst,
    winner_decision_method: props.winnerDecisionMethod,
  });
}

export function trackMatchResultsViewed(
  matchType: 'ranked' | 'friendly',
  won: boolean,
  score: number,
  opponentScore: number,
  rpChange?: number,
) {
  trackEvent('match_results_viewed', {
    match_type: matchType,
    won,
    score,
    opponent_score: opponentScore,
    rp_change: rpChange,
  });
}

export function trackResultsMainMenuClicked(props: ExitToPlayAnalyticsProps): void {
  trackEvent('results_main_menu_clicked', resultsExitProps(props));
}

export function trackExitToPlayStarted(props: ExitToPlayAnalyticsProps): void {
  trackEvent('exit_to_play_started', {
    ...resultsExitProps(props),
    started_at_ms: Date.now(),
  });
}

export function markExitToPlayPending(props: ExitToPlayAnalyticsProps): void {
  if (typeof window === 'undefined') return;
  const pending: PendingExitToPlayAnalytics = {
    ...props,
    startedAtMs: Date.now(),
    fromPath: window.location.pathname,
  };
  window.sessionStorage.setItem(EXIT_TO_PLAY_PENDING_KEY, JSON.stringify(pending));
}

export function consumeExitToPlayPending(nowMs = Date.now()): PendingExitToPlayAnalytics | null {
  if (typeof window === 'undefined') return null;
  const pending = readPendingExitToPlay();
  if (!pending) return null;
  window.sessionStorage.removeItem(EXIT_TO_PLAY_PENDING_KEY);
  if (nowMs - pending.startedAtMs > EXIT_TO_PLAY_PENDING_TTL_MS) {
    return null;
  }
  return pending;
}

export function trackExitToPlayLanded(
  props: PendingExitToPlayAnalytics & { landedPath?: string | null; nowMs?: number },
): void {
  const nowMs = props.nowMs ?? Date.now();
  trackEvent('exit_to_play_landed', {
    ...resultsExitProps(props),
    started_at_ms: props.startedAtMs,
    elapsed_ms: Math.max(0, nowMs - props.startedAtMs),
    from_path: props.fromPath ?? null,
    landed_path: props.landedPath ?? null,
  });
}

export function trackMatchForfeit(matchId: string, reason: string, elapsedSec?: number) {
  trackEvent('match_forfeit', {
    match_id: matchId,
    reason,
    elapsed_sec: elapsedSec,
  });
}

export function trackMatchDisconnected(matchId: string, elapsedSec: number, phase?: string) {
  trackEvent('match_disconnected', {
    match_id: matchId,
    elapsed_sec: elapsedSec,
    phase,
  });
}

export function trackMatchReconnected(matchId: string, downtimeSec: number) {
  trackEvent('match_reconnected', {
    match_id: matchId,
    downtime_sec: downtimeSec,
  });
}

// NOTE: `answer_submitted` was removed — it fired ~12× per match and is fully
// redundant with the `match_answers` Postgres table (is_correct, time_ms,
// points_earned, selected_index, etc. per answer). Query that table with SQL.

export function trackQuestionSkipped(props: {
  matchId?: string;
  questionId: string;
  questionIndex: number;
  reason: 'time_out' | 'no_selection';
}) {
  trackEvent('question_skipped', {
    match_id: props.matchId,
    question_id: props.questionId,
    question_index: props.questionIndex,
    reason: props.reason,
  });
}

export function trackLifelineUsed(matchId: string | undefined, type: '5050' | 'clue' | 'skip') {
  trackEvent('lifeline_used', {
    match_id: matchId,
    type,
  });
}

export function trackDraftStarted(matchId: string) {
  trackEvent('draft_started', { match_id: matchId });
}

export function trackDraftCompleted(matchId: string, durationSec: number) {
  trackEvent('draft_completed', { match_id: matchId, duration_sec: durationSec });
}

export function trackPossessionPhaseEntered(matchId: string, phase: 'first_half' | 'second_half' | 'penalty') {
  trackEvent('possession_phase_entered', { match_id: matchId, phase });
}

export function trackPenaltyTaken(matchId: string, scored: boolean, attemptNumber: number) {
  trackEvent('penalty_taken', {
    match_id: matchId,
    scored,
    attempt_number: attemptNumber,
  });
}

export function trackModeSelected(mode: string) {
  trackEvent('mode_selected', { mode });
}

export function trackCategorySelected(categoryId: string, categoryName: string) {
  trackEvent('category_selected', {
    category_id: categoryId,
    category_name: categoryName,
  });
}

export function trackLobbyCreated(mode: string) {
  trackEvent('lobby_created', { mode });
}

export function trackLobbyJoined(lobbyId: string, inviteCode?: string) {
  trackEvent('lobby_joined', {
    lobby_id: lobbyId,
    via_invite_code: !!inviteCode,
  });
}

export function trackFriendInviteSent(method: 'link_copy' | 'social_share', lobbyId?: string) {
  trackEvent('friend_lobby_invite_sent', { method, lobby_id: lobbyId });
}

export function trackFriendInviteAccepted(lobbyId: string) {
  trackEvent('friend_lobby_invite_accepted', { lobby_id: lobbyId });
}

export function trackPartyQuizStarted(playerCount: number) {
  trackEvent('party_quiz_started', { player_count: playerCount });
}

export function trackPartyQuizCompleted(props: {
  playerCount: number;
  finishPosition: number;
  totalQuestions: number;
  correctAnswers: number;
}) {
  trackEvent('party_quiz_completed', {
    player_count: props.playerCount,
    finish_position: props.finishPosition,
    total_questions: props.totalQuestions,
    correct_answers: props.correctAnswers,
  });
}

export function trackChallengeInviteSent(targetUserId: string) {
  trackEvent('challenge_invite_sent', { target_user_id: targetUserId });
}

export function trackChallengeInviteAccepted(invitationId: string) {
  trackEvent('challenge_invite_accepted', { invitation_id: invitationId });
}

export function trackChallengeInviteDeclined(invitationId: string) {
  trackEvent('challenge_invite_declined', { invitation_id: invitationId });
}

export function trackDailyChallengeStarted(challengeType: string) {
  trackEvent('daily_challenge_started', { challenge_type: challengeType });
}

export function trackDailyChallengeQuit(props: {
  challengeType: string;
  /** Optional — most games don't expose progress at the route boundary. */
  questionsAnswered?: number;
}) {
  trackEvent('daily_challenge_quit', {
    challenge_type: props.challengeType,
    questions_answered: props.questionsAnswered,
  });
}

export function trackDailyChallengeCompleted(props: {
  challengeType: string;
  score?: number;
  correctAnswers?: number;
  totalQuestions?: number;
  xpAwarded?: number;
  coinsAwarded?: number;
}) {
  trackEvent('daily_challenge_completed', {
    challenge_id: props.challengeType,
    challenge_type: props.challengeType,
    score: props.score,
    correct_answers: props.correctAnswers,
    total_questions: props.totalQuestions,
    xp_awarded: props.xpAwarded,
    coins_awarded: props.coinsAwarded,
  });
}

export function trackStoreViewed() {
  trackEvent('store_viewed');
}

export function trackPurchaseModalOpened(
  productSlug: string,
  mode: 'coins' | 'stripe' | 'equip' | 'none',
  options?: { affordable?: boolean },
) {
  trackEvent('purchase_modal_opened', {
    product_slug: productSlug,
    mode,
    // Distinguishes real purchase intent from "Need more" previews so the
    // open -> confirm/cancel funnel isn't skewed by broke-user window shopping.
    affordable: options?.affordable ?? true,
  });
}

export function trackPurchaseCancelled(productSlug: string) {
  trackEvent('purchase_cancelled', { product_slug: productSlug });
}

export function trackCoinBalanceChanged(props: {
  delta: number;
  source: 'match_win' | 'daily' | 'purchase' | 'objective' | 'admin' | 'signup';
  newBalance: number;
}) {
  trackEvent('coin_balance_changed', {
    delta: props.delta,
    source: props.source,
    new_balance: props.newBalance,
  });
}

export function trackAvatarPartEquipped(slot: string, partId: string) {
  trackEvent('avatar_part_equipped', { slot, part_id: partId });
}

export function trackItemPurchased(itemId: string, itemName: string, cost: number, currency: 'coins' | 'usd' = 'coins') {
  trackEvent('item_purchased', {
    item_id: itemId,
    item_name: itemName,
    cost,
    currency,
  });
}

export function trackNicknameChanged() {
  trackEvent('nickname_changed');
}

export function trackFavoriteClubChanged(clubId: string) {
  trackEvent('favorite_club_changed', { club_id: clubId });
}

export function trackLanguageSwitched(from: string, to: string) {
  trackEvent('language_switched', { from, to });
}

export function trackSettingsOpened() {
  trackEvent('settings_opened');
}

export function trackLevelUp(newLevel: number) {
  trackEvent('level_up', {
    new_level: newLevel,
  });
}

export function trackDivisionPromoted(newDivision: string, newRankPoints: number) {
  trackEvent('division_promoted', {
    new_division: newDivision,
    new_rank_points: newRankPoints,
  });
}

export function trackAchievementUnlocked(achievementId: string, achievementName: string) {
  trackEvent('achievement_unlocked', {
    achievement_id: achievementId,
    achievement_name: achievementName,
  });
}

export function trackSocketConnectionFailed(error: string) {
  trackEvent('socket_connection_failed', { error });
}

export function trackSocketReconnected(downtimeSec: number) {
  trackEvent('socket_reconnected', { downtime_sec: downtimeSec });
}

export function trackApiError(endpoint: string, status: number, code?: string) {
  trackEvent('api_error', { endpoint, status, code });
}

export function trackMatchLoadError(matchId: string | undefined, errorCode: string) {
  trackEvent('match_load_error', { match_id: matchId, error_code: errorCode });
}

// Note: `trackGameStart`, `trackGameComplete`, `trackMatchJoined` previously
// lived here but were never called. They duplicated `trackMatchStarted` /
// `trackMatchCompleted` / lobby-join flow. Removed to keep the event surface
// minimal — if a future use case appears, prefer extending the canonical
// match_started / match_completed events instead of introducing new ones.
