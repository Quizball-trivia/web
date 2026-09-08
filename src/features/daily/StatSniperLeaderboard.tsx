"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { getStatSniperLeaderboard } from "@/lib/repositories/dailyChallenges.repo";
import type { StatSniperLeaderboard as Board } from "@/lib/domain/dailyChallenge";
import type { AvatarCustomization } from "@/types/game";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/** Today's most accurate Stat Sniper players — the main leaderboard's table styling
 *  (green frame, big rank, uppercase names, own row in green) with only rank / player / accuracy. */
export function StatSniperLeaderboard({ refreshKey = 0, fetcher = getStatSniperLeaderboard, className }: { refreshKey?: number; /** Guest play reads the public board. */ fetcher?: () => Promise<Board>; className?: string }) {
  const { t } = useLocale();
  const { player } = usePlayer();
  const [board, setBoard] = useState<Board | null>(null);

  // Refetch on demand (a saved result) and every 15s while visible, so the table moves live.
  useEffect(() => {
    let cancelled = false;
    const load = () => fetcher().then((b) => { if (!cancelled) setBoard(b); }).catch(() => undefined);
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [refreshKey, fetcher]);

  return (
    <aside className={cn("w-full", className)}>
      <h3 className="mb-2 text-center font-fun text-[13px] font-black uppercase tracking-[0.12em] text-white md:text-left" style={poppins}>{t("statSniper.leaderboard")}</h3>
      <div className="grid grid-cols-12 gap-2 px-3 pb-2 text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/45">
        <div className="col-span-3 text-center">{t("leaderboard.colRank")}</div>
        <div className="col-span-6 text-left">{t("leaderboard.colPlayer")}</div>
        <div className="col-span-3 text-center">{t("statSniper.accuracy")}</div>
      </div>
      <div className="overflow-hidden rounded-[10px] border-2" style={{ borderColor: "#38B60E" }}>
        {board && board.entries.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-white/55" style={poppins}>{t("statSniper.empty")}</p>
        )}
        <div className="divide-y divide-brand-green/25">
          {board?.entries.map((entry) => {
            const mine = entry.userId === player?.id;
            return (
              <div key={entry.userId} className={cn("grid grid-cols-12 items-center gap-2 px-3 py-2.5", mine ? "bg-brand-green" : "hover:bg-white/[0.03]")}>
                <div className="col-span-3 text-center text-lg font-black tabular-nums text-white" style={poppins}>#{entry.rank}</div>
                <div className="col-span-6 flex min-w-0 items-center gap-2">
                  <AvatarDisplay customization={(entry.avatarCustomization ?? {}) as AvatarCustomization} size="xs" countryCode={entry.country} />
                  <span className="truncate font-fun text-sm font-black uppercase text-white">{mine ? t("statSniper.you") : entry.username}</span>
                </div>
                <div className="col-span-3 text-center text-sm font-black tabular-nums text-white" style={poppins}>{entry.score}%</div>
              </div>
            );
          })}
        </div>
      </div>
      {board?.me && (
        <p className="mt-2 text-center text-[11px] font-semibold text-white/55 md:text-left" style={poppins}>
          {t("statSniper.yourRank", { rank: String(board.me.rank), total: String(board.me.total) })}
        </p>
      )}
    </aside>
  );
}
