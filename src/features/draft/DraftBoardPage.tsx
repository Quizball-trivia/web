"use client";

import { useEffect, useState } from "react";
import { DraftLeaderboard, type BoardRow } from "./DraftViews";
import { draftApi, withRetry } from "./draft.api";
import type { Variant } from "./draft.rules";

export const boardRowsOf = (entries: Array<{ rank: number; userId: string; username: string; avatarCustomization: unknown; w: number; d: number; l: number; points: number }>): BoardRow[] =>
  entries.map((e) => ({ rank: e.rank, name: e.username, userId: e.userId, avatar: (e.avatarCustomization ?? null) as BoardRow["avatar"], season: { w: e.w, d: e.d, l: e.l, points: e.points } }));

const todayInBuenosAires = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

/** The public page's Top 10: today's board of the chosen version. No team opens from here: that needs today's game played. */
export function DraftBoardPage({ locale }: { locale: string }) {
  const [variant, setVariant] = useState<Variant>("budget");
  const [rows, setRows] = useState<BoardRow[]>([]);
  useEffect(() => {
    let live = true;
    void withRetry(() => draftApi.leaderboard(variant, todayInBuenosAires(), locale)).then((board) => { if (live) setRows(boardRowsOf(board.top).slice(0, 10)); }).catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, [variant, locale]);
  return <DraftLeaderboard locale={locale} rows={rows} variant={variant} onVariant={setVariant} compact={false} />;
}
