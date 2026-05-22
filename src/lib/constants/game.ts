export const QUESTION_COUNT = 10;

/**
 * Total wall-clock duration of the goal-celebration visual sequence,
 * from shot fire to celebration end.
 * Breakdown: 1000ms attack-start delay + 1000ms shot→celebration + 2000ms celebration.
 *
 * Lives here (not in features/possession) so the game stage controller can
 * gate downstream transitions on it without a cross-feature import.
 */
export const GOAL_VISUAL_SEQUENCE_MS = 4000;
