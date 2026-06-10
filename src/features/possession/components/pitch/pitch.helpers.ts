/**
 * Pure helpers + constants for PitchVisualization scenes.
 *
 * No React. Anything that reads JSX / hooks lives in the controller
 * hook (`usePitchSceneModel`) or a scene component.
 */

import type { GoalCoordinates } from './pitch.types';

// Same cartoon-style ball asset the LoadingScreen bounces — keeps every
// in-game ball (pitch, shot, goal celebration) visually consistent with
// the brand's loading state.
export const PITCH_BALL_IMAGE_URL = '/assets/brand/goal-ball.webp';

export const RIGHT_GOAL: GoalCoordinates = {
  penSpotX: 360,
  goalLineX: 485,
  goalTarget: { x: 492, y: 107 },
  saveTarget: { x: 483, y: 115 },
  penY: 115,
  netX: 485,
  goalTextX: 490,
  inward: 1,
};

export const LEFT_GOAL: GoalCoordinates = {
  penSpotX: 140,
  goalLineX: 15,
  goalTarget: { x: 8, y: 107 },
  saveTarget: { x: 17, y: 115 },
  penY: 115,
  netX: 6,
  goalTextX: 10,
  inward: -1,
};

export function toShotVariant(value: number | undefined): 0 | 1 | 2 | 3 | 4 {
  const normalized = ((value ?? 0) % 5 + 5) % 5;
  if (normalized === 1 || normalized === 2 || normalized === 3 || normalized === 4) return normalized;
  return 0;
}

export function isMotionPoint(value: unknown): value is { x: number | number[]; y: number | number[] } {
  const maybePoint = value as { x?: unknown; y?: unknown } | null;
  return (
    typeof maybePoint === 'object'
    && maybePoint !== null
    && (typeof maybePoint.x === 'number' || Array.isArray(maybePoint.x))
    && (typeof maybePoint.y === 'number' || Array.isArray(maybePoint.y))
  );
}

export function mapLandscapeMotionToCss(motionValue: Record<string, number[]>, isPortrait: boolean) {
  if (!isPortrait) return motionValue;

  const x = motionValue.y;
  const y = motionValue.x?.map((value) => -value);
  return {
    ...(x ? { x } : {}),
    ...(y ? { y } : {}),
  };
}
