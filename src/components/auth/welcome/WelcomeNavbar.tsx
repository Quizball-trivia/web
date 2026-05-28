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
    <header className="flex h-16 md:h-20 items-center justify-between px-6 md:px-12 lg:px-20 shrink-0 bg-surface-page/80 backdrop-blur-md sticky top-0 z-50">
      <AppLogo size="md" className="!justify-start" />
      <div className="flex items-center gap-3 md:gap-4">
        <LanguageSwitcher locale={locale} />
        <div className="flex items-center gap-2.5">
          <Image src="/assets/brand/world-cup-trophy.webp" alt="Trophy" width={96} height={96} className="h-10 md:h-12 w-auto object-contain" />
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
