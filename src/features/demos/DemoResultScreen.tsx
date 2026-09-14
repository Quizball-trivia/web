"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { RotateCcw, ArrowLeft } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { colors } from "@/lib/colors";
import { SignInLink } from "@/features/marketing/public/PublicLinks";

const poppins = { fontFamily: "'Poppins', sans-serif" };

interface DemoResultScreenProps {
  title: string;
  score: number;
  isMoney?: boolean;
  onReplay: () => void;
  onExit: () => void;
  /** Public game pages: a guest round, not an investor demo — neutral labels, no "demos". */
  embedded?: boolean;
  /** Sample rounds: the primary action is the real game (sign-in for guests, straight in for members). */
  cta?: { modeId: string; returnTo: string; onBeforeLeave?: () => void };
}

const COPY = {
  en: { done: "Demo complete", round: "Round complete", saved: "money saved", score: "score", again: "Play again", demos: "Back to demos", exit: "Exit" },
  ka: { done: "დემო დასრულდა", round: "რაუნდი დასრულდა", saved: "შენახული თანხა", score: "ქულა", again: "თავიდან თამაში", demos: "დემოებზე დაბრუნება", exit: "გასვლა" },
  es: { done: "Demo completada", round: "Ronda completada", saved: "dinero conservado", score: "puntos", again: "Jugar de nuevo", demos: "Volver a las demos", exit: "Salir" },
  tr: { done: "Demo tamamlandı", round: "Tur tamamlandı", saved: "kalan para", score: "puan", again: "Tekrar oyna", demos: "Demolara dön", exit: "Çık" },
} as const;
const PLAY_REAL = { en: "Play today's real challenge", ka: "ითამაშე დღევანდელი ნამდვილი გამოწვევა", es: "Juega el reto real de hoy", tr: "Bugünün gerçek görevini oyna" } as const;

export function DemoResultScreen({ title, score, isMoney, onReplay, onExit, embedded = false, cta }: DemoResultScreenProps) {
  const { locale } = useLocale();
  const c = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const playReal = PLAY_REAL[locale as keyof typeof PLAY_REAL] ?? PLAY_REAL.en;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-[24px] bg-brand-blue p-8 text-center shadow-2xl shadow-black/40"
      >
        {/* Brand-style cup (generated in the card-icon art style), not an emoji. */}
        <Image src="/assets/brand/result-trophy.webp" alt="" width={485} height={512} className="mx-auto h-24 w-auto object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]" />
        <h2 className="mt-4 text-lg font-semibold text-white" style={poppins}>
          {title}
        </h2>
        <p className="mt-1 text-[13px] text-white/75" style={poppins}>
          {embedded ? c.round : c.done}
        </p>
        <div className="mt-5 text-4xl font-bold text-white" style={poppins}>
          {isMoney ? `$${score.toLocaleString()}` : score}
        </div>
        <p className="mt-1 text-[12px] uppercase tracking-wide text-white/70" style={poppins}>
          {isMoney ? c.saved : c.score}
        </p>
        <div className="mt-7 flex flex-col gap-3">
          {cta && (
            <span className="contents" onClickCapture={() => cta.onBeforeLeave?.()}>
            <SignInLink
              placement="sample_result"
              modeId={cta.modeId}
              returnTo={cta.returnTo}
              memberHref={cta.returnTo}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[28px] bg-brand-yellow text-sm font-semibold uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow-deep"
            >
              {playReal}
            </SignInLink>
            </span>
          )}
          <button
            type="button"
            onClick={onReplay}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[28px] text-sm font-semibold uppercase tracking-wide text-white transition-transform active:translate-y-[2px]"
            style={{ ...poppins, backgroundColor: cta ? "rgba(255,255,255,0.14)" : colors.green.base }}
          >
            <RotateCcw className="h-4 w-4" />
            {c.again}
          </button>
          <button
            type="button"
            onClick={onExit}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[28px] bg-white/14 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white/20"
            style={poppins}
          >
            <ArrowLeft className="h-4 w-4" />
            {embedded ? c.exit : c.demos}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
