'use client';

/** Shell navigation: a five-tab bar on phones (Betsson's bottom tab bar
 *  pattern) and a top bar with the same sections on desktop. */

import type { ReactNode } from 'react';
import { CalendarDays, Home, Trophy, User, Zap } from 'lucide-react';
import { TD } from '../lib/copy';
import { NewBadge } from './ui';

export type ShellTab = 'home' | 'ranked' | 'daily' | 'solo' | 'profile';

export const SHELL_TABS: { key: ShellTab; label: string; icon: typeof Home; badge?: string }[] = [
  { key: 'home', label: TD.tabHome, icon: Home },
  { key: 'ranked', label: TD.tabRanked, icon: Trophy },
  { key: 'daily', label: TD.tabDaily, icon: CalendarDays, badge: TD.badgeNew },
  { key: 'solo', label: TD.tabSolo, icon: Zap },
  { key: 'profile', label: TD.tabProfile, icon: User },
];

export function TabBar({ tab, onTab }: { tab: ShellTab; onTab: (t: ShellTab) => void }) {
  return (
    <nav
      aria-label={TD.navLabel}
      className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t px-1 pb-[max(env(safe-area-inset-bottom),10px)] pt-2.5 md:hidden"
      style={{ background: 'var(--bs-page)', borderColor: 'var(--bs-border)' }}
    >
      {SHELL_TABS.map(({ key, label, icon: Icon, badge }) => (
        <button
          key={key}
          type="button"
          onClick={() => onTab(key)}
          aria-current={tab === key ? 'page' : undefined}
          className="bs-tab relative flex min-w-[60px] flex-col items-center gap-0.5 px-1"
        >
          <Icon size={24} strokeWidth={1.8} />
          <span className={`bs-text text-[10px] ${tab === key ? 'font-bold' : ''}`}>{label}</span>
          {badge && (
            <span className="absolute -top-1.5 right-0">
              <NewBadge>{badge}</NewBadge>
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

export function TopBar({
  tab,
  onTab,
  logo,
  profile,
}: {
  tab: ShellTab;
  onTab: (t: ShellTab) => void;
  logo: ReactNode;
  profile: ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-30 hidden h-[64px] items-center gap-6 border-b px-6 md:flex"
      style={{ background: 'var(--bs-page)', borderColor: 'var(--bs-border)' }}
    >
      <button type="button" onClick={() => onTab('home')} className="flex shrink-0 items-center" aria-label={TD.tabHome}>
        {logo}
      </button>
      <span className="h-6 w-px" style={{ background: 'var(--bs-border)' }} aria-hidden />
      <nav aria-label={TD.navLabel} className="flex items-center gap-1">
        {SHELL_TABS.filter((t) => t.key !== 'profile').map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            type="button"
            onClick={() => onTab(key)}
            aria-current={tab === key ? 'page' : undefined}
            className="bs-tab bs-text flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] hover:bg-[var(--bs-surface)]"
          >
            <Icon size={18} strokeWidth={1.8} />
            <span className={tab === key ? 'font-bold' : ''}>{label}</span>
            {badge && <NewBadge>{badge}</NewBadge>}
          </button>
        ))}
      </nav>
      <div className="ml-auto flex items-center">{profile}</div>
    </header>
  );
}
