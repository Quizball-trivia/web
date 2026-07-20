'use client';

import Image from 'next/image';
import { AppLogo } from '@/components/AppLogo';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useLocale } from '@/contexts/LocaleContext';
import { useActiveEventMode } from '@/lib/hooks/useActiveEventMode';

export function WelcomeNavbar() {
  const { locale } = useLocale();
  const { eventEnabled } = useActiveEventMode();
  return (
    <header className="flex h-16 md:h-20 items-center justify-between gap-2 px-6 md:px-12 lg:px-20 shrink-0 bg-surface-page/80 backdrop-blur-md sticky top-0 z-50">
      {/* Mobile: three slots so the switcher is centered between logo and cup.
          Desktop (md+): switcher rejoins the right cluster next to the trophy,
          like the original layout. */}
      <div className={eventEnabled ? "flex flex-1 items-center gap-2 md:gap-5 justify-start md:flex-none min-w-0" : "flex flex-1 justify-start md:flex-none"}>
        {eventEnabled ? (
          <>
            <AppLogo size="sm" className="!justify-start shrink-0 md:!hidden" />
            <AppLogo size="md" className="!justify-start shrink-0 !hidden md:!flex" />
          </>
        ) : (
          <AppLogo size="md" className="!justify-start" />
        )}
        {eventEnabled && (
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
                className="h-4 md:h-6 w-auto max-w-[100px] md:max-w-none object-contain"
              />
            </div>
          </>
        )}
      </div>

      {/* Centered switcher — mobile only. Nudged down so it clears the wide
          "Powered by Betsson" logo on the left instead of overlapping it, and
          scaled down a touch so it reads smaller on mobile than on desktop. */}
      <div className="flex shrink-0 justify-center md:hidden translate-y-10 scale-90 origin-top">
        <LanguageSwitcher locale={locale} />
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 md:gap-4">
        {/* Switcher in the right cluster — desktop only */}
        <div className="hidden md:flex">
          <LanguageSwitcher locale={locale} />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <Image src="/assets/brand/world-cup-trophy.webp" alt="Trophy" width={96} height={96} className="h-10 md:h-12 w-auto object-contain" />
          </div>
        </div>
      </div>
    </header>
  );
}
