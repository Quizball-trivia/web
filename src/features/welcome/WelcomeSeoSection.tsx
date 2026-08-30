'use client';

import Link from 'next/link';
import { ArrowRight, BadgeCheck, Swords, Trophy } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

const FEATURE_CARDS = [
  { title: 'welcome.seoSoloTitle', body: 'welcome.seoSoloBody', icon: Trophy },
  { title: 'welcome.seoRankedTitle', body: 'welcome.seoRankedBody', icon: Swords },
  { title: 'welcome.seoVerifiedTitle', body: 'welcome.seoVerifiedBody', icon: BadgeCheck },
] as const;

export function WelcomeSeoSection() {
  const { locale, t } = useLocale();
  const primaryHref = locale === 'es'
    ? '/es/quiz-de-futbol'
    : locale === 'en'
      ? '/en/football-quiz'
      : '/ka/about';

  return (
    <section aria-labelledby="quizball-explained-heading" className="px-4 pb-16 pt-4 sm:px-6 md:pb-24">
      <div className="mx-auto max-w-6xl rounded-[28px] border border-white/10 bg-surface-card-deeper/75 px-5 py-8 backdrop-blur-sm sm:px-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">
          {t('welcome.seoEyebrow')}
        </p>
        <h2 id="quizball-explained-heading" className="mt-2 max-w-3xl text-2xl font-black text-white sm:text-3xl">
          {t('welcome.seoTitle')}
        </h2>
        <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-white/65 sm:text-base">
          {t('welcome.seoBody')}
        </p>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {FEATURE_CARDS.map(({ title, body, icon: Icon }) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <Icon className="size-5 text-brand-yellow" aria-hidden />
              <h3 className="mt-3 text-base font-bold text-white">{t(title)}</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-white/55">{t(body)}</p>
            </article>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
          <Link href={primaryHref} className="inline-flex items-center gap-2 font-semibold text-brand-yellow hover:text-white">
            {t('welcome.seoPrimaryCta')}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href={`/${locale}/editorial-methodology`} className="inline-flex items-center gap-2 font-semibold text-brand-cyan hover:text-white">
            {t('welcome.seoMethodologyCta')}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
