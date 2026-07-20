/**
 * Pure helpers + constants for the AppShell split.
 *
 * No React, no hooks. The view-model hook + scene components consume
 * these without dragging extra deps.
 */

import { CalendarDays, Home, Medal, Gem, UserRound } from 'lucide-react';
import type { MessageKey } from '@/lib/i18n/messages';
import type { RankedGeoHintDebug } from './appShell.types';

export const MOBILE_NAV_ITEMS = [
  { path: '/play', labelKey: 'navigation.home', icon: Home },
  { path: '/leaderboard', labelKey: 'navigation.leaderboard', icon: Medal },
  { path: '/events', labelKey: 'navigation.events', icon: CalendarDays },
  { path: '/social', labelKey: 'navigation.social', icon: UserRound },
  { path: '/store', labelKey: 'navigation.store', icon: Gem },
] as const;

export const HIDE_NAV_PATHS = ['/game', '/onboarding'];
export const HEADER_PATHS = ['/', '/play', '/events', '/leaderboard', '/social', '/profile', '/store', '/career', '/daily'];

export function isRankedGeoHintDebug(value: unknown): value is RankedGeoHintDebug {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RankedGeoHintDebug>;
  const isMaybeString = (input: unknown) => input === undefined || typeof input === 'string';
  const isMaybeNumber = (input: unknown) => input === undefined || typeof input === 'number';
  return (
    isMaybeString(candidate.city) &&
    isMaybeString(candidate.region) &&
    isMaybeString(candidate.country) &&
    isMaybeString(candidate.countryCode) &&
    isMaybeNumber(candidate.latitude) &&
    isMaybeNumber(candidate.longitude) &&
    isMaybeString(candidate.source)
  );
}

export function readRankedGeoHintDebug(): RankedGeoHintDebug | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('ranked_geo_hint_v1');
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isRankedGeoHintDebug(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

type TranslateFn = (key: MessageKey, params?: Record<string, string | number>) => string;

export function formatRejoinCopy(t: TranslateFn, remainingReconnects: number, compact = false): string {
  if (remainingReconnects <= 0) {
    return compact
      ? t('appShell.rejoinNowLastMobile')
      : t('appShell.rejoinNowLastDesktop');
  }

  const label = remainingReconnects === 1
    ? t('appShell.reconnect')
    : t('appShell.reconnects');
  return compact
    ? t('appShell.rejoinShortMany', { count: remainingReconnects, label })
    : t('appShell.rejoinNowToContinue', { count: remainingReconnects, label });
}

export function isPathActive(currentPath: string, path: string, exact?: boolean): boolean {
  if (path === '/') return currentPath === '/';
  const basePath = path.split('?')[0];
  if (exact) return currentPath === basePath;
  return currentPath === basePath || currentPath.startsWith(`${basePath}/`);
}
