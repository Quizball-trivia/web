import { trackEvent } from '@/lib/posthog';

// Game Events
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

export function trackAnswerSubmitted(
  questionId: string,
  isCorrect: boolean,
  timeMs: number,
  questionIndex: number
) {
  trackEvent('answer_submitted', {
    question_id: questionId,
    is_correct: isCorrect,
    time_ms: timeMs,
    question_index: questionIndex,
  });
}

// Match Events
export function trackMatchJoined(matchType: 'ranked' | 'friendly', lobbyId?: string) {
  trackEvent('match_joined', {
    match_type: matchType,
    lobby_id: lobbyId,
  });
}

export function trackMatchCompleted(
  matchType: 'ranked' | 'friendly',
  won: boolean,
  score: number,
  opponentScore: number,
  rpChange?: number
) {
  trackEvent('match_completed', {
    match_type: matchType,
    won,
    score,
    opponent_score: opponentScore,
    rp_change: rpChange,
  });
}

// Navigation Events
export function trackModeSelected(mode: string) {
  trackEvent('mode_selected', { mode });
}

export function trackCategorySelected(categoryId: string, categoryName: string) {
  trackEvent('category_selected', {
    category_id: categoryId,
    category_name: categoryName,
  });
}

// Social Events
export function trackLobbyCreated(mode: string) {
  trackEvent('lobby_created', { mode });
}

export function trackLobbyJoined(lobbyId: string, inviteCode?: string) {
  trackEvent('lobby_joined', {
    lobby_id: lobbyId,
    via_invite_code: !!inviteCode,
  });
}

// Store Events
export function trackItemPurchased(itemId: string, itemName: string, cost: number) {
  trackEvent('item_purchased', {
    item_id: itemId,
    item_name: itemName,
    cost,
  });
}

// Engagement Events
export function trackDailyChallengeCompleted(challengeId: string) {
  trackEvent('daily_challenge_completed', {
    challenge_id: challengeId,
  });
}

export function trackAchievementUnlocked(achievementId: string, achievementName: string) {
  trackEvent('achievement_unlocked', {
    achievement_id: achievementId,
    achievement_name: achievementName,
  });
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
