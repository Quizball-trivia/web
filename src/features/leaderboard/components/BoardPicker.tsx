"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useLocale } from "@/contexts/LocaleContext";
import type { LeaderboardStanding } from "@/lib/domain/leaderboard";
import { cn } from "@/lib/utils";
import { SHOW_PLAYER_COUNTS } from "../boards";
import { BoardBadge, boardName } from "./BoardBadge";

interface BoardPickerProps {
  kind: "country" | "club" | null;
  standings: LeaderboardStanding[];
  selected: string | null;
  /** The viewer's own country/club, pinned above the list. */
  mine: string | null;
  /** Every browsable key; those without scoring players follow the ranked ones. */
  catalogue: readonly string[];
  pointsUnit: string;
  onSelect: (kind: "country" | "club", value: string) => void;
  onClose: () => void;
}

const fold = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function BoardPicker({ kind, standings, selected, mine, catalogue, pointsUnit, onSelect, onClose }: BoardPickerProps) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    if (!kind) return [];
    const needle = fold(query.trim());
    const ranked = new Set(standings.map((row) => row.key));
    const unranked = catalogue
      .filter((key) => !ranked.has(key))
      .map((key) => ({ key, rank: null as number | null, score: null as number | null, players: null as number | null, name: boardName(kind, key, locale) }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
    return [
      ...standings.map((row) => ({ key: row.key, rank: row.rank as number | null, score: row.score as number | null, players: row.players as number | null, name: boardName(kind, row.key, locale) })),
      ...unranked,
    ].filter((row) => !needle || fold(row.name).includes(needle) || row.key.toLowerCase() === needle);
  }, [kind, standings, catalogue, query, locale]);
  const mineRow = rows.find((row) => row.key === mine);

  const renderRow = (row: (typeof rows)[number]) => {
    const isSelected = row.key === selected;
    return (
      <button
        key={row.key}
        type="button"
        onClick={() => {
          if (kind) onSelect(kind, row.key);
          setQuery("");
        }}
        className={cn(
          "grid w-full grid-cols-[2.5rem_2rem_1fr_auto] items-center gap-2 rounded-lg px-2 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
          isSelected ? "bg-white/10" : "hover:bg-white/5",
        )}
      >
        <span className="text-center text-sm font-black tabular-nums text-white/50">{row.rank === null ? "–" : `#${row.rank}`}</span>
        <span className="flex items-center justify-center"><BoardBadge kind={kind ?? "country"} value={row.key} /></span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-black uppercase tracking-wide text-white">{row.name}</span>
          {SHOW_PLAYER_COUNTS && row.players !== null && (
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
              {t("leaderboard.pickerPlayers", { n: row.players.toLocaleString() })}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {row.score !== null && (
            <span className="text-right text-[12px] font-black tabular-nums text-brand-yellow">
              {row.score.toLocaleString()} <span className="text-[9px] text-white/40">{pointsUnit}</span>
            </span>
          )}
          {isSelected ? <Check className="size-4 text-brand-green" aria-hidden /> : <span className="size-4" />}
        </span>
      </button>
    );
  };

  return (
    <Sheet open={kind !== null} onOpenChange={(open) => { if (!open) { setQuery(""); onClose(); } }}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85vh] w-full max-w-lg gap-0 rounded-t-2xl border-white/10 bg-popover font-fun text-white"
      >
        <div className="px-4 pb-3 pt-3">
          <SheetTitle className="text-lg font-black uppercase tracking-wide text-white">
            {kind === "club" ? t("leaderboard.pickerTitleClub") : t("leaderboard.pickerTitleCountry")}
          </SheetTitle>
          <SheetDescription className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
            {t("leaderboard.pickerSubtitle")}
          </SheetDescription>
          <label className="mt-3 flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 focus-within:border-white/40">
            <Search className="size-4 text-white/40" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={kind === "club" ? t("leaderboard.pickerSearchClub") : t("leaderboard.pickerSearchCountry")}
              aria-label={kind === "club" ? t("leaderboard.pickerSearchClub") : t("leaderboard.pickerSearchCountry")}
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white placeholder:text-white/35 focus:outline-none"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
          {mineRow && !query && (
            <div className="mb-2">
              <p className="px-2 pb-1 text-[9px] font-black uppercase tracking-[0.18em] text-brand-green">
                {kind === "club" ? t("leaderboard.pickerYourClub") : t("leaderboard.pickerYourCountry")}
              </p>
              {renderRow(mineRow)}
            </div>
          )}
          <p className="px-2 pb-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
            {t("leaderboard.pickerAll")}
          </p>
          {rows.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs font-black uppercase tracking-wide text-white/40">
              {t("leaderboard.pickerEmpty")}
            </p>
          ) : (
            rows.map(renderRow)
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
