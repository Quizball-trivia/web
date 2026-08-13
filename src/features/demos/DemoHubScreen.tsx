"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { useLocale } from "@/contexts/LocaleContext";
import { colors } from "@/lib/colors";
import {
  DAILY_DEMO_MODES,
  FEATURED_DEMO_MODES,
  demoText,
  type DemoModeCard,
} from "./demoModes";

const poppins = { fontFamily: "'Poppins', sans-serif" };

function DemoModeRow({ mode }: { mode: DemoModeCard }) {
  const { locale } = useLocale();

  return (
    <Link
      href={`/demos/${mode.slug}`}
      className="flex items-center gap-4 rounded-[10px] p-4 transition-transform active:translate-y-[2px]"
      style={{ backgroundColor: colors.blue.brand }}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] text-2xl ${mode.iconBgColor}`}
      >
        {mode.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[15px] font-semibold text-white" style={poppins}>
            {demoText(mode.title, locale)}
          </h3>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/80">
            <Clock className="h-3 w-3" />
            1–2 {locale === "ka" ? "წთ" : "min"}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-white/70" style={poppins}>
          {demoText(mode.description, locale)}
        </p>
      </div>
    </Link>
  );
}

export function DemoHubScreen() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <AppLogo size="sm" />
          <h1 className="text-xl font-bold text-white" style={poppins}>
            {locale === "ka" ? "თამაშის რეჟიმები" : "Game Modes Demo"}
          </h1>
        </div>
        <div
          className="flex shrink-0 overflow-hidden rounded-full text-[12px] font-semibold"
          style={{ backgroundColor: colors.surface.card }}
        >
          {(["en", "ka"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                window.sessionStorage.setItem("qb-demo-locale-touched", "1");
                setLocale(code);
              }}
              className="px-3 py-1.5 uppercase transition-colors"
              style={{
                ...poppins,
                backgroundColor: locale === code ? colors.green.base : "transparent",
                color: locale === code ? "#fff" : "rgba(255,255,255,0.55)",
              }}
            >
              {code}
            </button>
          ))}
        </div>
      </header>

      <section className="flex flex-col gap-2">
        {[...FEATURED_DEMO_MODES, ...DAILY_DEMO_MODES].map((mode) => (
          <DemoModeRow key={mode.slug} mode={mode} />
        ))}
      </section>

    </div>
  );
}
