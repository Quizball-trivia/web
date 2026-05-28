'use client';

import Link from 'next/link';
import { Brain, Swords } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

interface WelcomeFooterProps {
  duelsCount: number;
}

export function WelcomeFooter({ duelsCount }: WelcomeFooterProps) {
  const { t, locale } = useLocale();
  return (
    <footer className="border-t border-white/6 bg-surface-page py-8">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="flex items-center gap-2 font-bold text-brand-yellow">
            <Brain className="size-4" />
            <span className="text-sm">{t('welcome.verifiedQuestions')}</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-brand-yellow">
            <Swords className="size-4" />
            <span className="text-sm">{t('welcome.duelsPlayed', { count: duelsCount.toLocaleString() })}</span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm md:gap-4">
          <Link
            href={`/${locale}/about`}
            className="font-bold text-white/40 hover:text-brand-cyan transition-colors"
          >
            {t('welcome.aboutUs')}
          </Link>
          <span className="text-white/20">|</span>
          <Link
            href={`/${locale}/terms`}
            className="font-bold text-white/40 hover:text-brand-cyan transition-colors"
          >
            {t('welcome.termsOfService')}
          </Link>
          <span className="text-white/20">|</span>
          <Link
            href={`/${locale}/privacy`}
            className="font-bold text-white/40 hover:text-brand-cyan transition-colors"
          >
            {t('welcome.privacyPolicy')}
          </Link>
        </div>
        <div className="mt-4 space-y-2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/35">
            {t('welcome.copyright')}
          </p>
          <p className="mx-auto max-w-2xl text-[11px] leading-relaxed text-white/30 md:text-xs">
            {t('welcome.footerLegal')}
          </p>
        </div>
      </div>
    </footer>
  );
}
