"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Coins, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useObjectives } from "@/lib/queries/objectives.queries";
import type { Objective } from "@/features/objectives/types";
import type { PlayerProgress } from "@/features/objectives/types";
import { useLocale } from "@/contexts/LocaleContext";
import { getI18nText } from "@/lib/utils/i18n";

interface HomeDailyObjectivesProps {
  playerProgress?: PlayerProgress;
}

function sortObjectives(a: Objective, b: Objective) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  const aPct = a.target > 0 ? a.progress / a.target : 0;
  const bPct = b.target > 0 ? b.progress / b.target : 0;
  return bPct - aPct;
}

export function HomeDailyObjectives(props: HomeDailyObjectivesProps) {
  void props.playerProgress;
  const { t, locale } = useLocale();
  const router = useRouter();
  const { data, isLoading } = useObjectives();

  const dailyObjectives = useMemo(() => {
    return [...(data?.daily.objectives ?? [])]
      .sort(sortObjectives)
      .slice(0, 3);
  }, [data]);

  return (
    <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="rounded-[8px] bg-brand-cyan/10 p-2 text-brand-cyan ring-1 ring-brand-cyan/20">
              <Target className="size-4" />
            </span>
            {t("homeDashboard.dailyObjectives")}
          </CardTitle>
          {data && (
            <span className="rounded-full border border-brand-green-light/30 bg-brand-green-light/10 px-2.5 py-1 text-[10px] font-black uppercase text-brand-green-light">
              {data.daily.completedCount}/{data.daily.totalCount}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="rounded-[8px] bg-secondary/30 p-3 text-sm font-semibold text-muted-foreground">
            {t("home.objectives")}...
          </div>
        )}

        {dailyObjectives.map((objective) => {
          const progressPercent = objective.target > 0
            ? Math.min((objective.progress / objective.target) * 100, 100)
            : 0;

          return (
            <div
              key={objective.id}
              className={
                objective.completed
                  ? "rounded-[8px] border border-brand-green-light/25 bg-brand-green-light/10 p-3"
                  : "rounded-[8px] border border-border/50 bg-secondary/30 p-3"
              }
            >
              <div className="flex items-start gap-3">
                <div
                  className={
                    objective.completed
                      ? "rounded-[8px] bg-brand-green-light/15 p-1.5 text-brand-green-light"
                      : "rounded-[8px] bg-brand-cyan/10 p-1.5 text-brand-cyan"
                  }
                >
                  {objective.completed ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Target className="size-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold">{getI18nText(objective.title, locale)}</p>
                    <div className="flex shrink-0 items-center gap-1 text-xs font-black text-brand-yellow">
                      <Coins className="size-3" />
                      {objective.rewardCoins}
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                      <span>{Math.round(progressPercent)}%</span>
                      <span>{objective.progress}/{objective.target}</span>
                    </div>
                    <Progress value={progressPercent} className="h-1.5" />
                  </div>
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
          {t("homeDashboard.viewAllObjectives")}
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
