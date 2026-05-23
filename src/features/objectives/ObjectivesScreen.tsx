"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ObjectiveCard } from "./components/ObjectiveCard";
import { useObjectives } from "@/lib/queries/objectives.queries";
import type { ObjectiveCategory } from "./types";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";

const TABS: Array<{ value: ObjectiveCategory; labelKey: MessageKey }> = [
  { value: "daily", labelKey: "objectives.tabDaily" },
  { value: "weekly", labelKey: "objectives.tabWeekly" },
];

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

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
  return `${hours}h ${minutes}min`;
}

interface ObjectivesScreenProps {
  onBack?: () => void;
}

export function ObjectivesScreen({ onBack }: ObjectivesScreenProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<ObjectiveCategory>("daily");
  const { data, isLoading, isError } = useObjectives();

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
    <div className="min-h-full text-white">
      <div className="mx-auto max-w-5xl px-4 py-4 md:px-6 md:py-6">
        <button
          aria-label={t("objectives.back")}
          onClick={handleBack}
          className="-ml-1 flex size-8 items-center justify-center rounded-[8px] text-white transition-colors hover:bg-white/10"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1
              className="uppercase text-white"
              style={{ ...poppins, fontSize: "clamp(22px, 4vw, 36px)", lineHeight: 1 }}
            >
              {t("objectives.title")}
            </h1>
            <p
              className="mt-1 uppercase text-white/50"
              style={{ ...poppins, fontSize: "clamp(10px, 1.1vw, 12px)", fontWeight: 500 }}
            >
              {t("objectives.subtitle")}
            </p>
          </div>

          <span
            className="inline-flex items-center rounded-[14px] bg-brand-green px-3 py-1 uppercase text-white tabular-nums"
            style={{ ...poppins, fontSize: "clamp(11px, 1.1vw, 13px)" }}
          >
            {totalCompleted}/{totalObjectives}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:mt-5 md:flex-row md:items-center md:gap-4">
          <div className="flex-1">
            <div className="rounded-[18px] border-2 border-brand-green p-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                {TABS.map((tab) => {
                  const isActive = selectedTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setSelectedTab(tab.value)}
                      className={
                        isActive
                          ? "rounded-[12px] bg-brand-green py-2 uppercase text-white transition-colors md:py-2.5"
                          : "rounded-[12px] py-2 uppercase text-white transition-colors hover:bg-brand-green/10 md:py-2.5"
                      }
                      style={{ ...poppins, fontSize: "clamp(13px, 1.6vw, 16px)" }}
                    >
                      {t(tab.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span
              className="tabular-nums text-white"
              style={{ ...poppins, fontSize: "clamp(24px, 3.5vw, 36px)", lineHeight: 1 }}
            >
              {currentPeriod?.completedCount ?? 0}/{currentPeriod?.totalCount ?? 0}
            </span>
            <span
              className="inline-flex items-center rounded-[14px] bg-brand-green px-3 py-1.5 uppercase text-white whitespace-nowrap"
              style={{ ...poppins, fontSize: "clamp(11px, 1.1vw, 13px)" }}
            >
              Rests in {formatResetTime(currentPeriod?.periodEnd, nowMs)}
            </span>
          </div>
        </div>

        <section className="mt-4 space-y-2 pb-8 md:mt-5 md:space-y-2.5">
          {isLoading && (
            <div className="rounded-[14px] border-2 border-brand-green p-4 uppercase text-white/60" style={{ ...poppins, fontSize: 12 }}>
              Loading objectives...
            </div>
          )}
          {isError && (
            <div className="rounded-[14px] border-2 border-brand-red-soft p-4 uppercase text-brand-red-soft" style={{ ...poppins, fontSize: 12 }}>
              Could not load objectives. Try refreshing.
            </div>
          )}
          {!isLoading && !isError && objectives.length === 0 && (
            <div className="rounded-[14px] border-2 border-brand-green p-4 uppercase text-white/60" style={{ ...poppins, fontSize: 12 }}>
              No objectives available.
            </div>
          )}
          {objectives.map((objective, index) => (
            <ObjectiveCard key={objective.id} objective={objective} index={index} />
          ))}
        </section>
      </div>
    </div>
  );
}
