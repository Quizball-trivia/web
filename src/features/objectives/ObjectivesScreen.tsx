"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Target, Trophy } from "lucide-react";
import { ObjectiveCard } from "./components/ObjectiveCard";
import { useObjectives } from "@/lib/queries/objectives.queries";
import type { ObjectiveCategory } from "./types";

const TABS: Array<{ value: ObjectiveCategory; label: string; icon: typeof Calendar }> = [
  { value: "daily", label: "Daily", icon: Calendar },
  { value: "weekly", label: "Weekly", icon: Clock },
];

function formatResetTime(periodEnd: string | undefined, nowMs: number): string {
  if (!periodEnd) return "--";
  const remainingMs = new Date(periodEnd).getTime() - nowMs;
  if (remainingMs <= 0) return "soon";
  const hours = Math.floor(remainingMs / 3_600_000);
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

interface ObjectivesScreenProps {
  onBack?: () => void;
}

export function ObjectivesScreen({ onBack }: ObjectivesScreenProps) {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<ObjectiveCategory>("daily");
  const { data, isLoading, isError } = useObjectives();

  // Drive a re-render every minute so the "Resets in …" countdown ticks down
  // instead of freezing at mount time.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const currentPeriod = data?.[selectedTab];
  const objectives = currentPeriod?.objectives ?? [];
  const totalCompleted = useMemo(() => {
    if (!data) return 0;
    return data.daily.completedCount + data.weekly.completedCount;
  }, [data]);
  const totalObjectives = useMemo(() => {
    if (!data) return 0;
    return data.daily.totalCount + data.weekly.totalCount;
  }, [data]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  return (
    <div className="min-h-full bg-surface-page-alt font-fun text-white">
      <div className="sticky top-0 z-20 border-b border-white/8 bg-surface-page-alt/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              aria-label="Back"
              onClick={handleBack}
              className="flex size-10 items-center justify-center rounded-[8px] bg-surface-card text-white ring-1 ring-white/8 transition-colors hover:bg-surface-card-tint"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Target className="size-5 text-brand-cyan" />
                <h1 className="text-lg font-black uppercase tracking-wide md:text-2xl">
                  Objectives
                </h1>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-brand-slate">
                Complete match goals to earn coins and XP automatically.
              </p>
            </div>
          </div>

          <div className="hidden rounded-full border border-brand-yellow/30 bg-brand-yellow/10 px-3 py-1.5 text-xs font-black uppercase text-brand-yellow md:flex md:items-center md:gap-1.5">
            <Trophy className="size-4" />
            {totalCompleted}/{totalObjectives}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-5 md:py-7">
        <section className="rounded-[8px] border border-white/8 bg-surface-card p-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-brand-slate">
                Current set
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">
                  {currentPeriod?.completedCount ?? 0}
                </span>
                <span className="text-lg font-black text-brand-slate">
                  /{currentPeriod?.totalCount ?? 0}
                </span>
              </div>
            </div>
            <div className="rounded-[8px] bg-surface-deep px-3 py-2 text-sm font-black uppercase text-brand-cyan">
              Resets in {formatResetTime(currentPeriod?.periodEnd, nowMs)}
            </div>
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-[8px] bg-surface-card p-1">
          {TABS.map((tab) => {
            const isActive = selectedTab === tab.value;
            const count = data?.[tab.value]?.completedCount ?? 0;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedTab(tab.value)}
                className={
                  isActive
                    ? "flex items-center justify-center gap-2 rounded-[7px] bg-brand-cyan px-3 py-2.5 text-sm font-black uppercase text-surface-page"
                    : "flex items-center justify-center gap-2 rounded-[7px] px-3 py-2.5 text-sm font-black uppercase text-brand-slate transition-colors hover:bg-surface-card-tint hover:text-white"
                }
              >
                <tab.icon className="size-4" />
                {tab.label}
                <span className={isActive ? "text-surface-page/70" : "text-brand-slate-light"}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <section className="mt-4 space-y-3 pb-8">
          {isLoading && (
            <div className="rounded-[8px] border border-white/8 bg-surface-card p-6 text-sm font-bold text-brand-slate">
              Loading objectives...
            </div>
          )}
          {isError && (
            <div className="rounded-[8px] border border-brand-red-soft/30 bg-brand-red-soft/10 p-6 text-sm font-bold text-brand-red-soft">
              Could not load objectives. Try refreshing.
            </div>
          )}
          {!isLoading && !isError && objectives.length === 0 && (
            <div className="rounded-[8px] border border-white/8 bg-surface-card p-6 text-sm font-bold text-brand-slate">
              No objectives available.
            </div>
          )}
          {objectives.map((objective, index) => (
            <ObjectiveCard key={objective.id} objective={objective} index={index} />
          ))}
        </section>
      </main>
    </div>
  );
}
