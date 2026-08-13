"use client";

import { ArrowRight, Clock3 } from "lucide-react";
import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";
import { useLocale } from "@/contexts/LocaleContext";
import { colors } from "@/lib/colors";
import type { Locale } from "@/lib/i18n/messages";
import { DemoModeIcon } from "./DemoModeIcon";
import {
  DAILY_DEMO_MODES,
  FEATURED_DEMO_MODES,
  MINI_GAME_DEMO_MODES,
  demoText,
  type DemoModeCard,
} from "./demoModes";

type ModePresentation = {
  accent: string;
};

const MODE_PRESENTATION: Record<string, ModePresentation> = {
  auction: { accent: "#a3e635" },
  "daily-moneyDrop": { accent: "#facc15" },
  "daily-trueFalse": { accent: "#2dd4bf" },
  "daily-countdown": { accent: "#38bdf8" },
  "daily-imposter": { accent: "#a78bfa" },
  "daily-careerPath": { accent: "#84cc16" },
  "daily-highLow": { accent: "#fb923c" },
  "daily-footballLogic": { accent: "#c084fc" },
  "mini-squad-spin": { accent: "#facc15" },
  "mini-trivia-spin": { accent: "#22d3ee" },
  "mini-penalty-shootout": { accent: "#4ade80" },
  "mini-daily-jackpot": { accent: "#fbbf24" },
  "mini-pass-chain": { accent: "#60a5fa" },
  "mini-accumulator": { accent: "#34d399" },
  "mini-squad-collection": { accent: "#c084fc" },
  "mini-cash-out-ladder": { accent: "#fb923c" },
  "mini-bet-slip-booster": { accent: "#f59e0b" },
  "mini-half-time-trivia": { accent: "#fb7185" },
  "mini-odds-board": { accent: "#22d3ee" },
};

const DEFAULT_PRESENTATION: ModePresentation = { accent: "#38bdf8" };
const HUB_MODES = [...FEATURED_DEMO_MODES, ...MINI_GAME_DEMO_MODES, ...DAILY_DEMO_MODES];

function DemoModeCardItem({ mode, locale }: { mode: DemoModeCard; locale: Locale }) {
  const { accent } = MODE_PRESENTATION[mode.slug] ?? DEFAULT_PRESENTATION;
  const playLabel = locale === "ka" ? "თამაში" : "Play";

  return (
    <Link
      href={`/demos/${mode.slug}`}
      className="group relative flex min-h-[132px] overflow-hidden rounded-2xl border border-white/20 p-4 font-poppins shadow-[0_14px_32px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-0.5 hover:border-white/35 hover:shadow-[0_18px_38px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-4 focus-visible:ring-offset-[#050b18] active:translate-y-0"
      style={{ backgroundColor: colors.blue.brand }}
    >
      <div className="flex w-full gap-4">
        <div
          className="flex size-12 shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-110 sm:size-14"
          style={{ color: accent }}
        >
          <DemoModeIcon slug={mode.slug} className="size-10 sm:size-11" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col self-stretch">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-poppins text-base font-extrabold leading-tight text-white sm:text-lg">
              {demoText(mode.title, locale)}
            </h2>
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 font-poppins text-[10px] font-semibold text-white/70">
              <Clock3 aria-hidden className="size-3" />
              1–2 {locale === "ka" ? "წთ" : "min"}
            </span>
          </div>

          <p className="mt-2 line-clamp-2 font-poppins text-xs font-medium leading-relaxed text-white/70 sm:text-[13px]">
            {demoText(mode.description, locale)}
          </p>

          <span
            className="mt-auto inline-flex self-end items-center gap-1.5 rounded-md px-2.5 py-1 font-poppins text-[11px] font-bold text-white transition duration-200 group-hover:brightness-110"
            style={{ backgroundColor: colors.green.base }}
          >
            {playLabel}
            <ArrowRight aria-hidden className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
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
          className="grid grid-cols-1 gap-3.5 lg:grid-cols-2"
          aria-label={locale === "ka" ? "თამაშის რეჟიმები" : "Game modes"}
        >
          {HUB_MODES.map((mode) => (
            <DemoModeCardItem key={mode.slug} mode={mode} locale={locale} />
          ))}
        </section>
      </div>
    </main>
  );
}
