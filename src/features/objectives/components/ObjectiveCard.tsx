"use client";

import { memo } from "react";
import { motion } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "text-green-500 border-green-500/30 bg-green-500/10",
  medium: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
  hard: "text-orange-500 border-orange-500/30 bg-orange-500/10",
  expert: "text-red-500 border-red-500/30 bg-red-500/10",
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
  const progressPercent = Math.min((objective.progress / objective.target) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={`transition-all ${
          objective.completed && !isClaimed
            ? "border-primary/50 bg-primary/5"
            : isClaimed
              ? "opacity-60"
              : ""
        }`}
      >
        <CardContent className="pt-4 pb-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className={`flex size-12 items-center justify-center rounded-xl ${
                isClaimed
                  ? "bg-green-500/10"
                  : objective.completed
                    ? "bg-primary/10"
                    : "bg-secondary"
              }`}
            >
              {isClaimed ? (
                <CheckCircle2 className="size-6 text-green-500" />
              ) : (
                <IconComponent className={`size-5 ${objective.iconColor}`} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm truncate">{objective.title}</h3>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${DIFFICULTY_STYLES[objective.difficulty]}`}
                >
                  {objective.difficulty.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{objective.description}</p>
            </div>

            {objective.expiresIn && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                <Clock className="size-3" />
                {formatTimeRemaining(objective.expiresIn)}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">
                Progress: {objective.progress}/{objective.target}
              </span>
              <span className="text-xs text-primary">{progressPercent.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Rewards & Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {objective.rewards.coins && (
                <div className="flex items-center gap-1">
                  <Coins className="size-4 text-yellow-500" />
                  <span className="text-xs">{objective.rewards.coins}</span>
                </div>
              )}
              {objective.rewards.xp && (
                <div className="flex items-center gap-1">
                  <Sparkles className="size-4 text-purple-500" />
                  <span className="text-xs">{objective.rewards.xp} XP</span>
                </div>
              )}
              {objective.rewards.badge && (
                <span className="text-sm">{objective.rewards.badge}</span>
              )}
              {objective.rewards.item && (
                <div className="flex items-center gap-1">
                  <Gift className="size-4 text-pink-500" />
                  <span className="text-xs truncate max-w-[100px]">{objective.rewards.item}</span>
                </div>
              )}
            </div>

            {isClaimed ? (
              <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-500">
                <CheckCircle2 className="size-3 mr-1" />
                Claimed
              </Badge>
            ) : objective.completed ? (
              <Button size="sm" onClick={onClaim} className="h-8">
                <Gift className="size-3 mr-1.5" />
                Claim
              </Button>
            ) : (
              <Badge variant="outline" className="bg-secondary">
                <Lock className="size-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
