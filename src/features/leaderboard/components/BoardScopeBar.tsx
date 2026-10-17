"use client";

import { ChevronDown, Globe, Shield } from "lucide-react";

import { useLocale } from "@/contexts/LocaleContext";
import type { BoardKind, BoardScope, BoardView, LeaderboardStanding } from "@/lib/domain/leaderboard";
import { cn } from "@/lib/utils";
import { SHOW_PLAYER_COUNTS } from "../boards";
import { BoardBadge, boardName } from "./BoardBadge";

interface BoardScopeBarProps {
  scope: BoardScope;
  /** Country/club a tab opens when that board is not the active one. */
  countryChoice: string | null;
  clubChoice: string | null;
  view: BoardView;
  /** Standings of the active kind, for the selected group's rank and size. */
  standings: LeaderboardStanding[];
  pointsUnit: string;
  accentHex?: string;
  /** Rendered at the end of the view row (the season select). */
  trailing?: React.ReactNode;
  onSelectKind: (kind: BoardKind) => void;
  onOpenPicker: (kind: "country" | "club") => void;
  onViewChange: (view: BoardView) => void;
}

export function BoardScopeBar({
  scope,
  countryChoice,
  clubChoice,
  view,
  standings,
  pointsUnit,
  accentHex,
  trailing,
  onSelectKind,
  onOpenPicker,
  onViewChange,
}: BoardScopeBarProps) {
  const { t, locale } = useLocale();
  const accent = accentHex ?? "hsl(var(--brand-orange))";
  const groupKind = scope.kind === "global" ? null : scope.kind;
  const groupValue = scope.kind === "country" ? scope.country : scope.kind === "club" ? scope.club : null;
  const group = groupValue ? standings.find((row) => row.key === groupValue) : undefined;

  const tabs: { kind: BoardKind; label: string; icon: React.ReactNode }[] = [
    { kind: "global", label: t("leaderboard.boardWorld"), icon: <Globe className="size-4" aria-hidden /> },
    {
      kind: "country",
      label: t("leaderboard.boardEyebrowCountry"),
      icon: countryChoice ? <BoardBadge kind="country" value={countryChoice} className="text-[15px]" /> : <Globe className="size-4" aria-hidden />,
    },
    {
      kind: "club",
      label: t("leaderboard.boardEyebrowClub"),
      icon: clubChoice ? <BoardBadge kind="club" value={clubChoice} className="size-5" /> : <Shield className="size-4" aria-hidden />,
    },
  ];

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label={t("leaderboard.boardTablistAriaLabel")}
        className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/40 p-1"
      >
        {tabs.map((tab) => {
          const active = scope.kind === tab.kind;
          return (
            <button
              key={tab.kind}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                const hasChoice = tab.kind === "country" ? !!countryChoice : tab.kind === "club" ? !!clubChoice : true;
                if (hasChoice) onSelectKind(tab.kind);
                else onOpenPicker(tab.kind as "country" | "club");
              }}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-lg text-[11px] font-black uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                active ? "text-black" : "text-white/55 hover:text-white",
              )}
              style={active ? { backgroundColor: accent } : undefined}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {groupKind && groupValue && (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => onOpenPicker(groupKind)}
          className="flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-4"
          style={{ borderColor: accent }}
        >
          <BoardBadge kind={groupKind} value={groupValue} className={groupKind === "club" ? "size-9" : "text-[28px]"} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-black uppercase tracking-wide text-white sm:text-lg">
              {boardName(groupKind, groupValue, locale)}
            </span>
            {/* The line keeps its place until the standings arrive, so the card does not grow. */}
            <span className="block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">
              {!group
                ? "\u00a0"
                : SHOW_PLAYER_COUNTS
                  ? t("leaderboard.selectorMeta", { rank: group.rank, players: group.players.toLocaleString(), score: group.score.toLocaleString(), unit: pointsUnit })
                  : t("leaderboard.selectorMetaShort", { rank: group.rank, score: group.score.toLocaleString(), unit: pointsUnit })}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white">
            {groupKind === "club" ? t("leaderboard.selectorChangeClub") : t("leaderboard.selectorChangeCountry")}
            <ChevronDown className="size-3.5" aria-hidden />
          </span>
        </button>
      )}

      {(groupKind || trailing) && (
        <div className="flex items-center justify-between gap-3">
          {groupKind ? (
            <div role="tablist" aria-label={t("leaderboard.viewTablistAriaLabel")} className="inline-flex rounded-lg border border-white/10 bg-black/40 p-1">
              {(["players", "standings"] as const).map((value) => {
                const active = view === value;
                const label = value === "players"
                  ? groupKind === "club" ? t("leaderboard.viewFans") : t("leaderboard.viewPlayers")
                  : groupKind === "country" ? t("leaderboard.viewNations") : t("leaderboard.viewClubs");
                return (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onViewChange(value)}
                    className={cn(
                      "rounded-md px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                      active ? "bg-white text-black" : "text-white/55 hover:text-white",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
            <span />
          )}
          {trailing}
        </div>
      )}
    </div>
  );
}
