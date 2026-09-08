"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Radio } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

export interface LiveStats {
  playing_now: number;
  recent_wins: Array<{ nickname: string; amount: number; run_mult: number; settled_at: string }>;
}

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/** Real social numbers for a house-banked mode: players with a live heartbeat and a rotating last-win ticker. Polls every 10s. */
export function LiveActivityStrip({ fetchStats, className = "" }: { fetchStats: () => Promise<LiveStats>; className?: string }) {
  const { t } = useLocale();
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [index, setIndex] = useState(0);
  const tickerId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const next = await fetchStats().catch(() => null);
      if (next && !cancelled) setStats(next);
    };
    void poll();
    const id = window.setInterval(() => void poll(), 10_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [fetchStats]);

  useEffect(() => {
    if (!stats || stats.recent_wins.length < 2) return;
    const id = window.setInterval(() => { tickerId.current += 1; setIndex((i) => (i + 1) % stats.recent_wins.length); }, 4_000);
    return () => window.clearInterval(id);
  }, [stats]);

  const win = stats?.recent_wins[index % Math.max(1, stats.recent_wins.length)];
  return (
    <div className={`flex items-center justify-between gap-2 px-1 py-1 ${className}`}>
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-brand-red-soft" style={poppins}>
        <Radio className="size-3.5 animate-pulse" /> {t("miniGames.playingNow", { n: (stats?.playing_now ?? 0).toLocaleString() })}
      </span>
      <div className="relative h-4 min-w-0 flex-1 overflow-hidden text-right">
        <AnimatePresence mode="popLayout">
          {win && (
            <motion.span key={`${win.nickname}-${win.settled_at}-${index}`} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.35 }} className="absolute right-0 top-0 truncate text-[10px] font-bold text-white/60" style={poppins}>
              {win.nickname} <span className="text-brand-yellow">+{win.amount.toLocaleString()}</span> <span className="text-white/40">×{win.run_mult}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
