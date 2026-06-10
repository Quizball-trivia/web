'use client';

import Image from 'next/image';
import { AppLogo } from '@/components/AppLogo';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useLocale } from '@/contexts/LocaleContext';
import { useActiveEventMode } from '@/lib/hooks/useActiveEventMode';

interface WelcomeNavbarProps {
  wcDaysLeft: number;
}

export function WelcomeNavbar({ wcDaysLeft }: WelcomeNavbarProps) {
  const { t, locale } = useLocale();
  const { isEventMode } = useActiveEventMode();
  return (
    <header className="flex h-16 md:h-20 items-center justify-between gap-2 px-6 md:px-12 lg:px-20 shrink-0 bg-surface-page/80 backdrop-blur-md sticky top-0 z-50">
      {/* Mobile: three slots so the switcher is centered between logo and cup.
          Desktop (md+): switcher rejoins the right cluster next to the trophy,
          like the original layout. */}
      <div className={isEventMode ? "flex flex-1 items-center gap-3 md:gap-5 justify-start md:flex-none" : "flex flex-1 justify-start md:flex-none"}>
        <AppLogo size="md" className="!justify-start" />
        {isEventMode && (
          <>
            <div className="h-8 md:h-10 w-px bg-white/20 shrink-0" />
            <div className="flex flex-col items-start shrink-0">
              <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">
                Powered by
              </span>
              <Image
                src="/assets/betsson/1.png"
                alt="Betsson Sport"
                width={200}
                height={26}
                className="h-5 md:h-6 w-auto object-contain"
              />
            </div>
          </>
        )}
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
            {!isEventMode && (
              <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 -rotate-[6deg] rounded-[9px] bg-brand-yellow px-2 py-0.5 font-poppins text-[9px] font-black uppercase tracking-wide text-surface-page shadow-[0_2px_6px_rgba(0,0,0,0.4)] md:text-[10px]">
                {t('common.beta')}
              </span>
            )}
            <Image src="/assets/brand/world-cup-trophy.webp" alt="Trophy" width={96} height={96} className="h-10 md:h-12 w-auto object-contain" />
          </div>
          {wcDaysLeft > 0 && (
            <div className="flex flex-col leading-none">
              <span className="text-lg md:text-xl font-black tabular-nums text-white">
                {wcDaysLeft}
              </span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-brand-yellow">
                {isEventMode ? 'days left' : t('welcome.untilKickoff')}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
