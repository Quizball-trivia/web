"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trophy } from "lucide-react";
import { motion } from "motion/react";

import Image from "next/image";
import { useLeaderboard, useLeaderboardSeasons, useUserRank } from "@/lib/queries/leaderboard.queries";
import type { LeaderboardType } from "@/lib/domain/leaderboard";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n/messages";

import { useActiveEventMode } from "@/lib/hooks/useActiveEventMode";
import { LeaderboardTable } from "./components/LeaderboardTable";
import { LeaderboardPodium } from "./components/LeaderboardPodium";
import { UserRankStrip } from "./components/UserRankStrip";

interface LeaderboardScreenProps {
  currentPlayerId?: string;
}

const poppinsTitle = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: 1,
} as const;

const TABS: { value: LeaderboardType; labelKey: MessageKey }[] = [
  { value: "global", labelKey: "leaderboard.tabGlobal" },
  { value: "country", labelKey: "leaderboard.tabCountry" },
];

export function LeaderboardScreen({ currentPlayerId }: LeaderboardScreenProps) {
  const router = useRouter();
  const { t } = useLocale();
  const { isEventMode } = useActiveEventMode();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("global");
  const [seasonId, setSeasonId] = useState<string | null>(null);

  const { data: seasonsData } = useLeaderboardSeasons();
  const archivedSeasons = seasonsData?.seasons ?? [];
  const currentSeasonNumber = seasonsData?.currentSeasonNumber ?? archivedSeasons.length + 1;
  const isArchivedView = seasonId !== null;

  const { data: entries, isLoading, isError } = useLeaderboard(
    activeTab,
    currentPlayerId,
    seasonId ?? undefined,
  );
  const { data: userRank } = useUserRank(
    currentPlayerId ?? "",
    activeTab,
    seasonId ?? undefined,
  );

  const handleEntryClick = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const topThree = entries ? entries.slice(0, 3) : [];
  const userEntryFromList = entries?.find(
    (e) => e.isCurrentUser || e.id === currentPlayerId,
  );
  const userEntry = userEntryFromList ?? userRank;

  return (
    <div
      className="relative flex flex-col bg-transparent font-fun"
      style={{ minHeight: "calc(100vh - 4rem)" }}
    >
      <div className="flex-1 container max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-6 space-y-5 sm:space-y-6">
        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-end justify-between gap-4"
        >
          <div className="min-w-0">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl uppercase text-white"
              style={poppinsTitle}
            >
              {t("leaderboard.title")}
            </h1>
            <p className="mt-2 text-[11px] sm:text-[13px] font-black uppercase tracking-[0.08em] text-white/70">
              {t("leaderboard.subtitle")}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {userEntry && (
              <div
                className="text-right text-2xl sm:text-3xl md:text-4xl tabular-nums text-brand-yellow drop-shadow-[0_2px_12px_rgba(255,229,0,0.25)]"
                style={poppinsTitle}
              >
                {userEntry.rankPoints.toLocaleString()} RP
              </div>
            )}
          </div>
        </motion.div>

        {/* ─── User Rank Strip + Betsson Badge ─── */}
        {userEntry && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="relative"
          >
            <UserRankStrip userEntry={userEntry} />
            {/* Betsson badge — event only, sits on the top-right border edge */}
            {isEventMode && (
              <div
                className="absolute -top-1 -right-2 z-20 flex flex-col items-start rounded-md px-2 py-1"
                style={{ backgroundColor: '#FF6C0A', width: 120, height: 34, rotate: '-5.8deg', border: '2px solid #000', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
              >
                <span className="text-[6px] font-bold uppercase tracking-wider text-white/80 leading-none">{t('welcome.poweredBy')}</span>
                <Image src="/assets/betsson/3.png" alt="Betsson Sport" width={96} height={18} className="h-4 w-auto object-contain mt-0.5" />
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Season switcher — only once at least one season is archived ─── */}
        {archivedSeasons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="flex flex-col items-center gap-1.5 pt-1"
          >
            <div className="flex items-center justify-center gap-2" role="tablist" aria-label={t("leaderboard.seasonsAriaLabel")}>
              <button
                type="button"
                role="tab"
                aria-selected={!isArchivedView}
                onClick={() => setSeasonId(null)}
                className={cn(
                  "inline-flex h-8 items-center justify-center rounded-full px-4 text-[11px] sm:text-xs font-fun font-black uppercase tracking-wide transition-all active:translate-y-[1px] focus-visible:outline-none",
                  !isArchivedView
                    ? isEventMode
                      ? "bg-[#FF6C0A] text-white"
                      : "bg-brand-green text-white"
                    : isEventMode
                      ? "border-2 border-[#FF6C0A]/60 text-white/70 hover:bg-[#FF6C0A]/10 hover:text-white"
                      : "border-2 border-brand-green/60 text-white/70 hover:bg-brand-green/10 hover:text-white",
                )}
              >
                {t("leaderboard.season", { n: currentSeasonNumber })}
              </button>
              {[...archivedSeasons].reverse().map((season) => (
                <button
                  key={season.id}
                  type="button"
                  role="tab"
                  aria-selected={seasonId === season.id}
                  onClick={() => setSeasonId(season.id)}
                  className={cn(
                    "inline-flex h-8 items-center justify-center gap-1 rounded-full px-4 text-[11px] sm:text-xs font-fun font-black uppercase tracking-wide transition-all active:translate-y-[1px] focus-visible:outline-none",
                    seasonId === season.id
                      ? isEventMode
                        ? "bg-[#FF6C0A] text-white"
                        : "bg-brand-green text-white"
                      : isEventMode
                        ? "border-2 border-[#FF6C0A]/60 text-white/70 hover:bg-[#FF6C0A]/10 hover:text-white"
                        : "border-2 border-brand-green/60 text-white/70 hover:bg-brand-green/10 hover:text-white",
                  )}
                >
                  <Trophy className="size-3" aria-hidden />
                  {t("leaderboard.season", { n: season.seasonNumber })}
                </button>
              ))}
            </div>
            {isArchivedView && (
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-yellow/80">
                {t("leaderboard.finalStandings")}
              </span>
            )}
          </motion.div>
        )}

        {/* ─── Segmented Tabs (pill style) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="flex items-center justify-center gap-3 pt-1"
          role="tablist"
          aria-label={t("leaderboard.tablistAriaLabel")}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.value)}
                className={`inline-flex h-10 min-w-[130px] items-center justify-center rounded-full px-6 text-xs sm:text-sm font-fun font-black uppercase tracking-wide transition-all active:translate-y-[1px] ${
                  isEventMode
                    ? isActive
                      ? "bg-[#FF6C0A] text-white"
                      : "border-2 border-[#FF6C0A] text-white hover:bg-[#FF6C0A]/10"
                    : isActive
                      ? "bg-brand-green text-white"
                      : "border-2 border-brand-green text-white hover:bg-brand-green/10"
                }`}
              >
                {t(tab.labelKey)}
              </button>
            );
          })}
        </motion.div>

        {/* ─── Content ─── */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-3"
          >
            <Loader2 className="size-8 text-brand-yellow animate-spin" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
              {t("leaderboard.loading")}
            </p>
          </motion.div>
        )}

        {isError && (
          <div className="rounded-[10px] border-2 border-brand-red-soft/40 bg-brand-red-soft/10 px-4 py-6 text-center">
            <p className="text-sm font-fun font-black uppercase tracking-wide text-brand-red-soft">
              {t("leaderboard.loadFailed")}
            </p>
          </div>
        )}

        {!isLoading && !isError && entries && (
          <div className="space-y-5 sm:space-y-6">
            {entries.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <LeaderboardPodium topThree={topThree} onEntryClick={handleEntryClick} />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="space-y-3"
            >
              <h2
                className="text-2xl sm:text-3xl uppercase text-white"
                style={poppinsTitle}
              >
                {t("leaderboard.rankings")}
              </h2>

              <LeaderboardTable
                entries={entries}
                currentUserId={currentPlayerId}
                onEntryClick={handleEntryClick}
              />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
