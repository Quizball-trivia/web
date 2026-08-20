import { trackEvent } from '@/lib/posthog';

export type FootballGridSurface = 'demo' | 'matchmaking' | 'friend_lobby';
export type FootballGridOpponentType = 'human' | 'bot';
export type FootballGridResult = 'win' | 'loss' | 'draw';

interface FootballGridContext {
  surface: FootballGridSurface;
  gridId: string;
  opponentType: FootballGridOpponentType;
}

export interface FootballGridEngagementSummary extends FootballGridContext {
  elapsedSeconds: number;
  activeSeconds: number;
  matchesStarted: number;
  matchesCompleted: number;
  cellSelections: number;
  answersSubmitted: number;
  correctAnswers: number;
  wrongAnswers: number;
  passes: number;
  timeouts: number;
}

function contextProperties(context: FootballGridContext) {
  return {
    surface: context.surface,
    grid_id: context.gridId,
    opponent_type: context.opponentType,
  };
}

export function trackFootballGridViewed(context: FootballGridContext): void {
  trackEvent('football_grid_viewed', contextProperties(context));
}

export function trackFootballGridPlayStarted(context: FootballGridContext): void {
  trackEvent('football_grid_play_started', contextProperties(context));
}

export function trackFootballGridDemoCompleted(
  context: FootballGridContext & {
    result: FootballGridResult;
    completionReason: 'line' | 'board_full';
    durationSeconds: number;
    turns: number;
    humanClaims: number;
    opponentClaims: number;
  },
): void {
  trackEvent('football_grid_demo_completed', {
    ...contextProperties(context),
    result: context.result,
    completion_reason: context.completionReason,
    duration_seconds: Math.max(0, context.durationSeconds),
    turns: Math.max(0, context.turns),
    human_claims: Math.max(0, context.humanClaims),
    opponent_claims: Math.max(0, context.opponentClaims),
  });
}

export function trackFootballGridEngagementEnded(summary: FootballGridEngagementSummary): void {
  trackEvent('football_grid_engagement_ended', {
    ...contextProperties(summary),
    elapsed_seconds: Math.max(0, summary.elapsedSeconds),
    active_seconds: Math.max(0, summary.activeSeconds),
    matches_started: Math.max(0, summary.matchesStarted),
    matches_completed: Math.max(0, summary.matchesCompleted),
    cell_selections: Math.max(0, summary.cellSelections),
    answers_submitted: Math.max(0, summary.answersSubmitted),
    correct_answers: Math.max(0, summary.correctAnswers),
    wrong_answers: Math.max(0, summary.wrongAnswers),
    passes: Math.max(0, summary.passes),
    timeouts: Math.max(0, summary.timeouts),
    reached_gameplay: summary.matchesStarted > 0,
    completed_any_match: summary.matchesCompleted > 0,
  });
}
