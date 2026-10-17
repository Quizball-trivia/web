"use client";

import { ArrowRight, Eye, Target, Trophy } from "lucide-react";

import { useLocale } from "@/contexts/LocaleContext";
import type { BoardStanding } from "@/lib/domain/leaderboard";
import { SHOW_PLAYER_COUNTS } from "../boards";
import { BoardBadge, boardName } from "./BoardBadge";

interface BoardContextProps {
  kind: "global" | "country" | "club";
  value: string | null;
  standing: BoardStanding | null;
  pointsUnit: string;
}

/** "#12 of 690 · FC Barcelona" and the next player to pass. */
export function BoardContext({ kind, value, standing, pointsUnit }: BoardContextProps) {
  const { t, locale } = useLocale();
  if (!standing) return null;
  const where = kind === "global" || !value ? t("leaderboard.boardWorld") : boardName(kind, value, locale);
  return (
    // One line: the viewer slot above the board is sized for it, so a long rival name truncates instead of wrapping.
    <div className="flex min-w-0 flex-nowrap items-center gap-x-4 px-1 text-[11px] font-black uppercase tracking-wide">
      <span className="flex shrink-0 items-center gap-1.5 text-white/70">
        {kind !== "global" && value && <BoardBadge kind={kind} value={value} className={kind === "club" ? "size-5" : "text-[14px]"} />}
        {SHOW_PLAYER_COUNTS
          ? t("leaderboard.contextRank", { rank: standing.rank, total: standing.total.toLocaleString(), where })
          : t("leaderboard.contextRankShort", { rank: standing.rank, where })}
      </span>
      {standing.nextTarget ? (
        <span className="flex min-w-0 items-center gap-1.5 text-brand-yellow">
          <Target className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{t("leaderboard.contextNext", {
            gap: standing.nextTarget.gap.toLocaleString(),
            unit: pointsUnit,
            name: standing.nextTarget.username,
            rank: standing.nextTarget.rank,
          })}</span>
        </span>
      ) : standing.rank === 1 ? (
        <span className="text-brand-yellow">{t("leaderboard.contextTop")}</span>
      ) : null}
    </div>
  );
}

interface VisitorNoticeProps {
  kind: "country" | "club";
  value: string;
  mine: string | null;
  onGoMine: () => void;
}

/** Shown on a board the viewer is not part of, with a shortcut back to their own. */
export function VisitorNotice({ kind, value, mine, onGoMine }: VisitorNoticeProps) {
  const { t, locale } = useLocale();
  return (
    <div className="flex items-center gap-3 rounded-[10px] border-2 border-white/10 bg-black/30 px-3 py-3 sm:px-4">
      <Eye className="size-5 shrink-0 text-white/50" aria-hidden />
      <p className="min-w-0 flex-1 text-[11px] font-black uppercase tracking-wide text-white/70">
        {t("leaderboard.visitorBrowsing", { name: boardName(kind, value, locale) })}
      </p>
      {mine && (
        <button
          type="button"
          onClick={onGoMine}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-2 text-[10px] font-black uppercase tracking-wide text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <BoardBadge kind={kind} value={mine} className={kind === "club" ? "size-5" : "text-[14px]"} />
          <span className="max-w-[9rem] truncate">{boardName(kind, mine, locale)}</span>
          <ArrowRight className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

interface GuestCtaProps {
  kind: "global" | "country" | "club";
  value: string | null;
  onSignIn: () => void;
}

/** Signed-out visitors get a sign-in prompt where a member sees their own rank. */
export function GuestCta({ kind, value, onSignIn }: GuestCtaProps) {
  const { t, locale } = useLocale();
  const title = kind === "club" && value
    ? t("leaderboard.guestTitleClub", { name: boardName("club", value, locale) })
    : kind === "country" && value
      ? t("leaderboard.guestTitleCountry", { name: boardName("country", value, locale) })
      : t("leaderboard.guestTitleWorld");
  return (
    <div className="flex items-center gap-3 rounded-[10px] border-2 border-brand-green px-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-green/15">
        {kind !== "global" && value
          ? <BoardBadge kind={kind} value={value} className={kind === "club" ? "size-7" : "text-[22px]"} />
          : <Trophy className="size-5 text-brand-yellow" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black uppercase tracking-wide text-white sm:text-base">{title}</p>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55 sm:text-[11px]">{t("leaderboard.guestBody")}</p>
      </div>
      <button
        type="button"
        onClick={onSignIn}
        className="shrink-0 rounded-lg bg-brand-yellow px-3.5 py-2.5 text-[11px] font-black uppercase tracking-wide text-black transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {t("leaderboard.guestButton")}
      </button>
    </div>
  );
}
