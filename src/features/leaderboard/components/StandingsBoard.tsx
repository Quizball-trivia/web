"use client";

import { Crown, Swords, TrendingUp } from "lucide-react";

import { useLocale } from "@/contexts/LocaleContext";
import type { BoardStanding, LeaderboardStanding } from "@/lib/domain/leaderboard";
import { cn } from "@/lib/utils";
import { SHOW_PLAYER_COUNTS } from "../boards";
import { BoardBadge, boardName } from "./BoardBadge";

interface StandingsBoardProps {
  kind: "country" | "club";
  standings: LeaderboardStanding[];
  /** The group the viewer belongs to (pinned in the rivalry banner). */
  mine: string | null;
  myStanding: BoardStanding | null;
  myPoints: number | null;
  pointsUnit: string;
  onOpenGroup: (key: string) => void;
}

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600, lineHeight: 1 } as const;

export function StandingsBoard({ kind, standings, mine, myStanding, myPoints, pointsUnit, onOpenGroup }: StandingsBoardProps) {
  const { t, locale } = useLocale();
  const mineIndex = standings.findIndex((row) => row.key === mine);
  const mineRow = mineIndex >= 0 ? standings[mineIndex] : null;
  const above = mineIndex > 0 ? standings[mineIndex - 1] : null;
  const below = mineIndex >= 0 ? standings[mineIndex + 1] ?? null : null;
  const name = (key: string) => boardName(kind, key, locale);

  return (
    <div className="space-y-4">
      {mineRow && (
        <div className="rounded-[10px] border-2 border-brand-green bg-brand-green/10 p-4">
          <div className="flex items-center gap-3">
            <BoardBadge kind={kind} value={mineRow.key} className={kind === "club" ? "size-11" : "text-[34px]"} />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-brand-green">
                {kind === "club" ? t("leaderboard.rivalryYourClub") : t("leaderboard.rivalryYourCountry")}
              </p>
              <p className="truncate text-lg uppercase text-white sm:text-xl" style={poppins}>{name(mineRow.key)}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl tabular-nums text-white sm:text-4xl" style={poppins}>#{mineRow.rank}</p>
              {SHOW_PLAYER_COUNTS && (
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/50">
                  {t("leaderboard.rivalryOf", { n: standings.length })}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white">
              {above ? <Swords className="size-4 shrink-0 text-brand-orange" aria-hidden /> : <Crown className="size-4 shrink-0 text-brand-yellow" aria-hidden />}
              <span className="min-w-0">
                {above
                  ? t("leaderboard.rivalryBehind", { gap: (above.score - mineRow.score).toLocaleString(), unit: pointsUnit, name: name(above.key) })
                  : below
                    ? t("leaderboard.rivalryLeading", { gap: (mineRow.score - below.score).toLocaleString(), unit: pointsUnit, name: name(below.key) })
                    : t("leaderboard.rivalryAlone")}
              </span>
            </div>
            {myStanding && (myStanding.topTenSlot === null ? myStanding.topTenGap !== null : myPoints !== null) && (
              <div className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white">
                <TrendingUp className="size-4 shrink-0 text-brand-green" aria-hidden />
                <span className="min-w-0">
                  {myStanding.topTenSlot !== null
                    ? t("leaderboard.rivalryCounts", { points: (myPoints ?? 0).toLocaleString(), unit: pointsUnit, slot: myStanding.topTenSlot })
                    : t("leaderboard.rivalryNeeds", { gap: (myStanding.topTenGap ?? 0).toLocaleString(), unit: pointsUnit })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="grid grid-cols-12 gap-2 px-3 pb-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/45 sm:gap-4 sm:px-4 sm:text-xs">
          <div className="col-span-2 text-center">{t("leaderboard.colRank")}</div>
          <div className={SHOW_PLAYER_COUNTS ? "col-span-6" : "col-span-6 sm:col-span-7"}>{kind === "club" ? t("leaderboard.colClub") : t("leaderboard.colNation")}</div>
          {SHOW_PLAYER_COUNTS && <div className="col-span-1 hidden text-center sm:block">{t("leaderboard.colPlayers")}</div>}
          <div className="col-span-4 text-center sm:col-span-3">{t("leaderboard.colTopTen", { unit: pointsUnit })}</div>
        </div>
        <div className="overflow-hidden rounded-[10px] border-2 border-brand-green">
          <div className="divide-y divide-brand-green/25">
            {standings.map((row) => {
              const isMine = row.key === mine;
              return (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => onOpenGroup(row.key)}
                  className={cn(
                    "grid w-full grid-cols-12 items-center gap-2 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 sm:gap-4 sm:px-4 sm:py-3.5",
                    isMine ? "bg-brand-green" : "hover:bg-white/[0.03]",
                  )}
                >
                  <span className="col-span-2 text-center text-xl tabular-nums text-white sm:text-2xl" style={poppins}>#{row.rank}</span>
                  <span className={cn("col-span-6 flex min-w-0 items-center gap-2.5 sm:gap-3", !SHOW_PLAYER_COUNTS && "sm:col-span-7")}>
                    <BoardBadge kind={kind} value={row.key} className={kind === "club" ? "size-8" : "text-[24px]"} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black uppercase text-white sm:text-base">{name(row.key)}</span>
                      {row.topPlayer && (
                        <span className={cn("block truncate text-[10px] font-bold uppercase tracking-wide", isMine ? "text-white/80" : "text-white/45")}>
                          <Crown className="mr-1 inline size-3 -translate-y-px text-brand-yellow" aria-hidden />
                          {row.topPlayer.username} · {row.topPlayer.points.toLocaleString()}
                        </span>
                      )}
                    </span>
                  </span>
                  {SHOW_PLAYER_COUNTS && <span className="col-span-1 hidden text-center text-sm font-black tabular-nums text-white/80 sm:block">{row.players.toLocaleString()}</span>}
                  <span className="col-span-4 text-center text-sm tabular-nums text-white sm:col-span-3 sm:text-lg" style={poppins}>{row.score.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-3 px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
          {t("leaderboard.standingsFootnote", { unit: pointsUnit })}
        </p>
      </div>
    </div>
  );
}
