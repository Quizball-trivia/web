import { trackEvent } from '@/lib/posthog';

// ────────────────────────────────────────────────────────────────────────────
// Auth / lifecycle
// ────────────────────────────────────────────────────────────────────────────

export function trackSignupStarted(method: 'google' | 'email' = 'google') {
  trackEvent('signup_started', { method });
}

export function trackSignupCompleted(method: 'google' | 'email' = 'google') {
  trackEvent('signup_completed', { method });
}

export function trackLoginCompleted(method: 'google' | 'email' = 'google') {
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

// ────────────────────────────────────────────────────────────────────────────
// Matchmaking
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Match lifecycle
// ────────────────────────────────────────────────────────────────────────────

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
  });
}

/**
 * Legacy event — kept for backwards compatibility with the existing
 * `match_results_viewed` data in PostHog. New code should also call
 * `trackMatchCompleted` (the lifecycle event) — this one only fires on the
 * results screen impression, which is downstream of match completion.
 */
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

// ────────────────────────────────────────────────────────────────────────────
// Question / answer
// ────────────────────────────────────────────────────────────────────────────

export function trackAnswerSubmitted(
  questionId: string,
  isCorrect: boolean,
  timeMs: number,
  questionIndex: number,
  difficulty?: string,
  categoryName?: string,
  matchId?: string,
) {
  trackEvent('answer_submitted', {
    question_id: questionId,
    is_correct: isCorrect,
    time_ms: timeMs,
    question_index: questionIndex,
    difficulty,
    category_name: categoryName,
    match_id: matchId,
  });
}

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

// ────────────────────────────────────────────────────────────────────────────
// Match-phase progression
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Navigation / mode selection
// ────────────────────────────────────────────────────────────────────────────

export function trackModeSelected(mode: string) {
  trackEvent('mode_selected', { mode });
}

export function trackCategorySelected(categoryId: string, categoryName: string) {
  trackEvent('category_selected', {
    category_id: categoryId,
    category_name: categoryName,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Friend / party / challenge
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Daily challenges
// ────────────────────────────────────────────────────────────────────────────

export function trackDailyChallengeStarted(challengeType: string) {
  trackEvent('daily_challenge_started', { challenge_type: challengeType });
}

export function trackDailyChallengeQuit(challengeType: string, questionsAnswered: number) {
  trackEvent('daily_challenge_quit', {
    challenge_type: challengeType,
    questions_answered: questionsAnswered,
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

// ────────────────────────────────────────────────────────────────────────────
// Store / economy
// ────────────────────────────────────────────────────────────────────────────

export function trackStoreViewed() {
  trackEvent('store_viewed');
}

export function trackPurchaseModalOpened(productSlug: string, mode: 'coins' | 'stripe' | 'equip' | 'none') {
  trackEvent('purchase_modal_opened', {
    product_slug: productSlug,
    mode,
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

// ────────────────────────────────────────────────────────────────────────────
// Profile / settings
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Progression
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Errors / quality
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Backwards-compat aliases — old call sites still use these names
// ────────────────────────────────────────────────────────────────────────────

export function trackGameStart(mode: string, category?: string) {
  trackEvent('game_started', {
    game_mode: mode,
    category,
  });
}

export function trackGameComplete(mode: string, score: number, correctAnswers: number, totalQuestions: number) {
  const safeAccuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  trackEvent('game_completed', {
    game_mode: mode,
    score,
    correct_answers: correctAnswers,
    total_questions: totalQuestions,
    accuracy: safeAccuracy,
  });
}

export function trackMatchJoined(matchType: 'ranked' | 'friendly', lobbyId?: string) {
  trackEvent('match_joined', {
    match_type: matchType,
    lobby_id: lobbyId,
  });
}
