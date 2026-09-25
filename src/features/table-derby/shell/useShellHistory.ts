'use client';

/** Browser-history sync for the single-route shell. Tab changes, daily
 *  games and matches become history entries (URL `?tab=` / `&game=`), so
 *  the back button steps inside the app instead of leaving it.
 *
 *  The current entry is the source of truth: after any navigation the hook
 *  writes only when the entry differs from the screen, so pops never need a
 *  "skip next sync" flag. A popped entry the app can't honour (a match that
 *  has already been left) is rewritten to what the app actually shows. */

import { useEffect, useRef } from 'react';
import type { ShellTab } from './nav';

export const SHELL_TABS_KEYS = ['home', 'leaderboard', 'daily', 'solo', 'profile'] as const;

export interface NavState {
  tab: ShellTab;
  game: string | null; // daily game key, 'match' during a match, else null
}

export function readNavFromUrl(search: string): NavState | null {
  const q = new URLSearchParams(search);
  const t = q.get('tab');
  if (!t || !SHELL_TABS_KEYS.some((k) => k === t)) return null;
  return { tab: t as ShellTab, game: q.get('game') };
}

function urlFor(nav: NavState): string {
  const q = new URLSearchParams();
  q.set('tab', nav.tab);
  if (nav.game) q.set('game', nav.game);
  return `${window.location.pathname}?${q.toString()}`;
}

function sameNav(a: NavState | null | undefined, b: NavState): boolean {
  return !!a && a.tab === b.tab && (a.game ?? null) === (b.game ?? null);
}

function currentEntry(): NavState | undefined {
  return window.history.state?.tdNav as NavState | undefined;
}

function writeEntry(method: 'pushState' | 'replaceState', nav: NavState) {
  window.history[method]({ ...window.history.state, tdNav: nav }, '', urlFor(nav));
}

export function useShellHistory({
  active,
  nav,
  onPop,
}: {
  /** False while the loader or onboarding owns the screen. */
  active: boolean;
  nav: NavState;
  /** Apply a popped entry; return the state actually shown. */
  onPop: (nav: NavState) => NavState;
}) {
  const onPopRef = useRef(onPop);
  const activeRef = useRef(active);
  useEffect(() => {
    onPopRef.current = onPop;
    activeRef.current = active;
  });

  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    const current = currentEntry();
    if (sameNav(current, nav)) return;
    // Opened straight on a game (reload / shared link): put its tab underneath
    // so Back lands on the tab instead of re-opening the same game.
    if (!current && nav.game && nav.game !== 'match') {
      writeEntry('replaceState', { tab: nav.tab, game: null });
      writeEntry('pushState', nav);
      return;
    }
    // A match entry is replaced when the match is left, so it is never revisited.
    const method = current && current.game !== 'match' ? 'pushState' : 'replaceState';
    writeEntry(method, nav);
  }, [active, nav]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: PopStateEvent) => {
      if (!activeRef.current) return;
      const target =
        (e.state?.tdNav as NavState | undefined) ?? readNavFromUrl(window.location.search) ?? { tab: 'home', game: null };
      const shown = onPopRef.current(target);
      if (!sameNav(currentEntry(), shown)) writeEntry('replaceState', shown);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
}
