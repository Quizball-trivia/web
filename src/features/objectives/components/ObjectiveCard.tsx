"use client";

import { memo } from "react";
import { motion } from "motion/react";
import {
  Brain,
  CalendarCheck,
  CheckCircle2,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  Goal,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import type { Objective } from "../types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  CalendarCheck,
  CheckCircle2,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  Goal,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
};

interface ObjectiveCardProps {
  objective: Objective;
  index: number;
}

export const ObjectiveCard = memo(function ObjectiveCard({
  objective,
  index,
}: ObjectiveCardProps) {
  const IconComponent = ICON_MAP[objective.icon] ?? Target;
  const progressPercent = objective.target > 0
    ? Math.min(100, Math.round((objective.progress / objective.target) * 100))
    : 0;
  const completed = objective.completed;
  const categoryLabel = objective.metadata?.leadingCategoryName;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.035 }}
      className="rounded-[8px] border border-white/8 bg-surface-card shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
    >
      <div className="flex gap-3 p-4 md:gap-4 md:p-5">
        <div
          className={
            completed
              ? "flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-brand-green-light/15 text-brand-green-light ring-1 ring-brand-green-light/35 md:size-12"
              : "flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-surface-card-tint text-brand-cyan ring-1 ring-white/8 md:size-12"
          }
        >
          {completed ? (
            <CheckCircle2 className="size-5 md:size-6" />
          ) : (
            <IconComponent className="size-5 md:size-6" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black uppercase tracking-wide text-white md:text-base">
                {objective.title}
              </h3>
              <p className="mt-1 text-xs font-semibold leading-snug text-brand-slate md:text-sm">
                {categoryLabel ? `${objective.description} Current: ${categoryLabel}.` : objective.description}
              </p>
            </div>

            <span
              className={
                completed
                  ? "rounded-full border border-brand-green-light/30 bg-brand-green-light/15 px-2.5 py-1 text-[10px] font-black uppercase text-brand-green-light"
                  : "rounded-full border border-brand-cyan/25 bg-brand-cyan/10 px-2.5 py-1 text-[10px] font-black uppercase text-brand-cyan"
              }
            >
              {completed ? "Reward earned" : `${progressPercent}%`}
            </span>
          </div>

          <div className="mt-4 rounded-[8px] bg-surface-deep p-2.5">
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-card-tint">
              <div
                className={completed ? "h-full rounded-full bg-brand-green-light" : "h-full rounded-full bg-brand-cyan"}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-black uppercase">
              <span className={completed ? "text-brand-green-light" : "text-white"}>
                {objective.progress}/{objective.target}
              </span>
              <div className="flex items-center gap-2 text-brand-slate">
                <span className="inline-flex items-center gap-1 text-brand-yellow">
                  <Coins className="size-3.5" />
                  {objective.rewardCoins}
                </span>
                <span className="inline-flex items-center gap-1 text-brand-purple">
                  <Sparkles className="size-3.5" />
                  {objective.rewardXp} XP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
});
