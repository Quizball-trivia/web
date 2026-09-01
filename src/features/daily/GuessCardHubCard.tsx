"use client";

import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useLocale } from "@/contexts/LocaleContext";
import { useMiniT } from "@/features/mini-games/lib/i18n";
import { DAILY_MAX_COINS, DAILY_XP_REWARD } from "./guessCardDaily";

/**
 * Hub tile for the frontend-only Guess-the-Card daily. Mirrors ChallengeCard's
 * styling but is driven by client state (localStorage) instead of a backend
 * DailyChallengeMetadata row, so it can't reuse ChallengeCard directly.
 */
export function GuessCardHubCard({
  index,
  completedToday,
  earnedCoins,
  onClick,
}: {
  index: number;
  completedToday: boolean;
  earnedCoins: number;
  onClick: () => void;
}) {
  const { t } = useLocale();
  const mt = useMiniT();
  const isCompleted = completedToday;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 + index * 0.04, ease: "easeOut" }}
      className="relative flex h-full"
    >
      <button
        type="button"
        onClick={onClick}
        className={`relative flex min-h-[184px] w-full flex-col overflow-hidden rounded-[8px] p-3.5 pb-3.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow md:flex md:min-h-[268px] md:flex-col md:rounded-[20px] md:p-6 ${
          isCompleted
            ? "border-2 border-brand-green-light bg-brand-green-darkest text-white shadow-[0_0_0_3px_hsl(var(--brand-green-light)/0.16)] md:border-2 md:shadow-[0_0_0_4px_hsl(var(--brand-green-light)/0.16)]"
            : "bg-brand-yellow text-black pb-10 hover:brightness-105 active:translate-y-[2px] md:pb-6"
        }`}
      >
        {isCompleted ? (
          <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-brand-green-light p-1 text-[11px] font-black uppercase tracking-wide text-white md:left-3 md:top-3 md:px-3 md:py-1">
            <CheckCircle2 className="size-3 md:size-3.5" />
            <span className="hidden md:inline">{t("dailyGames.hubCompleted")}</span>
          </div>
        ) : null}

        <h3 className={`font-poppins flex min-h-[2.1rem] items-start justify-center px-7 text-center text-[16px] uppercase leading-[1.1] md:min-h-[3.5rem] md:px-0 md:text-[28px] md:mt-2 md:leading-[0.95] ${isCompleted ? "text-white md:mt-8" : "text-black"}`}>
          {mt("Guess the Card")}
        </h3>
        <p className={`mt-3 mb-4 text-center text-[10px] font-bold leading-snug [word-spacing:0.1em] md:mt-5 md:mb-6 md:text-[18px] md:font-semibold md:leading-snug md:px-4 md:[word-spacing:normal] ${isCompleted ? "text-white/75 md:text-white/80" : "text-black/80"}`}>
          {mt("A gold card, stats only — name the player across 10 editions.")}
        </p>

        {!isCompleted ? (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 md:hidden">
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-white/70 px-2.5 text-[10px] font-black text-brand-gold-ink">
              {DAILY_MAX_COINS}
              <Image src="/assets/coin-1.png?v=2" alt="" width={16} height={16} className="size-4 object-contain" />
            </span>
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-brand-green-light px-2.5 text-[10px] font-black text-white">
              {DAILY_XP_REWARD} XP
            </span>
          </div>
        ) : null}
        {!isCompleted ? (
          <div className="mt-auto mb-3 hidden w-full items-center justify-between gap-2 md:flex">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/70 px-3.5 text-[16px] font-black tabular-nums text-brand-gold-ink">
              {DAILY_MAX_COINS}
              <Image src="/assets/coin-1.png?v=2" alt="" width={20} height={20} className="size-5 object-contain" />
            </span>
            <span className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-green-light px-3.5 text-[16px] font-black text-white">
              {DAILY_XP_REWARD} XP
            </span>
          </div>
        ) : null}

        <div className={`justify-center ${isCompleted ? "mt-auto flex" : "hidden md:flex"}`}>
          <span className={`font-poppins inline-flex h-[34px] min-w-[120px] items-center justify-center rounded-[14px] px-5 text-[15px] uppercase tracking-wide md:h-[50px] md:min-w-[200px] md:rounded-[20px] md:px-8 md:text-[24px] ${
            isCompleted ? "bg-white text-brand-green-darkest" : "bg-black text-white"
          }`}>
            {isCompleted ? `+${earnedCoins}` : t("dailyGames.hubPlay")}
          </span>
        </div>
      </button>
    </motion.div>
  );
}
