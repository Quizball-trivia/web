/**
 * Pure helpers for the WelcomeScreen split. No React, no DOM access at
 * import time. Helpers that touch the DOM (getElementCenter) accept the
 * element as a parameter so they stay test-friendly.
 */

import { Star, type LucideIcon } from 'lucide-react';
import {
  CATEGORY_STYLES,
  EXCLUDED_CATEGORY_NAMES,
  EXCLUDED_CATEGORY_PREFIXES,
  EXCLUDED_SLUGS,
  FALLBACK_COLORS,
  LANDING_SCENARIOS,
} from './welcome.content';
import type { LandingScenario } from './welcome.types';

export function normalizeCategoryKey(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-');
}

export function isWelcomeCategoryExcluded(slug: string, name: string) {
  const normalizedSlug = normalizeCategoryKey(slug);
  const normalizedName = normalizeCategoryKey(name);
  const lowerName = name.toLowerCase().trim();

  return (
    EXCLUDED_SLUGS.has(normalizedSlug) ||
    EXCLUDED_SLUGS.has(normalizedName) ||
    EXCLUDED_CATEGORY_PREFIXES.some((prefix) => normalizedSlug.startsWith(prefix)) ||
    EXCLUDED_CATEGORY_NAMES.has(lowerName)
  );
}

export function getCategoryStyle(slug: string, name: string, index: number) {
  // Try exact slug match, then name-based slug, then substring match
  const nameSlug = name.toLowerCase().replace(/\s+/g, '-');
  const style = CATEGORY_STYLES[slug] ?? CATEGORY_STYLES[nameSlug];
  if (style) return style;
  // Substring match on name (e.g. "League 1" matches "ligue-1" style)
  const lowerName = name.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_STYLES)) {
    const keyWords = key.replace(/-/g, ' ');
    if (lowerName.includes(keyWords) || keyWords.includes(lowerName)) return val;
  }
  return { color: FALLBACK_COLORS[index % FALLBACK_COLORS.length], icon: Star as LucideIcon };
}

export function authErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message !== 'Request failed') {
    return error.message;
  }
  return fallback;
}

export function landingPointsToBars(points: number): number {
  if (points <= 0) return 0;
  return Math.min(Math.max(Math.round(points / 10), 1), 12);
}

export function clampLandingPosition(position: number): number {
  return Math.max(22, Math.min(78, position));
}

export function getLandingTargetPosition(startPosition: number, scenario: LandingScenario): number {
  const isLeftWin = scenario.kind === 'left-push' || scenario.kind === 'left-goal';
  const isGoalScenario = scenario.kind === 'left-goal' || scenario.kind === 'right-goal';
  const pointDelta = Math.abs(scenario.playerPoints - scenario.opponentPoints);
  const movement = (isGoalScenario ? 24 : 13) + Math.min(8, pointDelta / 10);
  return clampLandingPosition(startPosition + movement * (isLeftWin ? 1 : -1));
}

export function getLandingScenario(cycle: number): LandingScenario {
  const offset = Math.floor(Math.random() * LANDING_SCENARIOS.length);
  return LANDING_SCENARIOS[(cycle + offset) % LANDING_SCENARIOS.length];
}

export function getLandingAvatarX(playerPosition: number, side: 'player' | 'opponent'): number {
  const possessionTrackLeft = 15;
  const possessionTrackRight = 485;
  const possessionTrackWidth = possessionTrackRight - possessionTrackLeft;
  const avatarSpread = 55;
  const barZonePadding = 74;
  const minBoundary = 24 + avatarSpread + barZonePadding;
  const maxBoundary = 476 - avatarSpread - barZonePadding;
  const rawBoundary = possessionTrackLeft + (playerPosition / 100) * possessionTrackWidth;
  const boundary = Math.max(minBoundary, Math.min(maxBoundary, rawBoundary));
  return side === 'player' ? boundary - avatarSpread : boundary + avatarSpread;
}

export function getElementCenter(element: Element | null): { x: number; y: number } | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export function getDaysUntilWorldCup(): number {
  const WC_START = new Date(2026, 5, 11); // June 11, 2026
  const now = new Date();
  const diff = WC_START.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// Marketing counters that grow ~2,000/day from a fixed baseline. Deterministic
// (date-derived) so every viewer on a given day sees the same number.
const COUNTER_ANCHOR_DATE = Date.UTC(2026, 5, 10); // 2026-06-10
const COUNTER_DAILY_GROWTH = 2000;

function daysSinceAnchor(): number {
  return Math.max(0, Math.floor((Date.now() - COUNTER_ANCHOR_DATE) / (1000 * 60 * 60 * 24)));
}

// Duels played: ~35k baseline, +2k/day.
export function getDuelsCount(): number {
  return 35000 + daysSinceAnchor() * COUNTER_DAILY_GROWTH;
}

// Verified questions: ~50k baseline, +2k/day.
export function getVerifiedQuestionsCount(): number {
  return 50000 + daysSinceAnchor() * COUNTER_DAILY_GROWTH;
}
