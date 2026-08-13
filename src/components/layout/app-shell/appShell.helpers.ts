/**
 * Pure helpers + constants for the AppShell split.
 *
 * No React, no hooks. The view-model hook + scene components consume
 * these without dragging extra deps.
 */

import { CalendarDays, Home, Medal, Gem, UserRound } from 'lucide-react';
import type { MessageKey } from '@/lib/i18n/messages';

export const MOBILE_NAV_ITEMS = [
  { path: '/play', labelKey: 'navigation.home', icon: Home },
  { path: '/leaderboard', labelKey: 'navigation.leaderboard', icon: Medal },
  { path: '/events', labelKey: 'navigation.events', icon: CalendarDays },
  { path: '/social', labelKey: 'navigation.social', icon: UserRound },
  { path: '/store', labelKey: 'navigation.store', icon: Gem },
] as const;

export const HIDE_NAV_PATHS = ['/game', '/onboarding'];
export const HEADER_PATHS = ['/', '/play', '/events', '/leaderboard', '/social', '/profile', '/store', '/career', '/daily'];

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
