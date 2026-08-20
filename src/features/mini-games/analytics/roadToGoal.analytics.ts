import { trackEvent } from '@/lib/posthog';

export type RoadToGoalAnalyticsMode = 'live' | 'demo';

type RoadToGoalResult = 'cashed' | 'lost' | 'completed';

function capture(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  // Road-to-Goal analytics are a production-only, explicit opt-in. This stays
  // off in staging even if a shared PostHog key is accidentally inherited.
  if (process.env.NEXT_PUBLIC_ROAD_TO_GOAL_ANALYTICS_ENABLED !== 'true') return;
  trackEvent(event, properties);
}

function runInsertId(roundId: string, suffix: string): string {
  return `road-to-goal:${roundId}:${suffix}`;
}

export function trackRoadToGoalCardViewed(input: {
  destination: RoadToGoalAnalyticsMode;
  enabled: boolean;
}): void {
  capture('road_to_goal_card_viewed', {
    game: 'road_to_goal',
    placement: 'mini_games_hub',
    destination: input.destination,
    new_runs_enabled: input.enabled,
  });
}

export function trackRoadToGoalCardClicked(input: {
  destination: RoadToGoalAnalyticsMode;
  enabled: boolean;
}): void {
  capture('road_to_goal_card_clicked', {
    game: 'road_to_goal',
    placement: 'mini_games_hub',
    destination: input.destination,
    new_runs_enabled: input.enabled,
  });
}

export function trackRoadToGoalViewed(input: {
  mode: RoadToGoalAnalyticsMode;
  locale: string;
  newRunsEnabled: boolean;
}): void {
  capture('road_to_goal_viewed', {
    game: 'road_to_goal',
    game_mode: input.mode,
    locale: input.locale,
    new_runs_enabled: input.newRunsEnabled,
  });
}

export function trackRoadToGoalResumeChecked(input: {
  result: 'none' | 'active' | 'terminal' | 'error';
  status?: string | null;
}): void {
  capture('road_to_goal_resume_checked', {
    game: 'road_to_goal',
    game_mode: 'live',
    result: input.result,
    round_status: input.status,
  });
}

export function trackRoadToGoalStartRequested(input: {
  mode: RoadToGoalAnalyticsMode;
  stakeCoins: number;
  autoCashoutZone: number | null;
}): void {
  capture('road_to_goal_start_requested', {
    game: 'road_to_goal',
    game_mode: input.mode,
    stake_coins: input.stakeCoins,
    auto_cashout_zone: input.autoCashoutZone,
  });
}

export function trackRoadToGoalRunStarted(input: {
  mode: RoadToGoalAnalyticsMode;
  roundId: string;
  stakeCoins: number;
  autoCashoutZone: number | null;
  commitmentVersion?: number | null;
  calibrationVersionId?: string | null;
}): void {
  capture('road_to_goal_run_started', {
    $insert_id: runInsertId(input.roundId, 'started'),
    game: 'road_to_goal',
    game_mode: input.mode,
    round_id: input.roundId,
    stake_coins: input.stakeCoins,
    auto_cashout_zone: input.autoCashoutZone,
    total_zones: 11,
    commitment_version: input.commitmentVersion,
    calibration_version_id: input.calibrationVersionId,
  });
}

export function trackRoadToGoalQuestionResolved(input: {
  mode: RoadToGoalAnalyticsMode;
  roundId: string;
  zone: number;
  questionId: string;
  difficulty: string;
  outcome: 'correct' | 'wrong' | 'late';
  survived: boolean;
  answerDurationMs: number;
  stakeCoins: number;
  expectedAccuracyBp?: number;
  targetSurvivalBp?: number;
  correctSurvivalBp?: number;
  wrongSurvivalBp?: number;
  appliedSurvivalBp?: number;
  rollBp?: number;
  terminalStatus?: string | null;
}): void {
  capture('road_to_goal_question_resolved', {
    $insert_id: runInsertId(input.roundId, `zone:${input.zone}:resolved`),
    game: 'road_to_goal',
    game_mode: input.mode,
    round_id: input.roundId,
    zone: input.zone,
    total_zones: 11,
    question_id: input.questionId,
    difficulty: input.difficulty,
    outcome: input.outcome,
    answered_correctly: input.outcome === 'correct',
    timed_out: input.outcome === 'late',
    survived: input.survived,
    answer_duration_ms: Math.max(0, Math.round(input.answerDurationMs)),
    expected_accuracy_bp: input.expectedAccuracyBp,
    target_survival_bp: input.targetSurvivalBp,
    correct_survival_bp: input.correctSurvivalBp,
    wrong_survival_bp: input.wrongSurvivalBp,
    applied_survival_bp: input.appliedSurvivalBp,
    roll_bp: input.rollBp,
    stake_coins: input.stakeCoins,
    terminal_status: input.terminalStatus,
  });
}

export function trackRoadToGoalRunSettled(input: {
  mode: RoadToGoalAnalyticsMode;
  roundId: string;
  result: RoadToGoalResult;
  settlementReason: string;
  stakeCoins: number;
  payoutCoins: number;
  clearedZones: number;
  runDurationMs: number;
}): void {
  const questionsAttempted = input.result === 'lost'
    ? Math.min(11, input.clearedZones + 1)
    : input.clearedZones;
  capture('road_to_goal_run_settled', {
    $insert_id: runInsertId(input.roundId, 'settled'),
    game: 'road_to_goal',
    game_mode: input.mode,
    round_id: input.roundId,
    result: input.result,
    settlement_reason: input.settlementReason,
    stake_coins: input.stakeCoins,
    payout_coins: input.payoutCoins,
    net_coins: input.payoutCoins - input.stakeCoins,
    payout_multiplier: input.stakeCoins > 0 ? input.payoutCoins / input.stakeCoins : 0,
    cleared_zones: input.clearedZones,
    questions_attempted: questionsAttempted,
    total_zones: 11,
    run_duration_ms: Math.max(0, Math.round(input.runDurationMs)),
    completed_all_zones: input.result === 'completed',
    cashed_out: input.result === 'cashed',
    auto_cashout: input.settlementReason.includes('auto_cashout')
      || input.settlementReason.includes('decision_timeout'),
    timed_out: input.settlementReason.includes('timeout'),
  });
}

export function trackRoadToGoalProofVerified(input: {
  roundId: string;
  verified: boolean;
  verifiedZones: number;
}): void {
  capture('road_to_goal_proof_verified', {
    $insert_id: runInsertId(input.roundId, 'proof-verified'),
    game: 'road_to_goal',
    game_mode: 'live',
    round_id: input.roundId,
    verified: input.verified,
    verified_zones: input.verifiedZones,
  });
}

export function trackRoadToGoalError(input: {
  action: 'resume' | 'prepare' | 'start' | 'answer' | 'continue' | 'cashout' | 'proof';
  status?: number | null;
  errorName?: string;
}): void {
  capture('road_to_goal_error', {
    game: 'road_to_goal',
    game_mode: 'live',
    action: input.action,
    http_status: input.status,
    error_name: input.errorName,
  });
}

export function trackRoadToGoalEngagementEnded(input: {
  mode: RoadToGoalAnalyticsMode;
  reason: 'pagehide' | 'unmount';
  durationMs: number;
  activeDurationMs: number;
  runStarted: boolean;
  maxZoneReached: number;
  phase: string;
  roundId?: string | null;
}): void {
  capture('road_to_goal_engagement_ended', {
    game: 'road_to_goal',
    game_mode: input.mode,
    exit_reason: input.reason,
    duration_ms: Math.max(0, Math.round(input.durationMs)),
    active_duration_ms: Math.max(0, Math.round(input.activeDurationMs)),
    run_started: input.runStarted,
    max_zone_reached: input.maxZoneReached,
    exit_phase: input.phase,
    round_id: input.roundId,
  });
}
