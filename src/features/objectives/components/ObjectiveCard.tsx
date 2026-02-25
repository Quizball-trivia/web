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
  easy: { text: "text-[#58CC02]", bg: "bg-[#58CC02]/10", border: "border-[#58CC02]/30" },
  medium: { text: "text-[#FFD700]", bg: "bg-[#FFD700]/10", border: "border-[#FFD700]/30" },
  hard: { text: "text-[#FF9600]", bg: "bg-[#FF9600]/10", border: "border-[#FF9600]/30" },
  expert: { text: "text-[#FF4B4B]", bg: "bg-[#FF4B4B]/10", border: "border-[#FF4B4B]/30" },
};

const ICON_COLOR_MAP: Record<string, string> = {
  "text-yellow-500": "text-[#FFD700]",
  "text-orange-500": "text-[#FF9600]",
  "text-blue-500": "text-[#1CB0F6]",
  "text-red-500": "text-[#FF4B4B]",
  "text-purple-500": "text-[#CE82FF]",
  "text-cyan-500": "text-[#1CB0F6]",
  "text-green-500": "text-[#58CC02]",
  "text-primary": "text-[#1CB0F6]",
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
            ? "bg-[#1B2F36]/60 border-b-[#58CC02]/50 opacity-70"
            : objective.completed
              ? "bg-[#1B2F36] border-b-[#58CC02]"
              : "bg-[#1B2F36] border-b-[#243B44]"
        }`}
      >
        <div className="p-3.5 md:p-5">
          {/* Header */}
          <div className="flex items-start gap-3 md:gap-4 mb-3">
            <div
              className={`flex size-12 md:size-14 items-center justify-center rounded-xl md:rounded-2xl border-2 shrink-0 ${
                isClaimed
                  ? "bg-[#58CC02]/20 border-[#58CC02]/40"
                  : objective.completed
                    ? "bg-[#58CC02]/20 border-[#58CC02]/40"
                    : "bg-[#243B44] border-[#243B44]"
              }`}
            >
              {isClaimed ? (
                <CheckCircle2 className="size-6 md:size-7 text-[#58CC02]" />
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
              <p className="text-xs md:text-sm text-[#56707A] font-semibold">{objective.description}</p>
            </div>

            {objective.expiresIn && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-[#56707A] shrink-0 bg-[#243B44] px-2 py-1 rounded-full">
                <Clock className="size-3" />
                {formatTimeRemaining(objective.expiresIn)}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="bg-[#131F24] rounded-xl border-b-[3px] border-[#0D1B21] p-2 md:p-2.5 mb-3">
            <div className="relative h-2.5 md:h-3 bg-[#243B44] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 + index * 0.05 }}
                className={`absolute inset-y-0 left-0 rounded-full ${
                  objective.completed
                    ? "bg-gradient-to-r from-[#58CC02] to-[#85E000]"
                    : "bg-gradient-to-r from-[#CE82FF] to-[#E0A8FF]"
                }`}
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent h-1/2" />
              </motion.div>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] md:text-xs font-black text-[#56707A]">
                <span className={objective.completed ? "text-[#58CC02]" : "text-[#CE82FF]"}>{objective.progress}</span>/{objective.target}
              </span>
              <span className={`text-[10px] md:text-xs font-black ${objective.completed ? "text-[#58CC02]" : "text-[#CE82FF]"}`}>
                {progressPercent.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Rewards & Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              {objective.rewards.coins && (
                <span className="flex items-center gap-1 text-[11px] md:text-xs font-black px-2.5 py-0.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/30 text-[#FFD700]">
                  <Coins className="size-3.5" />
                  {objective.rewards.coins}
                </span>
              )}
              {objective.rewards.xp && (
                <span className="flex items-center gap-1 text-[11px] md:text-xs font-black px-2.5 py-0.5 rounded-full bg-[#CE82FF]/15 border border-[#CE82FF]/30 text-[#CE82FF]">
                  <Sparkles className="size-3.5" />
                  {objective.rewards.xp} XP
                </span>
              )}
              {objective.rewards.badge && (
                <span className="text-sm">{objective.rewards.badge}</span>
              )}
              {objective.rewards.item && (
                <span className="flex items-center gap-1 text-[11px] md:text-xs font-black px-2.5 py-0.5 rounded-full bg-[#FF9600]/15 border border-[#FF9600]/30 text-[#FF9600]">
                  <Gift className="size-3.5" />
                  <span className="truncate max-w-[80px]">{objective.rewards.item}</span>
                </span>
              )}
            </div>

            {isClaimed ? (
              <div className="px-4 py-2 md:px-5 md:py-2.5 rounded-xl bg-[#58CC02]/20 border-b-[3px] border-[#58CC02]/30 shrink-0">
                <span className="flex items-center gap-1 text-xs font-black text-[#58CC02] uppercase">
                  <CheckCircle2 className="size-3.5" />
                  Claimed
                </span>
              </div>
            ) : objective.completed ? (
              <button
                onClick={onClaim}
                className="px-5 py-2.5 md:px-6 md:py-3 rounded-xl bg-[#58CC02] border-b-4 border-[#46A302] text-white font-black text-xs md:text-sm uppercase tracking-wide hover:bg-[#61D806] active:border-b-2 active:translate-y-[2px] transition-all shrink-0"
              >
                <Gift className="size-3.5 inline-block mr-1.5" />
                Claim
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-[#243B44] border-b-[3px] border-[#1B2F36] shrink-0">
                <span className="flex items-center gap-1 text-[11px] font-black text-[#56707A] uppercase">
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
