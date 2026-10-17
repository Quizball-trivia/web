"use client";

import { motion } from "motion/react";
import { Trophy } from "lucide-react";

import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import { BoardBadge, boardName } from "@/features/leaderboard/components/BoardBadge";

const MEDAL: Record<1 | 2 | 3, string> = { 1: "#FFD700", 2: "#C7CBD1", 3: "#CD7F32" };

export interface BoardTrophySlug {
  season: number;
  kind: "country" | "club";
  key: string;
}

/** `lb-s3-club-fc-barcelona` / `lb-s3-country-ge`, minted when a ranked season is archived. */
export function parseBoardTrophySlug(eventSlug: string): BoardTrophySlug | null {
  const match = eventSlug.match(/^lb-s(\d+)-(country|club)-([a-z0-9-]+)$/);
  if (!match) return null;
  const kind = match[2] as "country" | "club";
  return { season: Number(match[1]), kind, key: kind === "country" ? match[3].toUpperCase() : match[3] };
}

function useTrophyTitle(trophy: BoardTrophySlug, place: number) {
  const { t, locale } = useLocale();
  const name = boardName(trophy.kind, trophy.key, locale);
  return {
    title: trophy.kind === "club"
      ? t("leaderboard.trophyClubTitle", { rank: place, name })
      : t("leaderboard.trophyCountryTitle", { rank: place, name }),
    season: t("leaderboard.season", { n: trophy.season }),
  };
}

/** Profile achievement row for a season top-3 finish on a country or club board. */
export function BoardTrophyCard({ trophy, place }: { trophy: BoardTrophySlug; place: 1 | 2 | 3 }) {
  const { title, season } = useTrophyTitle(trophy, place);
  return (
    <div
      className="relative flex items-center gap-3 overflow-hidden rounded-[14px] border-2 bg-surface-card px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3"
      style={{ borderColor: MEDAL[place] }}
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-black/40 sm:size-14">
        <BoardBadge kind={trophy.kind} value={trophy.key} className={trophy.kind === "club" ? "size-7 sm:size-9" : "text-[22px] sm:text-[28px]"} />
        <Trophy className="absolute -bottom-1 -right-1 size-5 rounded-full bg-black p-0.5" style={{ color: MEDAL[place] }} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-poppins text-[12.5px] font-bold uppercase leading-tight sm:text-base" style={{ color: MEDAL[place] }}>
          {title}
        </div>
        <div className="mt-0.5 font-poppins text-[10.5px] font-semibold text-white/55 sm:text-[12px]">{season}</div>
      </div>
    </div>
  );
}

/** One-time unlock shown after login; Collect acknowledges it. */
export function BoardTrophyUnlockOverlay({
  trophy,
  place,
  onClose,
}: {
  trophy: BoardTrophySlug;
  place: 1 | 2 | 3;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { title, season } = useTrophyTitle(trophy, place);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={cn("w-full max-w-sm rounded-2xl border-2 bg-popover p-6 text-center font-fun")}
        style={{ borderColor: MEDAL[place] }}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">{t("leaderboard.trophyUnlocked")}</p>
        <div className="mx-auto mt-4 flex size-24 items-center justify-center rounded-full bg-black/50" style={{ boxShadow: `0 0 40px ${MEDAL[place]}55` }}>
          <BoardBadge kind={trophy.kind} value={trophy.key} className={trophy.kind === "club" ? "size-16" : "text-[52px]"} />
        </div>
        <p className="mt-4 font-poppins text-xl font-bold uppercase leading-tight" style={{ color: MEDAL[place] }}>{title}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/55">{season}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-brand-yellow py-3 text-sm font-black uppercase tracking-wide text-black transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {t("leaderboard.trophyCollect")}
        </button>
      </motion.div>
    </div>
  );
}
