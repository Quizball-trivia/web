'use client';

import Image from 'next/image';
import { AppLogo } from '@/components/AppLogo';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useLocale } from '@/contexts/LocaleContext';

interface WelcomeNavbarProps {
  wcDaysLeft: number;
}

export function WelcomeNavbar({ wcDaysLeft }: WelcomeNavbarProps) {
  const { t, locale } = useLocale();
  return (
    <header className="flex h-16 md:h-20 items-center justify-between gap-2 px-6 md:px-12 lg:px-20 shrink-0 bg-surface-page/80 backdrop-blur-md sticky top-0 z-50">
      {/* Mobile: three slots so the switcher is centered between logo and cup.
          Desktop (md+): switcher rejoins the right cluster next to the trophy,
          like the original layout. */}
      <div className="flex flex-1 justify-start md:flex-none">
        <AppLogo size="md" className="!justify-start" />
      </div>

      {/* Centered switcher — mobile only */}
      <div className="flex shrink-0 justify-center md:hidden">
        <LanguageSwitcher locale={locale} />
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 md:gap-4">
        {/* Switcher in the right cluster — desktop only */}
        <div className="hidden md:flex">
          <LanguageSwitcher locale={locale} />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            {/* Beta badge — tilted yellow pill over the trophy, matching the
                sidebar beta badge style. */}
            <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 -rotate-[6deg] rounded-[9px] bg-brand-yellow px-2 py-0.5 font-poppins text-[9px] font-black uppercase tracking-wide text-surface-page shadow-[0_2px_6px_rgba(0,0,0,0.4)] md:text-[10px]">
              {t('common.beta')}
            </span>
            <Image src="/assets/brand/world-cup-trophy.webp" alt="Trophy" width={96} height={96} className="h-10 md:h-12 w-auto object-contain" />
          </div>
          {wcDaysLeft > 0 && (
            <div className="flex flex-col leading-none">
              <span className="text-lg md:text-xl font-black tabular-nums text-white">
                {wcDaysLeft}
              </span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-brand-yellow">
                {t('welcome.untilKickoff')}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
