'use client';

/**
 * Fixed bottom navigation for the mobile layout. Renders the 5
 * MOBILE_NAV_ITEMS with a social badge bubble on /social when the
 * notification count is positive.
 *
 * Active state comes from the shell's path-active helper so the
 * highlight rule stays centralised.
 */

import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';
import { MOBILE_NAV_ITEMS } from './appShell.helpers';
import type { MessageKey } from '@/lib/i18n/messages';

interface AppShellMobileBottomNavProps {
  isPathActive: (path: string, exact?: boolean) => boolean;
  socialBadgeCount: number;
}

export function AppShellMobileBottomNav({ isPathActive, socialBadgeCount }: AppShellMobileBottomNavProps) {
  const { t } = useLocale();
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border/50">
      <nav className="flex justify-around px-2 py-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = isPathActive(item.path, undefined);
          const showSocialBadge = item.path === '/social' && socialBadgeCount > 0;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'relative flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
                isActive ? 'text-primary bg-secondary' : 'text-muted-foreground',
              )}
            >
              <item.icon className="size-5" />
              <span className="text-xs">{t(item.labelKey as MessageKey)}</span>
              {showSocialBadge && (
                <span className="absolute right-1 top-1 min-w-4 rounded-full bg-red-500 px-1 py-0.5 text-center text-[9px] font-black text-white">
                  {socialBadgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
