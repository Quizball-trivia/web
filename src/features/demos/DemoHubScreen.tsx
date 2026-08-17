"use client";

import {
  ArrowRight,
  Blocks,
  CalendarCheck,
  Clock3,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { AppLogo } from "@/components/AppLogo";
import { useLocale } from "@/contexts/LocaleContext";
import type { Locale } from "@/lib/i18n/messages";
import type { DemoModeCard } from "./demoModes";
import { DemoModeArt } from "./DemoModeArt";
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO,
  SHOWCASE_BENEFITS,
  SHOWCASE_HERO,
  SHOWCASE_SECTIONS,
  getCardMeta,
  tt,
  type BenefitIcon,
  type ShowcaseSection,
} from "./demoShowcase";

const BENEFIT_ICONS: Record<BenefitIcon, LucideIcon> = {
  retention: CalendarCheck,
  crossSell: TrendingUp,
  brandable: Blocks,
  football: Trophy,
};

// ── Top bar ───────────────────────────────────────────────────────────────────
function TopBar({ locale }: { locale: Locale }) {
  const { setLocale } = useLocale();

  return (
    <div className="sticky top-0 z-30 border-b border-white/5 bg-[#0b1017]/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <AppLogo size="sm" className="shrink-0" />
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.04] p-0.5 font-poppins text-xs font-bold"
            aria-label={locale === "ka" ? "ენის არჩევა" : "Choose language"}
          >
            {(["en", "ka"] as const).map((code) => {
              const selected = locale === code;
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    window.sessionStorage.setItem("qb-demo-locale-touched", "1");
                    setLocale(code);
                  }}
                  className="rounded-full px-3 py-1.5 uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{
                    backgroundColor: selected ? "#38b60e" : "transparent",
                    color: selected ? "#fff" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {code}
                </button>
              );
            })}
          </div>
          <a
            href={CONTACT_MAILTO}
            className="hidden min-h-10 items-center rounded-lg bg-brand-yellow px-4 font-poppins text-sm font-semibold text-black transition-colors hover:bg-brand-yellow/90 sm:inline-flex"
          >
            {tt(SHOWCASE_HERO.ctaPrimary, locale)}
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ locale }: { locale: Locale }) {
  return (
    <section className="relative px-4 pb-10 pt-14 sm:px-6 sm:pb-14 sm:pt-20 lg:px-8">
      <div className="relative mx-auto w-full max-w-7xl">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-poppins text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan"
        >
          {tt(SHOWCASE_HERO.eyebrow, locale)}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="mt-3 max-w-4xl text-balance font-poppins text-4xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl"
        >
          {tt(SHOWCASE_HERO.title, locale)}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mt-5 max-w-2xl font-poppins text-base font-medium leading-relaxed text-white/65 sm:text-lg"
        >
          {tt(SHOWCASE_HERO.subtitle, locale)}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <a
            href={CONTACT_MAILTO}
            className="inline-flex min-h-11 items-center rounded-lg bg-brand-yellow px-5 font-poppins text-sm font-semibold text-black transition-colors hover:bg-brand-yellow/90"
          >
            {tt(SHOWCASE_HERO.ctaPrimary, locale)}
          </a>
          <a
            href="#games"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-5 font-poppins text-sm font-semibold text-white transition-colors hover:bg-white/[0.06]"
          >
            {tt(SHOWCASE_HERO.ctaSecondary, locale)}
            <ArrowRight className="size-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

// ── Benefits ──────────────────────────────────────────────────────────────────
function BenefitsRow({ locale }: { locale: Locale }) {
  return (
    <section className="px-4 pb-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {SHOWCASE_BENEFITS.map((benefit, index) => {
          const Icon = BENEFIT_ICONS[benefit.icon];
          return (
            <motion.div
              key={benefit.icon}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-transparent p-5"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-lg bg-brand-yellow/10 text-brand-yellow">
                <Icon className="size-5" />
              </span>
              <h3 className="font-poppins text-[15px] font-semibold leading-tight text-white">
                {tt(benefit.title, locale)}
              </h3>
              <p className="font-poppins text-[13px] leading-relaxed text-white/65">
                {tt(benefit.body, locale)}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

// ── Game card ─────────────────────────────────────────────────────────────────
function GameCard({
  mode,
  locale,
  index,
  feature,
}: {
  mode: DemoModeCard;
  locale: Locale;
  index: number;
  feature: boolean;
}) {
  const meta = getCardMeta(mode);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.25) }}
      className="flex"
    >
      <Link
        href={`/demos/${mode.slug}`}
        className="group flex w-full flex-col overflow-hidden rounded-xl bg-surface-card-deeper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <div className="relative overflow-hidden">
          <DemoModeArt
            slug={mode.slug}
            className={`w-full ${feature ? "aspect-[2/1] sm:aspect-[5/2]" : "aspect-[4/3]"} transition-transform duration-300 group-hover:scale-[1.03]`}
          />
          <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-black/45 px-2 py-1 font-poppins text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            <Clock3 className="size-3" />
            {tt(meta.duration, locale)}
          </span>
        </div>

        <div className={`flex flex-1 items-center justify-between gap-4 bg-brand-blue ${feature ? "p-4 sm:p-5" : "p-5"}`}>
          <div className="min-w-0">
            <p className="font-poppins text-xs font-semibold uppercase tracking-[0.14em] text-brand-yellow">
              {locale === "ka" ? "სცადე დემო" : "Try demo"}
            </p>
            <h3 className={`mt-1 font-poppins font-semibold text-white ${feature ? "text-xl" : "text-lg"}`}>
              {tt(mode.title, locale)}
            </h3>
            {feature && (
              <p className="mt-1 line-clamp-1 font-poppins text-[13px] leading-relaxed text-white/75">
                {tt(mode.description, locale)}
              </p>
            )}
          </div>
          <ArrowRight
            className="size-5 shrink-0 text-brand-yellow transition-transform group-hover:translate-x-1"
            aria-hidden
          />
        </div>
      </Link>
    </motion.div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function GameSection({ section, locale }: { section: ShowcaseSection; locale: Locale }) {
  const feature = section.id === "flagship";
  const gridCols = feature ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <section className="px-4 py-7 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <h2 className="font-poppins text-2xl font-semibold text-white sm:text-3xl">
          {tt(section.title, locale)}
        </h2>
        <p className="mt-2 max-w-2xl font-poppins text-sm leading-relaxed text-white/65 sm:text-[15px]">
          {tt(section.blurb, locale)}
        </p>

        <div className={`mt-7 grid grid-cols-1 gap-5 ${gridCols}`}>
          {section.modes.map((mode, index) => (
            <GameCard key={mode.slug} mode={mode} locale={locale} index={index} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Closing CTA ───────────────────────────────────────────────────────────────
function CtaBand({ locale }: { locale: Locale }) {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-xl bg-brand-blue px-6 py-12 text-center sm:px-12 sm:py-16">
        <div className="relative flex flex-col items-center">
          <h2 className="max-w-2xl font-poppins text-2xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-4xl">
            {locale === "ka"
              ? "მიიტანეთ საფეხბურთო ჩართულობა თქვენს პლატფორმაზე"
              : "Bring football engagement to your platform"}
          </h2>
          <p className="mt-4 max-w-xl font-poppins text-sm leading-relaxed text-white/75 sm:text-base">
            {locale === "ka"
              ? "სრულად ბრენდირებადი და თქვენს პროდუქტში ინტეგრაციისთვის მზა — მოდით, გაჩვენოთ ცოცხლად."
              : "Fully brandable and ready to embed in your product — let us walk you through a live integration."}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <a
              href={CONTACT_MAILTO}
              className="inline-flex min-h-11 items-center rounded-lg bg-brand-yellow px-6 font-poppins text-sm font-semibold text-black transition-colors hover:bg-brand-yellow/90"
            >
              {tt(SHOWCASE_HERO.ctaPrimary, locale)}
            </a>
            <a
              href={CONTACT_MAILTO}
              className="font-poppins text-sm font-semibold text-white/75 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export function DemoHubScreen() {
  const { locale } = useLocale();

  return (
    <main className="relative min-h-dvh">
      <TopBar locale={locale} />
      <Hero locale={locale} />
      <BenefitsRow locale={locale} />
      <div id="games" className="scroll-mt-20">
        {SHOWCASE_SECTIONS.map((section) => (
          <GameSection key={section.id} section={section} locale={locale} />
        ))}
      </div>
      <CtaBand locale={locale} />

      <footer className="border-t border-white/5 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <AppLogo size="sm" />
            <span className="font-poppins text-xs font-semibold text-white/40">
              {locale === "ka" ? "პარტნიორის დემო" : "Partner preview"}
            </span>
          </div>
          <span className="font-poppins text-xs text-white/35">
            © {locale === "ka" ? "Quizball — ყველა უფლება დაცულია" : "Quizball — all rights reserved"}
          </span>
        </div>
      </footer>
    </main>
  );
}
