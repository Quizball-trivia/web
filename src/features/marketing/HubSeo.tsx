import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { campaignPublicSlug } from "@/features/campaign-quiz/campaignQuiz.routes";
import type { Locale } from "@/lib/i18n/locale";
import { HOME_COPY } from "@/lib/seo/home-copy";
import { dailyCollectionPath, quizHubHref } from "@/lib/seo/public-games";
import { SignInLink } from "./public/PublicLinks";

const h2 = "font-poppins text-lg font-bold uppercase md:text-xl";
const pill = "rounded-full border border-white/20 px-4 py-2 text-sm font-semibold hover:border-white";

/** Server-rendered heading block above the ranked hero on the guest hub (the page's only H1). */
export function HubIntro({ locale }: { locale: Locale }) {
  const copy = HOME_COPY[locale];
  return (
    <section className="mx-auto max-w-5xl px-4 pt-4 font-poppins text-white md:pt-6">
      <h1 className="text-2xl font-black uppercase leading-tight md:text-3xl">{copy.h1}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">{copy.intro}</p>
      <p className="mt-1 text-xs font-semibold text-brand-yellow md:text-sm">{copy.accessLine}</p>
    </section>
  );
}

/** Server-rendered body under the game cards: daily link, why an account, quiz links, about, FAQ. */
export function HubBody({ locale }: { locale: Locale }) {
  const copy = HOME_COPY[locale];
  const quizLocale = locale === "ka" ? "en" : locale;
  return (
    <div className="space-y-8 pt-4 font-poppins text-white">
      <section className="max-w-3xl">
        <h2 className={h2}>{copy.sections.daily}</h2>
        <p className="mt-1 text-sm text-white/60">{copy.sections.dailyHint}</p>
        <Link href={dailyCollectionPath(locale)} className="mt-2 inline-block text-sm font-bold uppercase tracking-wide text-brand-yellow hover:underline">{copy.sections.dailyAll}</Link>
      </section>

      <section className="max-w-3xl">
        <h2 className={h2}>{copy.sections.whyAccount}</h2>
        {copy.whyAccount.map((p) => <p key={p} className="mt-3 text-sm leading-relaxed text-white/75 md:text-base">{p}</p>)}
        <SignInLink placement="home_why_account" className="mt-4 inline-flex h-11 items-center rounded-full bg-brand-yellow px-6 text-sm font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep">{copy.nav.signIn}</SignInLink>
      </section>

      <section className="max-w-3xl">
        <h2 className={h2}>{copy.sections.quizzes}</h2>
        <ul className="mt-3 flex flex-wrap gap-3">
          <li><Link href={quizHubHref(locale)} className={pill}>{copy.quizLinks.hub}</Link></li>
          <li><Link href={`${quizHubHref(locale)}/${campaignPublicSlug("guess-the-player", quizLocale)}`} className={pill}>{copy.quizLinks.guessPlayer}</Link></li>
          <li><Link href={`${quizHubHref(locale)}/${campaignPublicSlug("career-path", quizLocale)}`} className={pill}>{copy.quizLinks.careerPath}</Link></li>
        </ul>
      </section>

      <section className="max-w-3xl">
        <h2 className={h2}>{copy.about.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/75 md:text-base">{copy.about.text}</p>
      </section>

      <section className="max-w-3xl">
        <h2 className={h2}>{copy.sections.faq}</h2>
        {/* Native disclosure: answers stay in the server HTML (crawlable) and open without JavaScript. */}
        <div className="mt-4 divide-y divide-white/10">
          {copy.faq.map((item) => (
            <details key={item.q} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <ChevronDown className="size-4 shrink-0 text-white/60 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
