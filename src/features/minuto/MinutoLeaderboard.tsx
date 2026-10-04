"use client";

import { useEffect, useState } from "react";
import { LeaderboardTable } from "@/features/leaderboard/components/LeaderboardTable";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { useAuthStore } from "@/stores/auth.store";
import { minutoApi, type MinutoLeaderboard as Board, type MinutoLeaderboardRow } from "@/lib/repositories/minuto.repo";
import { SignInLink } from "@/features/marketing/public/PublicLinks";
import { cn } from "@/lib/utils";
import { latestDay, puzzleNumber, releaseDay } from "./minuto.logic";
import { minutoCopy } from "./minuto.copy";
import { trackLeaderboardView } from "./minuto.analytics";

const toEntry = (row: MinutoLeaderboardRow, myId: string | undefined): LeaderboardEntry => ({
  id: row.userId,
  rank: row.rank,
  username: row.username,
  avatar: row.avatarUrl || row.userId,
  avatarCustomization: row.avatarCustomization,
  country: row.country,
  tier: row.tier ?? "",
  rankPoints: row.score,
  isCurrentUser: row.userId === myId,
  trend: "same",
  trendValue: 0,
});

/** Today's top scores in the shared leaderboard rows. `refreshKey` refetches after the viewer finishes a ranked run. */
export function MinutoLeaderboard({ locale, day, refreshKey = 0, limit = 10, placement = "page", className }: { locale: string; day?: string; refreshKey?: number; limit?: number; placement?: "page" | "end"; className?: string }) {
  const c = minutoCopy(locale).board;
  // Follows the Argentine day while the page stays open, unless a specific day is asked for.
  const [today, setToday] = useState(() => releaseDay());
  useEffect(() => {
    if (day) return;
    const check = () => setToday(releaseDay());
    const timer = window.setInterval(check, 60_000);
    window.addEventListener("focus", check);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", check); };
  }, [day]);
  const boardDay = day ?? latestDay(today);
  const authStatus = useAuthStore((s) => s.status);
  const myId = useAuthStore((s) => s.user?.id);
  // A board fetched for another day, account or language is never shown (the `me` row is personal).
  const key = `${boardDay}|${myId ?? ""}|${locale}`;
  const [fetched, setFetched] = useState<{ key: string; board: Board | null } | null>(null);
  const board: Board | null | undefined = fetched?.key === key ? fetched.board : undefined;

  useEffect(() => {
    if (authStatus === "loading" || !boardDay) return;
    let cancelled = false;
    minutoApi.leaderboard(boardDay, locale)
      .then((data) => {
        if (cancelled) return;
        setFetched({ key, board: data });
        if (refreshKey === 0) trackLeaderboardView({ puzzleId: boardDay, placement, players: data.players, hasMe: Boolean(data.me) });
      })
      .catch(() => { if (!cancelled) setFetched({ key, board: null }); });
    return () => { cancelled = true; };
  }, [boardDay, refreshKey, authStatus, placement, locale, key]);

  if (board === null || !boardDay) return null;
  const entries = board?.top.slice(0, limit).map((row) => toEntry(row, myId)) ?? [];
  const meOutside = board?.me && !entries.some((entry) => entry.isCurrentUser) ? toEntry(board.me, myId) : null;

  return (
    <section aria-label={c.title} className={cn("", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold uppercase">{c.title} <span className="text-white/60">#{puzzleNumber(boardDay)}</span></h2>
        {board && board.players > 0 && <span className="text-xs text-white/60">{c.players(board.players)}</span>}
      </div>
      {board === undefined ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      ) : entries.length === 0 ? (
        <p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/75">{c.empty}</p>
      ) : (
        <LeaderboardTable entries={meOutside ? [...entries, meOutside] : entries} currentUserId={myId} pointsLabel="PTS" compact />
      )}
      {authStatus !== "authenticated" && authStatus !== "loading" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-blue px-4 py-3">
          <p className="text-sm font-semibold text-white/90">{c.join}</p>
          <SignInLink placement="minuto_leaderboard" modeId="minuto" returnTo="/minuto" className="inline-flex h-10 items-center rounded-full bg-brand-yellow px-5 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep">{c.joinButton}</SignInLink>
        </div>
      )}
    </section>
  );
}
