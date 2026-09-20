"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/** "Today's longest runs": best cashed multipliers of the day in the main leaderboard's table styling. */
export function RunsBoard({ runs, className }: { runs: Array<{ nickname: string; run_mult: number }>; className?: string }) {
  const { t } = useLocale();
  return (
    <aside className={cn("w-full", className)}>
      <h3 className="mb-2 flex items-center gap-2 font-fun text-[13px] font-black uppercase tracking-[0.12em] text-white" style={poppins}>
        <Trophy className="size-4 text-brand-yellow" /> {t("miniGames.longestRuns")}
      </h3>
      <div className="overflow-hidden rounded-[10px] border-2" style={{ borderColor: "#38B60E" }}>
        {runs.length === 0 && <p className="px-3 py-4 text-center text-xs text-white/55" style={poppins}>{t("miniGames.noRunsYet")}</p>}
        <div className="divide-y divide-brand-green/25">
          {runs.map((run, i) => (
            <div key={`${run.nickname}-${i}`} className={cn("grid grid-cols-12 items-center gap-2 px-3 py-2.5", i === 0 ? "bg-brand-green" : "hover:bg-white/[0.03]")}>
              <div className="col-span-3 text-center text-lg font-black tabular-nums text-white" style={poppins}>#{i + 1}</div>
              <div className="col-span-6 truncate font-fun text-sm font-black uppercase text-white">{run.nickname}</div>
              <div className="col-span-3 text-center text-sm font-black tabular-nums text-white" style={poppins}>{run.run_mult.toFixed(2)}×</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
