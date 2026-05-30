"use client";

import { motion } from "motion/react";
import { Trophy } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

interface DailyChallengeCompleteModalProps {
  open: boolean;
  title: string;
  correct: number;
  total: number;
  onDone: () => void;
}

export function DailyChallengeCompleteModal({
  open,
  title,
  correct,
  total,
  onDone,
}: DailyChallengeCompleteModalProps) {
  const { t } = useLocale();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="w-full max-w-sm rounded-[24px] bg-brand-blue p-7 text-center sm:p-8"
      >
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-white/12">
          <Trophy className="size-8 text-brand-yellow" />
        </div>

        <h2 className="font-poppins text-[22px] font-semibold uppercase text-white sm:text-[26px]">
          {t("dailyGames.challengeComplete")}
        </h2>
        <p className="mt-1 font-poppins text-sm font-medium text-white/80">{title}</p>

        <div className="mt-5 rounded-[18px] bg-black/18 px-5 py-4">
          <p className="font-poppins text-xs font-semibold uppercase tracking-wide text-white/60">
            {t("dailyGames.correctAnswers")}
          </p>
          <p className="mt-1 font-poppins text-4xl font-black leading-none text-brand-yellow">
            {correct}
            <span className="text-white/55"> / {total}</span>
          </p>
        </div>

        <p className="mt-4 font-poppins text-sm font-semibold text-white">
          {t("dailyGames.completionGreat")}
        </p>

        <button
          type="button"
          onClick={onDone}
          className="mt-6 h-12 w-full rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow-deep"
        >
          {t("dailyGames.backToChallenges")}
        </button>
      </motion.div>
    </div>
  );
}
