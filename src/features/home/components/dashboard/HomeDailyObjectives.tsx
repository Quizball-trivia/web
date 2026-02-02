"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  ArrowRight,
  Gift,
  CheckCircle2,
  Zap,
  Flame,
  Users,
  Coins,
} from "lucide-react";

import { generateObjectives } from "@/features/objectives/data/mockObjectives";
import type { Objective, PlayerProgress } from "@/features/objectives/types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  zap: Zap,
  flame: Flame,
  users: Users,
  target: Target,
};

interface HomeDailyObjectivesProps {
  playerProgress: PlayerProgress;
}

export function HomeDailyObjectives({ playerProgress }: HomeDailyObjectivesProps) {
  const router = useRouter();
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

  const dailyObjectives = useMemo(() => {
    const all = generateObjectives(playerProgress);
    return all
      .filter((obj) => obj.category === "daily")
      .sort((a, b) => {
        // Prioritize: claimable > in-progress > locked
        const aClaimable = a.completed && !claimedIds.has(a.id);
        const bClaimable = b.completed && !claimedIds.has(b.id);
        if (aClaimable && !bClaimable) return -1;
        if (!aClaimable && bClaimable) return 1;
        // Then by progress percentage
        const aProgress = a.progress / a.target;
        const bProgress = b.progress / b.target;
        return bProgress - aProgress;
      })
      .slice(0, 3);
  }, [playerProgress, claimedIds]);

  const claimableCount = useMemo(() => {
    const all = generateObjectives(playerProgress);
    return all.filter(
      (obj) => obj.category === "daily" && obj.completed && !claimedIds.has(obj.id)
    ).length;
  }, [playerProgress, claimedIds]);

  const handleClaim = useCallback((objective: Objective) => {
    setClaimedIds((prev) => new Set([...prev, objective.id]));
    // TODO: Call API to claim reward
  }, []);

  return (
    <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <Target className="size-4" />
            </div>
            Daily Objectives
          </CardTitle>
          {claimableCount > 0 && (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
              {claimableCount} Ready
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {dailyObjectives.map((objective) => {
          const IconComponent = ICON_MAP[objective.icon] || Target;
          const isClaimed = claimedIds.has(objective.id);
          const progressPercent = Math.min(
            (objective.progress / objective.target) * 100,
            100
          );

          return (
            <div
              key={objective.id}
              className={`p-3 rounded-lg border transition-all ${
                objective.completed && !isClaimed
                  ? "bg-green-500/5 border-green-500/30"
                  : isClaimed
                    ? "opacity-50 bg-secondary/30 border-border/30"
                    : "bg-secondary/30 border-border/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isClaimed
                      ? "bg-green-500/10"
                      : objective.completed
                        ? "bg-green-500/10"
                        : "bg-secondary"
                  }`}
                >
                  {isClaimed ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <IconComponent className={`size-4 ${objective.iconColor}`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{objective.title}</p>
                    {objective.rewards.coins && (
                      <div className="flex items-center gap-1 text-xs text-yellow-500 shrink-0">
                        <Coins className="size-3" />
                        {objective.rewards.coins}
                      </div>
                    )}
                  </div>

                  <div className="mt-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">
                        {objective.progress}/{objective.target}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {progressPercent.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-1.5" />
                  </div>

                  {objective.completed && !isClaimed && (
                    <Button
                      size="sm"
                      onClick={() => handleClaim(objective)}
                      className="mt-2 h-7 text-xs w-full"
                    >
                      <Gift className="size-3 mr-1" />
                      Claim Reward
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-primary"
          onClick={() => router.push("/objectives")}
        >
          View All Objectives
          <ArrowRight className="size-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
