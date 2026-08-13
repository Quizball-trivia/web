"use client";

import { motion } from "motion/react";
import { RotateCcw, ArrowLeft } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { colors } from "@/lib/colors";

const poppins = { fontFamily: "'Poppins', sans-serif" };

interface DemoResultScreenProps {
  title: string;
  score: number;
  isMoney?: boolean;
  onReplay: () => void;
  onExit: () => void;
}

export function DemoResultScreen({ title, score, isMoney, onReplay, onExit }: DemoResultScreenProps) {
  const { locale } = useLocale();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-page px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-[16px] p-8 text-center"
        style={{ backgroundColor: colors.surface.card }}
      >
        <div className="text-5xl">🏆</div>
        <h2 className="mt-4 text-lg font-semibold text-white" style={poppins}>
          {title}
        </h2>
        <p className="mt-1 text-[13px] text-white/60" style={poppins}>
          {locale === "ka" ? "დემო დასრულდა" : "Demo complete"}
        </p>
        <div className="mt-5 text-4xl font-bold text-white" style={poppins}>
          {isMoney ? `$${score.toLocaleString()}` : score}
        </div>
        <p className="mt-1 text-[12px] uppercase tracking-wide text-white/50" style={poppins}>
          {isMoney
            ? locale === "ka"
              ? "შენახული თანხა"
              : "money saved"
            : locale === "ka"
              ? "ქულა"
              : "score"}
        </p>
        <div className="mt-7 flex flex-col gap-3">
          <button
            type="button"
            onClick={onReplay}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[28px] text-sm font-semibold uppercase tracking-wide text-white transition-transform active:translate-y-[2px]"
            style={{ ...poppins, backgroundColor: colors.green.base }}
          >
            <RotateCcw className="h-4 w-4" />
            {locale === "ka" ? "თავიდან თამაში" : "Play again"}
          </button>
          <button
            type="button"
            onClick={onExit}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[28px] bg-white/10 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white/15"
            style={poppins}
          >
            <ArrowLeft className="h-4 w-4" />
            {locale === "ka" ? "დემოებზე დაბრუნება" : "Back to demos"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
