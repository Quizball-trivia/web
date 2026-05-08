"use client";

import { memo } from "react";
import { motion } from 'motion/react';

import {
  Coins,
  Sparkles,
  Gift,
  Lock,
  CheckCircle2,
  Clock,
  Zap,
  Flame,
  Users,
  Target,
  Swords,
  TrendingUp,
  Brain,
  Timer,
  Crown,
  Trophy,
  Star,
  Award,
} from "lucide-react";

import type { Objective } from "../types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  zap: Zap,
  flame: Flame,
  users: Users,
  target: Target,
  swords: Swords,
  trendingUp: TrendingUp,
  brain: Brain,
  timer: Timer,
  crown: Crown,
  trophy: Trophy,
  star: Star,
  award: Award,
  coins: Coins,
};

const DIFFICULTY_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  easy: { text: "text-brand-green-light", bg: "bg-brand-green-light/10", border: "border-brand-green-light/30" },
  medium: { text: "text-brand-gold", bg: "bg-brand-gold/10", border: "border-brand-gold/30" },
  hard: { text: "text-brand-orange", bg: "bg-brand-orange/10", border: "border-brand-orange/30" },
  expert: { text: "text-brand-red-soft", bg: "bg-brand-red-soft/10", border: "border-brand-red-soft/30" },
};

const ICON_COLOR_MAP: Record<string, string> = {
  "text-yellow-500": "text-brand-gold",
  "text-orange-500": "text-brand-orange",
  "text-blue-500": "text-brand-cyan",
  "text-red-500": "text-brand-red-soft",
  "text-purple-500": "text-brand-purple",
  "text-cyan-500": "text-brand-cyan",
  "text-green-500": "text-brand-green-light",
  "text-primary": "text-brand-cyan",
};

interface ObjectiveCardProps {
  objective: Objective;
  isClaimed: boolean;
  onClaim: () => void;
  index: number;
}

function formatTimeRemaining(milliseconds?: number): string {
  if (!milliseconds) return "";

  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export const ObjectiveCard = memo(function ObjectiveCard({
  objective,
  isClaimed,
  onClaim,
  index,
}: ObjectiveCardProps) {
  const IconComponent = ICON_MAP[objective.icon] || Target;
  const progressPercent = objective.target > 0 ? Math.min((objective.progress / objective.target) * 100, 100) : 0;
  const difficulty = DIFFICULTY_STYLES[objective.difficulty] || DIFFICULTY_STYLES.easy;
  const iconColor = ICON_COLOR_MAP[objective.iconColor] || objective.iconColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <div
        className={`rounded-2xl border-b-4 transition-all overflow-hidden ${
          isClaimed
            ? "bg-surface-card/60 border-b-[#58CC02]/50 opacity-70"
            : objective.completed
              ? "bg-surface-card border-b-[#58CC02]"
              : "bg-surface-card border-b-[#243B44]"
        }`}
      >
        <div className="p-3.5 md:p-5">
          {/* Header */}
          <div className="flex items-start gap-3 md:gap-4 mb-3">
            <div
              className={`flex size-12 md:size-14 items-center justify-center rounded-xl md:rounded-2xl border-2 shrink-0 ${
                isClaimed
                  ? "bg-brand-green-light/20 border-brand-green-light/40"
                  : objective.completed
                    ? "bg-brand-green-light/20 border-brand-green-light/40"
                    : "bg-surface-card-tint border-surface-card-tint"
              }`}
            >
              {isClaimed ? (
                <CheckCircle2 className="size-6 md:size-7 text-brand-green-light" />
              ) : (
                <IconComponent className={`size-5 md:size-6 ${iconColor}`} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm md:text-base font-black text-white uppercase truncate">{objective.title}</h3>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${difficulty.text} ${difficulty.bg} ${difficulty.border} uppercase shrink-0`}
                >
                  {objective.difficulty}
                </span>
              </div>
              <p className="text-xs md:text-sm text-brand-slate font-semibold">{objective.description}</p>
            </div>

            {objective.expiresIn && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-brand-slate shrink-0 bg-surface-card-tint px-2 py-1 rounded-full">
                <Clock className="size-3" />
                {formatTimeRemaining(objective.expiresIn)}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="bg-surface-deep rounded-xl border-b-[3px] border-surface-card-deep p-2 md:p-2.5 mb-3">
            <div className="relative h-2.5 md:h-3 bg-surface-card-tint rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 + index * 0.05 }}
                className={`absolute inset-y-0 left-0 rounded-full ${
                  objective.completed
                    ? "bg-gradient-to-r from-brand-green-light to-[#85E000]"
                    : "bg-gradient-to-r from-brand-purple to-[#E0A8FF]"
                }`}
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent h-1/2" />
              </motion.div>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] md:text-xs font-black text-brand-slate">
                <span className={objective.completed ? "text-brand-green-light" : "text-brand-purple"}>{objective.progress}</span>/{objective.target}
              </span>
              <span className={`text-[10px] md:text-xs font-black ${objective.completed ? "text-brand-green-light" : "text-brand-purple"}`}>
                {progressPercent.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Rewards & Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              {objective.rewards.coins && (
                <span className="flex items-center gap-1 text-[11px] md:text-xs font-black px-2.5 py-0.5 rounded-full bg-brand-gold/15 border border-brand-gold/30 text-brand-gold">
                  <Coins className="size-3.5" />
                  {objective.rewards.coins}
                </span>
              )}
              {objective.rewards.xp && (
                <span className="flex items-center gap-1 text-[11px] md:text-xs font-black px-2.5 py-0.5 rounded-full bg-brand-purple/15 border border-brand-purple/30 text-brand-purple">
                  <Sparkles className="size-3.5" />
                  {objective.rewards.xp} XP
                </span>
              )}
              {objective.rewards.badge && (
                <span className="text-sm">{objective.rewards.badge}</span>
              )}
              {objective.rewards.item && (
                <span className="flex items-center gap-1 text-[11px] md:text-xs font-black px-2.5 py-0.5 rounded-full bg-brand-orange/15 border border-brand-orange/30 text-brand-orange">
                  <Gift className="size-3.5" />
                  <span className="truncate max-w-[80px]">{objective.rewards.item}</span>
                </span>
              )}
            </div>

            {isClaimed ? (
              <div className="px-4 py-2 md:px-5 md:py-2.5 rounded-xl bg-brand-green-light/20 border-b-[3px] border-brand-green-light/30 shrink-0">
                <span className="flex items-center gap-1 text-xs font-black text-brand-green-light uppercase">
                  <CheckCircle2 className="size-3.5" />
                  Claimed
                </span>
              </div>
            ) : objective.completed ? (
              <button
                onClick={onClaim}
                className="px-5 py-2.5 md:px-6 md:py-3 rounded-xl bg-brand-green-light border-b-4 border-brand-green text-white font-black text-xs md:text-sm uppercase tracking-wide hover:bg-brand-green-light active:border-b-2 active:translate-y-[2px] transition-all shrink-0"
              >
                <Gift className="size-3.5 inline-block mr-1.5" />
                Claim
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-surface-card-tint border-b-[3px] border-surface-card shrink-0">
                <span className="flex items-center gap-1 text-[11px] font-black text-brand-slate uppercase">
                  <Lock className="size-3" />
                  Locked
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
