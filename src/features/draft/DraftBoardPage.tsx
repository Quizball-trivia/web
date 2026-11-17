"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DraftLeaderboard, type BoardRow } from "./DraftViews";
import { draftCopy } from "./draft.copy";
import { draftApi, withRetry, type LeagueBoard, type LeagueInfo } from "./draft.api";

export const boardRowsOf = (entries: Array<{ rank: number; userId: string; runId?: string; username: string; avatarCustomization: unknown; w: number; d: number; l: number; points: number }>): BoardRow[] =>
  entries.map((e) => ({ rank: e.rank, name: e.username, userId: e.userId, runId: e.runId, avatar: (e.avatarCustomization ?? null) as BoardRow["avatar"], season: { w: e.w, d: e.d, l: e.l, points: e.points } }));

/** The public page's Top 10: this week's board of the league picked here. No team opens from here. */
export function DraftBoardPage({ locale }: { locale: string }) {
  const c = draftCopy(locale);
  const [leagues, setLeagues] = useState<LeagueInfo[]>([]);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [board, setBoard] = useState<LeagueBoard | null>(null);
  // A page left open past Monday's reset shows the new week when the visitor comes back to it.
  const [visit, setVisit] = useState(0);
  useEffect(() => {
    const back = () => { if (document.visibilityState === "visible") setVisit((v) => v + 1); };
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", back);
    return () => { document.removeEventListener("visibilitychange", back); window.removeEventListener("focus", back); };
  }, []);
  useEffect(() => {
    let live = true;
    void withRetry(() => draftApi.leagues(locale)).then((h) => { if (live) { setLeagues(h.leagues); setLeagueId((id) => id ?? h.leagues[0]?.id ?? null); } }).catch(() => undefined);
    return () => { live = false; };
  }, [locale]);
  useEffect(() => {
    if (!leagueId) return;
    let live = true;
    void withRetry(() => draftApi.leagueBoard(leagueId, locale)).then((b) => { if (live) setBoard(b); }).catch(() => { if (live) setBoard(null); });
    return () => { live = false; };
  }, [leagueId, locale, visit]);
  const league = leagues.find((l) => l.id === leagueId) ?? null;
  return (
    <div className="space-y-2">
      {leagues.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={c.chooseLeague}>
          {leagues.map((l) => (
            <button key={l.id} type="button" aria-pressed={l.id === leagueId} onClick={() => setLeagueId(l.id)}
              className={cn("min-h-9 rounded-full px-3 text-xs font-bold transition-colors", l.id === leagueId ? "bg-brand-blue text-white" : "bg-white/[0.07] text-white/75 hover:bg-white/15")}>{c.leagueName(l)}</button>
          ))}
        </div>
      )}
      <DraftLeaderboard locale={locale} rows={board && board.leagueId === leagueId ? boardRowsOf(board.top).slice(0, 10) : []} title={league ? c.boardWeek(c.leagueName(league)) : c.board} compact={false} footer={c.weekReset} />
    </div>
  );
}
