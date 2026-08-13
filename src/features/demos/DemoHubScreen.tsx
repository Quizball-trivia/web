"use client";

import { Clock3 } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { AppLogo } from "@/components/AppLogo";
import { useLocale } from "@/contexts/LocaleContext";
import type { Locale } from "@/lib/i18n/messages";
import {
  DAILY_DEMO_MODES,
  FEATURED_DEMO_MODES,
  MINI_GAME_DEMO_MODES,
  demoText,
  type DemoModeCard,
} from "./demoModes";

const HUB_MODES = [...FEATURED_DEMO_MODES, ...MINI_GAME_DEMO_MODES, ...DAILY_DEMO_MODES];

// Faithful copy of the daily-challenges hub card (see
// app/(app)/daily/challenges ChallengeCard): yellow card, centred uppercase
// title, full description, pills row, black PLAY pill.
function DemoModeCardItem({ mode, index, locale }: { mode: DemoModeCard; index: number; locale: Locale }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 + index * 0.03, ease: "easeOut" }}
      className="relative flex h-full"
    >
      <Link
        href={`/demos/${mode.slug}`}
        className="relative flex min-h-[184px] w-full flex-col overflow-hidden rounded-[8px] bg-brand-yellow p-3.5 pb-10 text-center text-black transition-all hover:brightness-105 active:translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow md:min-h-[268px] md:rounded-[20px] md:p-6 md:pb-6"
      >
        <h3 className="font-poppins flex min-h-[2.1rem] items-start justify-center px-2 text-center text-[16px] uppercase leading-[1.1] text-black md:mt-2 md:min-h-[3.5rem] md:px-0 md:text-[26px] md:leading-[0.95]">
          {demoText(mode.title, locale)}
        </h3>
        <p className="mt-3 mb-4 text-center text-[10px] font-bold leading-snug text-black/80 [word-spacing:0.1em] md:mt-5 md:mb-6 md:px-4 md:text-[17px] md:font-semibold md:leading-snug md:[word-spacing:normal]">
          {demoText(mode.description, locale)}
        </p>
        {/* Mobile pill row (mirrors the daily hub's reward pills). */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 md:hidden">
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-white/70 px-2.5 text-[10px] font-black text-brand-gold-ink">
            <Clock3 className="size-3" /> 1–2 {locale === "ka" ? "წთ" : "min"}
          </span>
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-brand-green-light px-2.5 text-[10px] font-black text-white">
            {locale === "ka" ? "დემო" : "DEMO"}
          </span>
        </div>
        {/* Desktop pill row. */}
        <div className="mt-auto mb-3 hidden w-full items-center justify-between gap-2 md:flex">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/70 px-3.5 text-[15px] font-black tabular-nums text-brand-gold-ink">
            <Clock3 className="size-4" /> 1–2 {locale === "ka" ? "წთ" : "min"}
          </span>
          <span className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-green-light px-3.5 text-[15px] font-black text-white">
            {locale === "ka" ? "დემო" : "DEMO"}
          </span>
        </div>
        <div className="hidden justify-center md:flex">
          <span className="font-poppins inline-flex h-[34px] min-w-[120px] items-center justify-center rounded-[14px] bg-black px-5 text-[15px] uppercase tracking-wide text-white md:h-[50px] md:min-w-[200px] md:rounded-[20px] md:px-8 md:text-[22px]">
            {locale === "ka" ? "თამაში" : "Play"}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export function DemoHubScreen() {
  const { locale, setLocale } = useLocale();

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_50%_-20%,rgba(22,69,255,0.34),transparent_62%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-28 h-80 w-80 -translate-x-1/2 rounded-full border border-blue-400/10"
      />

      <div className="relative mx-auto w-full max-w-7xl">
        <header className="relative mb-8 flex flex-col items-start gap-5 sm:mb-10 sm:flex-row sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:gap-6">
            <AppLogo size="md" className="mt-1 shrink-0" />
            <div className="min-w-0 sm:border-l sm:border-white/10 sm:pl-6">
              <h1 className="font-poppins text-2xl font-black leading-tight tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                {locale === "ka" ? "აირჩიე თამაშის რეჟიმი" : "Choose Your Game Mode"}
              </h1>
              <p className="mt-2 font-poppins text-sm font-semibold text-blue-200/70 sm:text-base">
                {locale === "ka"
                  ? `${HUB_MODES.length} გზა საფეხბურთო ცოდნის გამოსაცდელად`
                  : `${HUB_MODES.length} ways to test your football knowledge`}
              </p>
            </div>
          </div>

          <div
            className="absolute right-0 top-0 flex shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#10212b]/90 p-1 font-poppins text-xs font-bold shadow-lg backdrop-blur-sm sm:static sm:text-sm"
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
                  className="rounded-full px-3 py-2 uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:px-4"
                  style={{
                    backgroundColor: selected ? "#38b60e" : "transparent",
                    color: selected ? "#fff" : "rgba(255,255,255,0.52)",
                  }}
                >
                  {code}
                </button>
              );
            })}
          </div>
        </header>

        <section
          className="grid grid-cols-2 gap-2.5 md:gap-6 lg:grid-cols-3"
          aria-label={locale === "ka" ? "თამაშის რეჟიმები" : "Game modes"}
        >
          {HUB_MODES.map((mode, index) => (
            <DemoModeCardItem key={mode.slug} mode={mode} index={index} locale={locale} />
          ))}
        </section>
      </div>
    </main>
  );
}
