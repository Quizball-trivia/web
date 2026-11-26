"use client";
import { useEffect, useState } from "react";
import { WordDailyLeaderboardRows } from "./WordDailyLeaderboardRows";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { useAuthStore } from "@/stores/auth.store";
import { wordDailyCopy } from "../copy";
import { DailySignIn } from "./WordDailySignIn";
import type { WordDailyGame } from "./wordDaily.games";
import type { WordBoard, WordBoardRow } from "./wordDaily.api";
import { latestDay, puzzleNumber, releaseDay } from "./wordDaily.logic";

const toEntry = (row: WordBoardRow, myId: string | undefined, formatPoints?: (row: WordBoardRow) => string): LeaderboardEntry => ({
  id: row.userId, rank: row.rank, username: row.username, avatar: row.avatarUrl || row.userId, avatarCustomization: row.avatarCustomization,
  country: row.country, tier: row.tier ?? "", rankPoints: row.score, isCurrentUser: row.userId === myId, trend: "same", trendValue: 0,
  ...(formatPoints ? { pointsText: formatPoints(row) } : {}),
});

/** The day's top scores in the shared leaderboard rows. `refreshKey` refetches after the viewer finishes a ranked run. */
export function WordDailyLeaderboard({ game, locale, load, day, refreshKey = 0, limit = 10, placement = "page", className, pointsLabel, pointsHint, formatPoints }: {
  game: WordDailyGame; locale: string; load: (day: string, locale: string) => Promise<WordBoard>; day?: string; refreshKey?: number; limit?: number; placement?: "page" | "end"; className?: string;
  /** The score column's heading (default: points). */
  pointsLabel?: string;
  /** One line under the rows saying how the score column is counted. */
  pointsHint?: string;
  /** The score column's text for a row, when the score is a ranking key rather than a count. */
  formatPoints?: (row: WordBoardRow) => string;
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
  // An open calendar may have no board today: the server picks the newest seeded day ("" asks it), keyed by today.
  const open = game.calendar.publishedDays === "open" && !day;
  const boardDay = day ?? (open ? (today >= game.calendar.contentStart ? "" : null) : latestDay(game.calendar, today));
  // A board from before midnight (a cached copy) on an open calendar is asked again a few times.
  const [nudgeBy, setNudge] = useState<{ day: string; n: number }>({ day: today, n: 0 });
  const nudge = nudgeBy.day === today ? nudgeBy.n : 0;
  const myId = useAuthStore((s) => s.user?.id);
  // `baseKey` is what a shown board stays valid for (across midnight for the default board); `boardKey` is one request.
  const baseKey = boardDay === null ? null : `${game.modeId}|${open ? "latest" : boardDay}|${myId ?? ""}`;
  const boardKey = baseKey === null ? null : `${baseKey}|${open ? today : ""}:${nudge}`;
  const [loaded, setLoaded] = useState<{ day: string; base: string | null; board: WordBoard | null } | null>(null);
  const authStatus = useAuthStore((s) => s.status);
  useEffect(() => {
    if (authStatus === "loading" || boardDay === null || boardKey === null) return;
    let cancelled = false;
    const base = baseKey;
    load(boardDay, locale).then((data) => { if (!cancelled) setLoaded({ day: boardKey, base, board: data }); }).catch(() => {
      // A failed re-ask keeps the board it was asked to refresh; only a first failure hides the section.
      if (!cancelled) setLoaded((prev) => (prev && prev.base === base && prev.board ? { ...prev, day: boardKey } : { day: boardKey, base, board: null }));
    });
    return () => { cancelled = true; };
  }, [boardDay, boardKey, baseKey, refreshKey, authStatus, myId, locale, load]);

  // Rows fetched for another day are never shown under this day's heading.
  // While a re-ask is in flight the board it refreshes stays on screen.
  const board = loaded && (loaded.day === boardKey || (loaded.base === baseKey && loaded.board)) ? loaded.board : undefined;
  // Re-asked only once the current request has settled, so a slow answer is never dropped by the timer.
  const stale = open && loaded?.day === boardKey && board != null && board.day < today && nudge < 3;
  useEffect(() => {
    if (!stale) return;
    const t = window.setTimeout(() => setNudge({ day: today, n: nudge + 1 }), 20_000);
    return () => window.clearTimeout(t);
  }, [stale, today, nudge]);
  if (board === null || boardDay === null) return null;
  const shownDay = board?.day ?? boardDay;
  const entries = board?.top.slice(0, limit).map((row) => toEntry(row, myId, formatPoints)) ?? [];
  const meOutside = board?.me && !entries.some((entry) => entry.isCurrentUser) ? toEntry(board.me, myId, formatPoints) : null;
  return (
    <section aria-label={c.title} className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold uppercase">{c.title} {shownDay && <span className="text-white/60">#{puzzleNumber(game.calendar, shownDay)}</span>}</h2>
        {board && board.players > 0 && <span className="text-xs text-white/60">{c.players(board.players)}</span>}
      </div>
      {board === undefined ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      ) : entries.length === 0 ? (
        <p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/75">{c.empty}</p>
      ) : (
        <WordDailyLeaderboardRows entries={meOutside ? [...entries, meOutside] : entries} currentUserId={myId} pointsLabel={pointsLabel ?? wordDailyCopy(locale).points} compact />
      )}
      {pointsHint && entries.length > 0 && <p className="mt-2 text-xs text-white/60">{pointsHint}</p>}
      {authStatus !== "authenticated" && authStatus !== "loading" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-blue px-4 py-3">
          <p className="text-sm font-semibold text-white/90">{c.join}</p>
          <DailySignIn game={game} placement={`leaderboard_${placement}`}>{c.joinButton}</DailySignIn>
        </div>
      )}
    </section>
  );
}
