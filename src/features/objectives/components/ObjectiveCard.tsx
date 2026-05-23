"use client";

/* eslint-disable @next/next/no-img-element -- Brand PNGs need raw img sizing. */

import { memo } from "react";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import type { Objective } from "../types";
import { useLocale } from "@/contexts/LocaleContext";
import { getI18nText } from "@/lib/utils/i18n";

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

interface ObjectiveCardProps {
  objective: Objective;
  index: number;
}

export const ObjectiveCard = memo(function ObjectiveCard({
  objective,
  index,
}: ObjectiveCardProps) {
  const { locale } = useLocale();
  const progressPercent = objective.target > 0
    ? Math.min(100, Math.round((objective.progress / objective.target) * 100))
    : 0;
  const completed = objective.completed;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03 }}
      className="rounded-[14px] border-2 border-brand-green"
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5 md:gap-3 md:px-4 md:py-3">
        <div className="flex size-8 shrink-0 items-center justify-center md:size-10">
          {completed ? (
            <CheckCircle2 className="size-6 text-brand-green-light" />
          ) : (
            <img src="/assets/obj_icon.png" alt="" className="size-full object-contain" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className="truncate uppercase text-white"
            style={{ ...poppins, fontSize: "clamp(12px, 1.5vw, 14px)" }}
          >
            {getI18nText(objective.title, locale)}
          </h3>
          <p
            className="mt-0.5 truncate uppercase text-white/50"
            style={{ ...poppins, fontSize: "clamp(9px, 1.1vw, 10px)", fontWeight: 500 }}
          >
            {getI18nText(objective.description, locale)}
          </p>
        </div>

        <div className="hidden min-w-0 flex-[2] md:block">
          <div className="flex items-baseline justify-between gap-2">
            <span className="tabular-nums text-white" style={{ ...poppins, fontSize: 13 }}>
              {progressPercent}%
            </span>
            <span className="tabular-nums text-white" style={{ ...poppins, fontSize: 13 }}>
              {objective.progress}/{objective.target}
            </span>
          </div>
          <div className="mt-1 h-4 overflow-hidden rounded-[12px] bg-brand-green-deep/50">
            <div
              className="h-full rounded-[12px] bg-brand-green"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5 pl-1">
          <div className="flex items-center gap-1">
            <span className="tabular-nums text-white" style={{ ...poppins, fontSize: 12 }}>
              {objective.rewardCoins}
            </span>
            <img src="/assets/coin-1.png" alt="" className="size-4 object-contain" />
          </div>
          <span className="tabular-nums text-white" style={{ ...poppins, fontSize: 11 }}>
            {objective.rewardXp} XP
          </span>
        </div>
      </div>

      <div className="px-3 pb-2.5 md:hidden">
        <div className="flex items-baseline justify-between gap-2">
          <span className="tabular-nums text-white" style={{ ...poppins, fontSize: 11 }}>
            {progressPercent}%
          </span>
          <span className="tabular-nums text-white" style={{ ...poppins, fontSize: 11 }}>
            {objective.progress}/{objective.target}
          </span>
        </div>
        <div className="mt-1 h-3 overflow-hidden rounded-[10px] bg-brand-green-deep/50">
          <div
            className="h-full rounded-[10px] bg-brand-green"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </motion.article>
  );
});
