"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { DemoModeIcon } from "@/features/demos/DemoModeIcon";
import { MINI_GAME_ICONS } from "./MiniGameIcons";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

export interface MiniGameIntroConfig {
  /** Card slug — drives the vector glyph drawn for the mode (DemoModeIcon). */
  slug: string;
  title: string;
  tagline: string;
  chips: string[];
  steps: string[];
}

/**
 * Full-screen intro for a coin mini game: glyph, title, tagline, chips, numbered
 * rules, one yellow Start. Same composition as the FIFA Universe mode intros.
 * `resume` lets a page skip the intro when the player already has a live round.
 */
export function MiniGameIntro({ config, backHref = "/play", resume, children }: { config: MiniGameIntroConfig; backHref?: string; resume?: () => Promise<boolean>; children: ReactNode }) {
  const { t } = useLocale();
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [checking, setChecking] = useState(Boolean(resume));

  useEffect(() => {
    if (!resume) return;
    let cancelled = false;
    resume().then((active) => { if (!cancelled) { if (active) setStarted(true); setChecking(false); } }).catch(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [resume]);

  if (started) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat text-white">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-28 pt-4 md:justify-center md:pb-8">
        <div className="mb-3">
          <button type="button" onClick={() => router.push(backHref)} aria-label={t("common.back")} className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white"><ArrowLeft className="size-5" /></button>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-brand-blue p-6 text-center text-white">
          <span className="mx-auto flex justify-center text-brand-yellow">
            {(() => { const Icon = (MINI_GAME_ICONS as Record<string, typeof MINI_GAME_ICONS["mini-final-third"]>)[config.slug]; return Icon ? <Icon className="size-16" /> : <DemoModeIcon slug={config.slug} className="size-14" />; })()}
          </span>
          <h2 className="mt-4 text-2xl font-black uppercase tracking-wide text-white" style={poppins}>{config.title}</h2>
          <p className="mt-1.5 text-sm font-semibold text-white/80" style={poppins}>{config.tagline}</p>
          {config.chips.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {config.chips.map((c) => (
                <span key={c} className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white" style={poppins}>{c}</span>
              ))}
            </div>
          )}
          <ol className="mt-5 space-y-2.5 text-left">
            {config.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-xs font-black text-black" style={poppins}>{i + 1}</span>
                <span className="pt-0.5 text-sm font-semibold leading-snug text-white/90" style={poppins}>{s}</span>
              </li>
            ))}
          </ol>
        </motion.div>
        <button
          type="button"
          onClick={() => setStarted(true)}
          disabled={checking}
          className="mt-5 h-14 w-full rounded-[20px] bg-brand-yellow text-lg font-black uppercase tracking-wide text-black transition-all hover:brightness-105 active:translate-y-[2px] disabled:opacity-60"
          style={poppins}
        >
          {t("miniGames.start")}
        </button>
      </div>
    </div>
  );
}
