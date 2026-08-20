import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));

vi.mock('@/lib/posthog', () => ({ trackEvent }));

import {
  trackRoadToGoalCardViewed,
  trackRoadToGoalEngagementEnded,
  trackRoadToGoalQuestionResolved,
} from '../roadToGoal.analytics';

describe('Road to Goal browser analytics', () => {
  beforeEach(() => {
    trackEvent.mockReset();
    vi.stubEnv('NEXT_PUBLIC_ROAD_TO_GOAL_ANALYTICS_ENABLED', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('tracks the hub impression needed for view-to-play conversion', () => {
    trackRoadToGoalCardViewed({ destination: 'live', enabled: true });

    expect(trackEvent).toHaveBeenCalledWith('road_to_goal_card_viewed', {
      game: 'road_to_goal',
      placement: 'mini_games_hub',
      destination: 'live',
      new_runs_enabled: true,
    });
  });

  it('tracks a deduplicated demo question outcome without answer text', () => {
    trackRoadToGoalQuestionResolved({
      mode: 'demo',
      roundId: 'demo-round',
      zone: 2,
      questionId: 'question-id',
      difficulty: 'easy',
      outcome: 'wrong',
      survived: false,
      answerDurationMs: 1_234.4,
      stakeCoins: 25,
      terminalStatus: 'lost',
    });

    expect(trackEvent).toHaveBeenCalledWith(
      'road_to_goal_question_resolved',
      expect.objectContaining({
        $insert_id: 'road-to-goal:demo-round:zone:2:resolved',
        question_id: 'question-id',
        answered_correctly: false,
        answer_duration_ms: 1_234,
      }),
    );
  });

  it('tracks wall-clock and visible engagement duration', () => {
    trackRoadToGoalEngagementEnded({
      mode: 'live',
      reason: 'pagehide',
      durationMs: 91_250,
      activeDurationMs: 64_100,
      runStarted: true,
      maxZoneReached: 5,
      phase: 'decision',
      roundId: 'round-id',
    });

    expect(trackEvent).toHaveBeenCalledWith(
      'road_to_goal_engagement_ended',
      expect.objectContaining({
        duration_ms: 91_250,
        active_duration_ms: 64_100,
        max_zone_reached: 5,
      }),
    );
  });

  it('does not send browser events unless production analytics are explicitly enabled', () => {
    vi.stubEnv('NEXT_PUBLIC_ROAD_TO_GOAL_ANALYTICS_ENABLED', 'false');
    trackRoadToGoalCardViewed({ destination: 'demo', enabled: false });

    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('defaults to disabled when the analytics flag is absent', () => {
    vi.stubEnv('NEXT_PUBLIC_ROAD_TO_GOAL_ANALYTICS_ENABLED', '');
    trackRoadToGoalCardViewed({ destination: 'demo', enabled: false });

    expect(trackEvent).not.toHaveBeenCalled();
  });
});
