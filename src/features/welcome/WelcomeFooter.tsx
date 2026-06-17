'use client';

import Link from 'next/link';
import { Brain, Swords, MessageCircle } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { SocialLinks } from '@/components/shared/SocialLinks';
import { ContactModal } from '@/components/shared/ContactModal';

interface WelcomeFooterProps {
  duelsCount: number;
  verifiedQuestionsCount: number;
}

export function WelcomeFooter({ duelsCount, verifiedQuestionsCount }: WelcomeFooterProps) {
  const { t, locale } = useLocale();
  return (
    <footer className="border-t border-white/6 py-8">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="flex items-center gap-2 font-bold text-brand-yellow">
            <Brain className="size-4" />
            <span className="text-sm">{t('welcome.verifiedQuestions', { count: verifiedQuestionsCount.toLocaleString() })}</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-brand-yellow">
            <Swords className="size-4" />
            <span className="text-sm">{t('welcome.duelsPlayed', { count: duelsCount.toLocaleString() })}</span>
          </div>
        </div>
        {/* Socials + contact (one inline row) */}
        <div className="mt-7 flex flex-col items-center gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/35">
            {t('welcome.followUs')}
          </p>
          <div className="flex items-center gap-2.5">
            <SocialLinks className="gap-2.5" />
            <ContactModal
              trigger={
                <button
                  type="button"
                  aria-label={t('feedback.contactUs')}
                  title={t('feedback.contactUs')}
                  className="flex size-11 items-center justify-center rounded-[14px] bg-brand-yellow text-black shadow-[0_4px_0_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <MessageCircle className="size-5" />
                </button>
              }
            />
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
