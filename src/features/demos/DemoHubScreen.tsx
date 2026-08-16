"use client";

import {
  ArrowRight,
  ArrowDown,
  Blocks,
  CalendarCheck,
  Clock3,
  Play,
  Sparkles,
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
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-poppins text-[11px] font-bold uppercase tracking-wide text-blue-200/70 sm:inline-flex">
            <Sparkles className="size-3" />
            {locale === "ka" ? "პარტნიორის დემო" : "Partner preview"}
          </span>
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
            className="hidden items-center gap-1.5 rounded-full bg-brand-green px-4 py-2 font-poppins text-sm font-black text-white shadow-[0_4px_16px_rgba(56,182,14,0.3)] transition-transform hover:-translate-y-0.5 sm:inline-flex"
          >
            {tt(SHOWCASE_HERO.ctaPrimary, locale)}
            <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ locale }: { locale: Locale }) {
  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-8rem] h-[36rem] bg-[radial-gradient(circle_at_50%_0%,rgba(22,69,255,0.28),transparent_60%)]"
      />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/25 bg-brand-cyan/10 px-3.5 py-1.5 font-poppins text-[12px] font-black uppercase tracking-[0.14em] text-brand-cyan"
        >
          <Sparkles className="size-3.5" />
          {tt(SHOWCASE_HERO.eyebrow, locale)}
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="mt-5 font-poppins text-[2rem] font-black leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl"
        >
          {tt(SHOWCASE_HERO.title, locale)}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mt-5 max-w-2xl font-poppins text-base font-medium leading-relaxed text-blue-100/70 sm:text-lg"
        >
          {tt(SHOWCASE_HERO.subtitle, locale)}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <a
            href={CONTACT_MAILTO}
            className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 font-poppins text-base font-black text-white shadow-[0_6px_24px_rgba(56,182,14,0.32)] transition-transform hover:-translate-y-0.5"
          >
            {tt(SHOWCASE_HERO.ctaPrimary, locale)}
            <ArrowRight className="size-4" />
          </a>
          <a
            href="#games"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 font-poppins text-base font-bold text-white transition-colors hover:bg-white/[0.08]"
          >
            {tt(SHOWCASE_HERO.ctaSecondary, locale)}
            <ArrowDown className="size-4" />
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-2"
        >
          {SHOWCASE_HERO.chips.map((chip) => (
            <span
              key={chip.en}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-poppins text-[12px] font-bold text-white/75"
            >
              <span className="size-1.5 rounded-full bg-brand-green-light" />
              {tt(chip, locale)}
            </span>
          ))}
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
              className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan">
                <Icon className="size-5" />
              </span>
              <h3 className="font-poppins text-[15px] font-black leading-tight text-white">
                {tt(benefit.title, locale)}
              </h3>
              <p className="font-poppins text-[13px] leading-relaxed text-white/55">
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
  accent,
  locale,
  index,
  feature,
}: {
  mode: DemoModeCard;
  accent: string;
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
        className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101823] transition-all hover:-translate-y-1 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        {/* Core-element art tile with chips overlaid */}
        <div className="relative">
          <DemoModeArt
            slug={mode.slug}
            className={`w-full ${feature ? "aspect-[16/8]" : "aspect-[16/9]"} transition-transform duration-500 group-hover:scale-[1.04]`}
          />
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-black/45 px-2 py-1 font-poppins text-[10px] font-black uppercase tracking-wide text-white backdrop-blur-sm">
              <Clock3 className="size-3" />
              {tt(meta.duration, locale)}
            </span>
          </div>
          {meta.mechanic && (
            <span
              className="pointer-events-none absolute right-3 top-3 inline-flex items-center rounded-md bg-black/45 px-2 py-1 font-poppins text-[10px] font-black uppercase tracking-wide backdrop-blur-sm"
              style={{ color: accent }}
            >
              {tt(meta.mechanic, locale)}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3
            className={`font-poppins font-black uppercase leading-[1.05] text-white ${
              feature ? "text-2xl sm:text-3xl" : "text-lg"
            }`}
          >
            {tt(mode.title, locale)}
          </h3>
          <p
            className={`mt-2 font-poppins leading-relaxed text-white/60 ${
              feature ? "text-[15px]" : "text-[13px]"
            }`}
          >
            {tt(mode.description, locale)}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-5">
            <span className="font-poppins text-[11px] font-bold uppercase tracking-wide text-white/40">
              {tt(meta.format, locale)}
            </span>
            <span
              className="inline-flex items-center gap-1.5 font-poppins text-[13px] font-black transition-colors"
              style={{ color: accent }}
            >
              <Play className="size-3.5 fill-current" />
              {locale === "ka" ? "სცადეთ დემო" : "Try demo"}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function GameSection({ section, locale }: { section: ShowcaseSection; locale: Locale }) {
  const feature = section.id === "flagship";
  const gridCols = feature ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-2 border-l-2 pl-4" style={{ borderColor: section.accent }}>
          <span
            className="font-poppins text-[12px] font-black uppercase tracking-[0.14em]"
            style={{ color: section.accent }}
          >
            {tt(section.eyebrow, locale)} · {section.modes.length}
          </span>
          <h2 className="font-poppins text-2xl font-black tracking-[-0.02em] text-white sm:text-3xl">
            {tt(section.title, locale)}
          </h2>
          <p className="max-w-2xl font-poppins text-sm leading-relaxed text-white/55 sm:text-[15px]">
            {tt(section.blurb, locale)}
          </p>
        </div>

        <div className={`grid grid-cols-1 gap-3 ${gridCols} lg:gap-4`}>
          {section.modes.map((mode, index) => (
            <GameCard
              key={mode.slug}
              mode={mode}
              accent={section.accent}
              locale={locale}
              index={index}
              feature={feature}
            />
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
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#132033] to-[#0c1420] px-6 py-12 text-center sm:px-12 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[-6rem] h-[20rem] bg-[radial-gradient(circle_at_50%_0%,rgba(56,182,14,0.22),transparent_60%)]"
        />
        <div className="relative flex flex-col items-center">
          <h2 className="max-w-2xl font-poppins text-2xl font-black leading-tight tracking-[-0.02em] text-white sm:text-4xl">
            {locale === "ka"
              ? "მიიტანეთ საფეხბურთო ჩართულობა თქვენს პლატფორმაზე"
              : "Bring football engagement to your platform"}
          </h2>
          <p className="mt-4 max-w-xl font-poppins text-sm leading-relaxed text-white/60 sm:text-base">
            {locale === "ka"
              ? "სრულად ბრენდირებადი და თქვენს პროდუქტში ინტეგრაციისთვის მზა — მოდით, გაჩვენოთ ცოცხლად."
              : "Fully brandable and ready to embed in your product — let us walk you through a live integration."}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <a
              href={CONTACT_MAILTO}
              className="inline-flex items-center gap-2 rounded-full bg-brand-green px-7 py-3.5 font-poppins text-base font-black text-white shadow-[0_6px_24px_rgba(56,182,14,0.32)] transition-transform hover:-translate-y-0.5"
            >
              {tt(SHOWCASE_HERO.ctaPrimary, locale)}
              <ArrowRight className="size-4" />
            </a>
            <a
              href={CONTACT_MAILTO}
              className="font-poppins text-sm font-bold text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
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
