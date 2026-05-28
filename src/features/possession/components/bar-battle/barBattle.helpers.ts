/**
 * Pure visual constants + tiny pure helpers for the BarBattle scenes.
 *
 * No React, no motion. Anything that needs hooks lives in the
 * view-model hook; anything that renders lives in a scene component.
 */

// ─── Visual constants — classic variant ─────────────────────────────────────

export const BAR_W = 14;
export const BAR_H = 62;
export const BAR_GAP = 5;
export const BAR_RX = 7; // Full capsule ends
export const CY = 115;

// ─── Visual constants — avatar-anchored variant ─────────────────────────────

export const BAR_W_ANCHORED = 10;
export const BAR_H_ANCHORED = 90;
export const BAR_GAP_ANCHORED = 4;
export const BAR_RX_ANCHORED = 6;
export const CY_ANCHORED = 115;
export const AVATAR_BAR_OFFSET = 58;

// ─── Color palette ──────────────────────────────────────────────────────────

export const BLUE = '#1CB0F6';
export const RED = '#FF4B4B';
export const BLUE_DARK = '#0E8ACC';
export const RED_DARK = '#CC2E2E';

// ─── Field clamps ───────────────────────────────────────────────────────────

export const FIELD_MIN_X = 24;
export const FIELD_MAX_X = 476;

// ─── Stack-cancel animation timing ──────────────────────────────────────────

export const STACK_CANCEL_STEP_S = 0.14;
export const STACK_CANCEL_FLASH_S = 0.24;

// ─── Pure helpers ───────────────────────────────────────────────────────────

/** Map raw points to a visual bar count, clamped to 1..12. Returns 0 for non-positive. */
export function pointsToBarCount(points: number): number {
  return points > 0 ? Math.min(Math.max(Math.round(points / 10), 1), 12) : 0;
}

/** Clamp an X coordinate so the centred shape of `width` stays inside the field. */
export function clampCenterX(x: number, width: number): number {
  return Math.max(FIELD_MIN_X + width / 2, Math.min(FIELD_MAX_X - width / 2, x));
}
