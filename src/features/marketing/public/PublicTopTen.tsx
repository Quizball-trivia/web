"use client";

import { useEffect, useState } from "react";
import { LeaderboardTable } from "@/features/leaderboard/components/LeaderboardTable";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { toLeaderboardEntry } from "@/lib/mappers/leaderboard.mapper";
import { getAuctionLeaderboard, getLeaderboard, getTicTacToeLeaderboard } from "@/lib/repositories/leaderboard.repo";

type Board = "ranked" | "grid" | "auction";
const TITLE: Record<string, Record<Board, string>> = {
  en: { ranked: "Top 10 — Ranked", grid: "Top 10 — Tic Tac Toe", auction: "Top 10 — Auction" },
  ka: { ranked: "ტოპ 10 — რეიტინგული", grid: "ტოპ 10 — იქს-ნული", auction: "ტოპ 10 — აუქციონი" },
  es: { ranked: "Top 10 — Clasificatoria", grid: "Top 10 — Tiki Taka Toe", auction: "Top 10 — Subasta" },
  tr: { ranked: "İlk 10 — Dereceli", grid: "İlk 10 — Tic Tac Toe", auction: "İlk 10 — Açık Artırma" },
};

/** The same rows the leaderboard tab shows, ten of them, read from the public board endpoints. */
export function PublicTopTen({ board, locale }: { board: Board; locale: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    const load = board === "ranked" ? getLeaderboard("global", 10, 0) : board === "auction" ? getAuctionLeaderboard("global", 10, 0) : getTicTacToeLeaderboard("global", 10, 0);
    load.then(({ data }) => { if (!cancelled) setEntries(data.slice(0, 10).map((e) => toLeaderboardEntry(e))); }).catch(() => { if (!cancelled) setEntries(null); });
    return () => { cancelled = true; };
  }, [board]);
  if (entries === null) return null;
  return (
    <section aria-label={TITLE[locale]?.[board] ?? TITLE.en[board]} className="mt-6">
      <h2 className="mb-3 text-lg font-bold uppercase">{TITLE[locale]?.[board] ?? TITLE.en[board]}</h2>
      {entries === undefined ? <div className="h-64 animate-pulse rounded-2xl bg-white/5" /> : <LeaderboardTable entries={entries} />}
    </section>
  );
}
