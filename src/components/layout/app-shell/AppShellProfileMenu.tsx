'use client';

/**
 * Avatar + username trigger that opens a dropdown with Profile,
 * Settings, and Log Out actions. Shared by the desktop and mobile
 * headers; only the trigger layout + dropdown alignment differs.
 */

import { useRouter } from 'next/navigation';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { useLocale } from '@/contexts/LocaleContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User } from 'lucide-react';
import type { PlayerStats } from '@/types/game';

interface AppShellProfileMenuProps {
  variant: 'desktop' | 'mobile';
  playerStats: PlayerStats;
  authUserCountry?: string | null;
  onRequestLogout: () => void;
}

export function AppShellProfileMenu({
  variant,
  playerStats,
  authUserCountry,
  onRequestLogout,
}: AppShellProfileMenuProps) {
  const router = useRouter();
  const { t } = useLocale();
  const isDesktop = variant === 'desktop';
  const align = isDesktop ? 'end' : 'start';

  const trigger = isDesktop ? (
    <button className="flex items-center gap-3 rounded-full px-1 py-1 hover:bg-white/5 transition-colors focus:outline-none">
      <div className="rounded-full bg-brand-blue p-1.5">
        <AvatarDisplay
          customization={playerStats.avatarCustomization || { base: playerStats.avatar }}
          size="sm"
          countryCode={authUserCountry ?? undefined}
        />
      </div>
      <div className="text-left">
        <div className="text-sm font-black uppercase tracking-wide text-white">
          {playerStats.username}
        </div>
        <div className="mt-0.5 inline-flex items-center rounded-full bg-brand-yellow px-2.5 py-0.5 text-xs font-black text-black">
          {playerStats.rankPoints ?? 0}RP
        </div>
      </div>
    </button>
  ) : (
    <button className="flex items-center gap-2 rounded-full focus:outline-none">
      <div className="size-12 rounded-full overflow-hidden">
        <AvatarDisplay
          customization={playerStats.avatarCustomization || { base: playerStats.avatar }}
          size="sm"
          countryCode={authUserCountry ?? undefined}
        />
      </div>
      <div className="text-left">
        <div className="text-sm font-black uppercase tracking-[0.03em] text-white">
          {playerStats.username}
        </div>
        <div className="mt-1 inline-flex items-center rounded-full bg-brand-yellow px-2.5 py-0.5 text-[11px] font-black uppercase leading-none text-black">
          {playerStats.rankPoints ?? 0} RP
        </div>
      </div>
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 rounded-[20px] border-0 p-3 text-white font-poppins shadow-[0_18px_48px_rgba(0,0,0,0.45)]"
        style={{ backgroundColor: '#1645FF' }}
        align={align}
        forceMount
      >
        <DropdownMenuLabel className="font-normal px-2 pb-3">
          <div className="flex flex-col space-y-1">
            <p className="font-poppins text-base font-semibold leading-none text-white">
              {playerStats.username}
            </p>
            <p className="font-poppins text-xs font-medium leading-none text-white/70">
              {t('accountMenu.levelAndRp', {
                level: playerStats.level,
                rp: playerStats.rankPoints ?? 0,
              })}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="rounded-[12px] px-3 py-2.5 font-poppins text-sm font-semibold text-white focus:bg-white/15 focus:text-white"
          onClick={() => router.push('/profile')}
        >
          <User className="mr-2 h-4 w-4 text-brand-yellow" />
          <span>{t('navigation.profile')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-[12px] px-3 py-2.5 font-poppins text-sm font-semibold text-white focus:bg-white/15 focus:text-white"
          onClick={() => router.push('/settings')}
        >
          <Settings className="mr-2 h-4 w-4 text-brand-yellow" />
          <span>{t('navigation.settings')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onRequestLogout}
          className="mt-2 justify-center rounded-[16px] bg-brand-red-soft px-3 py-3 font-poppins text-sm font-semibold uppercase text-white transition-colors focus:bg-brand-red-deep focus:text-white hover:bg-brand-red-deep"
        >
          <LogOut className="mr-2 h-4 w-4 text-white" />
          <span>{t('accountMenu.logOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
