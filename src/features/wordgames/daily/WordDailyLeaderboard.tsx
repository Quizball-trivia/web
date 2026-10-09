"use client";
import { useEffect, useState } from "react";
import { LeaderboardTable } from "@/features/leaderboard/components/LeaderboardTable";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { useAuthStore } from "@/stores/auth.store";
import { wordDailyCopy } from "../copy";
import { DailySignIn } from "./WordDailySignIn";
import type { WordDailyGame } from "./wordDaily.games";
import type { WordBoard, WordBoardRow } from "./wordDaily.api";
import { latestDay, puzzleNumber, releaseDay } from "./wordDaily.logic";

const toEntry = (row: WordBoardRow, myId: string | undefined): LeaderboardEntry => ({
  id: row.userId, rank: row.rank, username: row.username, avatar: row.avatarUrl || row.userId, avatarCustomization: row.avatarCustomization,
  country: row.country, tier: row.tier ?? "", rankPoints: row.score, isCurrentUser: row.userId === myId, trend: "same", trendValue: 0,
});

/** The day's top scores in the shared leaderboard rows. `refreshKey` refetches after the viewer finishes a ranked run. */
export function WordDailyLeaderboard({ game, locale, load, day, refreshKey = 0, limit = 10, placement = "page", className }: {
  game: WordDailyGame; locale: string; load: (day: string, locale: string) => Promise<WordBoard>; day?: string; refreshKey?: number; limit?: number; placement?: "page" | "end"; className?: string;
}) {
  const c = wordDailyCopy(locale).board;
  // Follows the Argentine day while the page stays open, unless a specific day is asked for.
  const [today, setToday] = useState(() => releaseDay());
  useEffect(() => {
    if (day) return;
    const check = () => setToday(releaseDay());
    const timer = window.setInterval(check, 60_000);
    window.addEventListener("focus", check);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", check); };
  }, [day]);
  const boardDay = day ?? latestDay(game.calendar, today);
  const [loaded, setLoaded] = useState<{ day: string; board: WordBoard | null } | null>(null);
  const authStatus = useAuthStore((s) => s.status);
  const myId = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    if (authStatus === "loading" || !boardDay) return;
    let cancelled = false;
    load(boardDay, locale).then((data) => { if (!cancelled) setLoaded({ day: boardDay, board: data }); }).catch(() => { if (!cancelled) setLoaded({ day: boardDay, board: null }); });
    return () => { cancelled = true; };
  }, [boardDay, refreshKey, authStatus, myId, locale, load]);

  // Rows fetched for another day are never shown under this day's heading.
  const board = loaded && loaded.day === boardDay ? loaded.board : undefined;
  if (board === null || !boardDay) return null;
  const entries = board?.top.slice(0, limit).map((row) => toEntry(row, myId)) ?? [];
  const meOutside = board?.me && !entries.some((entry) => entry.isCurrentUser) ? toEntry(board.me, myId) : null;
  return (
    <section aria-label={c.title} className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold uppercase">{c.title} <span className="text-white/60">#{puzzleNumber(game.calendar, boardDay)}</span></h2>
        {board && board.players > 0 && <span className="text-xs text-white/60">{c.players(board.players)}</span>}
      </div>
      {board === undefined ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      ) : entries.length === 0 ? (
        <p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/75">{c.empty}</p>
      ) : (
        <LeaderboardTable entries={meOutside ? [...entries, meOutside] : entries} currentUserId={myId} pointsLabel={wordDailyCopy(locale).points} compact />
      )}
      {authStatus !== "authenticated" && authStatus !== "loading" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-blue px-4 py-3">
          <p className="text-sm font-semibold text-white/90">{c.join}</p>
          <DailySignIn game={game} placement={`leaderboard_${placement}`}>{c.joinButton}</DailySignIn>
        </div>
      )}
    </section>
  );
}
