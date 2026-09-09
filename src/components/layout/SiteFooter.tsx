'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { SocialLinks } from '@/components/shared/SocialLinks';
import { ContactModal } from '@/components/shared/ContactModal';
import { campaignHubPath } from '@/features/campaign-quiz/campaignQuiz.routes';
import { GAME_PAGES, gamePagePath } from '@/lib/seo/game-pages';
import type { Locale } from '@/lib/i18n/locale';

const SECTION: Record<Locale, { games: string; daily: string; company: string; methodology: string; press: string; index: string }> = {
  en: { games: 'Game modes', daily: 'Daily challenges', company: 'QuizBall', methodology: 'Editorial methodology', press: 'Press', index: 'Football Knowledge Index' },
  ka: { games: 'თამაშის რეჟიმები', daily: 'ყოველდღიური გამოწვევები', company: 'QuizBall', methodology: 'რედაქციული მეთოდოლოგია', press: 'პრესა', index: 'საფეხბურთო ცოდნის ინდექსი' },
  es: { games: 'Modos de juego', daily: 'Retos diarios', company: 'QuizBall', methodology: 'Metodología editorial', press: 'Prensa', index: 'Índice de conocimiento futbolero' },
  tr: { games: 'Oyun modları', daily: 'Günlük görevler', company: 'QuizBall', methodology: 'Editoryal metodoloji', press: 'Basın', index: 'Futbol Bilgi Endeksi' },
};

/**
 * Site-wide footer: every public page linked from every screen. It carries the
 * internal links search engines follow (game landing pages, quizzes, about,
 * legal) plus socials and contact. Rendered on the Play screen and on the
 * server-rendered landing pages, so crawlers see it without a session.
 */
export function SiteFooter({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { t, locale: contextLocale } = useLocale();
  const locale = (forcedLocale ?? contextLocale) as Locale;
  const labels = SECTION[locale] ?? SECTION.en;
  // Campaign quizzes, the knowledge index and press pages exist in en/es only.
  const editorialLocale = locale === 'en' || locale === 'es' ? locale : 'en';
  const quizzesHref = campaignHubPath(editorialLocale);
  const games = GAME_PAGES.filter((page) => page.section === 'games');
  const dailies = GAME_PAGES.filter((page) => page.section === 'daily');
  const linkClass = 'block text-[13px] font-medium text-white/50 transition-colors hover:text-brand-cyan';

  const groups: Array<{ title: string; items: Array<{ href: string; label: string }> }> = [
    { title: labels.games, items: games.map((page) => ({ href: gamePagePath(page, locale), label: page.copy[locale].title })) },
    { title: labels.daily, items: dailies.map((page) => ({ href: gamePagePath(page, locale), label: page.copy[locale].title })) },
    {
      title: labels.company,
      items: [
        { href: `/${locale}/about`, label: t('welcome.aboutUs') },
        { href: quizzesHref, label: t('welcome.quizzes') },
        { href: `/${locale}/editorial-methodology`, label: labels.methodology },
        { href: `/${editorialLocale}/football-knowledge-index`, label: labels.index },
        { href: `/${editorialLocale}/press`, label: labels.press },
        { href: `/${locale}/terms`, label: t('welcome.termsOfService') },
        { href: `/${locale}/privacy`, label: t('welcome.privacyPolicy') },
      ],
    },
  ];

  const socials = (
    <div className="flex items-center gap-2">
      <SocialLinks size="sm" className="gap-2" />
      <ContactModal
        trigger={
          <button
            type="button"
            aria-label={t('feedback.contactUs')}
            title={t('feedback.contactUs')}
            className="flex size-9 items-center justify-center rounded-xl bg-brand-yellow text-black transition-transform hover:-translate-y-0.5"
          >
            <MessageCircle className="size-4" />
          </button>
        }
      />
    </div>
  );

  return (
    <footer className="mt-10 border-t border-white/[0.06] py-6 font-poppins md:py-7">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        {/* Phones: socials first, then each group collapsed under its heading
            (native <details>, no JS), the way most mobile footers behave. */}
        <div className="md:hidden">
          <div className="flex items-center justify-between gap-3 pb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/35">{t('welcome.followUs')}</p>
            {socials}
          </div>
          {groups.map((group) => (
            <details key={group.title} className="group border-t border-white/[0.06]">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[12px] font-bold uppercase tracking-[0.2em] text-white/70 [&::-webkit-details-marker]:hidden">
                {group.title}
                <ChevronDown className="size-4 text-white/40 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 pb-4">
                {group.items.map((item) => (
                  <li key={item.href}><Link href={item.href} className={linkClass}>{item.label}</Link></li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        {/* Desktop: the classic four columns. */}
        <nav className="hidden grid-cols-[1fr_1.6fr_1fr_auto] gap-8 md:grid" aria-label="Site">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{group.title}</p>
              <ul className={cn("space-y-1", group.items.length > 6 && "columns-2 gap-x-6 space-y-0 [&>li]:mb-1 [&>li]:break-inside-avoid")}>
                {group.items.map((item) => (
                  <li key={item.href}><Link href={item.href} className={linkClass}>{item.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{t('welcome.followUs')}</p>
            {socials}
          </div>
        </nav>

        <p className="mt-5 border-t border-white/[0.06] pt-4 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 md:mt-6 md:pt-4 md:text-left">
          {t('welcome.copyright')}
        </p>
      </div>
    </footer>
  );
}
