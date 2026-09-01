"use client";

import { motion } from "motion/react";
import { Trophy } from "lucide-react";
import { useMiniT } from "@/features/mini-games/lib/i18n";
import type { GuessCardDailyRecord } from "./guessCardDaily";

/**
 * End-of-round / already-played result, styled to match
 * DailyChallengeCompleteModal (brand-blue card, trophy, yellow hero number),
 * leading with the score. No coin/XP copy until a backend challenge type
 * credits real rewards.
 */
export function GuessCardDailyResult({
  record,
  onDone,
  alreadyPlayed = false,
}: {
  record: GuessCardDailyRecord;
  onDone: () => void;
  alreadyPlayed?: boolean;
}) {
  const t = useMiniT();
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guess-card-result-title"
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="w-full max-w-sm overflow-y-auto rounded-[24px] bg-brand-blue p-7 text-center sm:p-8"
      >
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-white/12">
          <Trophy className="size-8 text-brand-yellow" />
        </div>

        <h2 id="guess-card-result-title" className="font-poppins text-[22px] font-semibold uppercase text-white sm:text-[26px]">
          {alreadyPlayed ? t("Today's round is done") : t("Daily complete!")}
        </h2>
        <p className="mt-1 font-poppins text-sm font-medium text-white/80">{t("FIFA Cards")}</p>

        {/* score hero */}
        <div className="mt-5 rounded-[18px] bg-black/18 px-5 py-4">
          <p className="font-poppins text-xs font-semibold uppercase tracking-wide text-white/60">
            {t("Score")}
          </p>
          <p className="mt-1 flex items-center justify-center gap-2 font-poppins text-4xl font-black leading-none text-brand-yellow">
            {record.score}
          </p>
        </div>

        <div className="mt-3 rounded-[14px] bg-black/18 px-3 py-3">
          <p className="font-poppins text-[10px] font-semibold uppercase tracking-wide text-white/55">{t("Solved")}</p>
          <p className="mt-0.5 font-poppins text-xl font-black text-white">
            {record.solved}
            <span className="text-white/50">/{record.total}</span>
          </p>
        </div>

        <p className="mt-4 font-poppins text-[11px] font-semibold text-white/50">{t("Come back tomorrow")}</p>

        <button
          type="button"
          onClick={onDone}
          className="mt-6 h-12 w-full rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow-deep"
        >
          {t("Back to challenges")}
        </button>
      </motion.div>
    </div>
  );
}
