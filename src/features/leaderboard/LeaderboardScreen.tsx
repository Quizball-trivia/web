"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { profileHandle } from '@/lib/hooks/useProfileNavigation';
import { Calendar, Globe, Loader2, Trophy } from "lucide-react";
import { motion } from "motion/react";

import Image from "next/image";
import {
  useAuctionLeaderboard,
  useAuctionUserRank,
  useLeaderboard,
  useLeaderboardSeasons,
  useTicTacToeLeaderboard,
  useTicTacToeUserRank,
  useUserRank,
} from "@/lib/queries/leaderboard.queries";
import type { LeaderboardType } from "@/lib/domain/leaderboard";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n/messages";

import { useActiveEventMode } from "@/lib/hooks/useActiveEventMode";
import { LeaderboardTable } from "./components/LeaderboardTable";
import { LeaderboardPodium } from "./components/LeaderboardPodium";
import { LeaderboardSelect, type LeaderboardSelectOption } from "./components/LeaderboardSelect";
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

/** Ranked keeps seasons + RP. Auction/AP and Tic Tac Toe/TP are all-time. */
type LeaderboardMode = "ranked" | "auction" | "ticTacToe";

const MODE_TABS: { value: LeaderboardMode; labelKey: MessageKey }[] = [
  { value: "ranked", labelKey: "leaderboard.tabRanked" },
  { value: "auction", labelKey: "leaderboard.tabAuction" },
  { value: "ticTacToe", labelKey: "leaderboard.tabTicTacToe" },
];

/** Stands in for `seasonId === null` (the live season) inside the select, which
 *  needs a non-null string value per option. */
const CURRENT_SEASON_VALUE = "current";

export function LeaderboardScreen({ currentPlayerId }: LeaderboardScreenProps) {
  const router = useRouter();
  const { t } = useLocale();
  const { isEventMode } = useActiveEventMode();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("global");
  const [mode, setMode] = useState<LeaderboardMode>("ranked");
  const [seasonId, setSeasonId] = useState<string | null>(null);

  const isAuction = mode === "auction";
  const isTicTacToe = mode === "ticTacToe";
  const isRanked = mode === "ranked";

  const { data: seasonsData } = useLeaderboardSeasons();
  const archivedSeasons = useMemo(() => seasonsData?.seasons ?? [], [seasonsData]);
  const currentSeasonNumber = seasonsData?.currentSeasonNumber ?? archivedSeasons.length + 1;
  // Seasons are a ranked-only concept; the auction board is all-time.
  const isArchivedView = isRanked && seasonId !== null;

  // Only the visible mode fetches; switching tabs kicks off the other board.
  const rankedBoard = useLeaderboard(
    activeTab,
    currentPlayerId,
    seasonId ?? undefined,
    isRanked,
  );
  const auctionBoard = useAuctionLeaderboard(activeTab, currentPlayerId, isAuction);
  const ticTacToeBoard = useTicTacToeLeaderboard(activeTab, currentPlayerId, isTicTacToe);
  const activeBoard = isAuction ? auctionBoard : isTicTacToe ? ticTacToeBoard : rankedBoard;
  const { data: entries, isLoading, isError } = activeBoard;

  const rankedUserRank = useUserRank(
    currentPlayerId ?? "",
    activeTab,
    seasonId ?? undefined,
    isRanked,
  );
  const auctionUserRank = useAuctionUserRank(currentPlayerId ?? "", activeTab, isAuction);
  const ticTacToeUserRank = useTicTacToeUserRank(currentPlayerId ?? "", activeTab, isTicTacToe);
  const activeUserRank = isAuction
    ? auctionUserRank
    : isTicTacToe
      ? ticTacToeUserRank
      : rankedUserRank;
  const { data: userRank } = activeUserRank;

  const pointsUnit = isAuction
    ? t("leaderboard.colAP")
    : isTicTacToe
      ? t("leaderboard.colTP")
      : t("leaderboard.colRP");
  const subtitle = isAuction
    ? t("leaderboard.auctionSubtitle")
    : isTicTacToe
      ? t("leaderboard.ticTacToeSubtitle")
      : t("leaderboard.subtitle");

  const accentHex = isEventMode ? "#FF6C0A" : undefined;

  const seasonOptions = useMemo<LeaderboardSelectOption<string>[]>(
    () => [
      {
        value: CURRENT_SEASON_VALUE,
        label: t("leaderboard.season", { n: currentSeasonNumber }),
      },
      // Newest archived season first, mirroring the old pill order.
      ...[...archivedSeasons].reverse().map((season) => ({
        value: season.id,
        label: t("leaderboard.season", { n: season.seasonNumber }),
        icon: Trophy,
      })),
    ],
    [archivedSeasons, currentSeasonNumber, t],
  );

  const regionOptions = useMemo<LeaderboardSelectOption<LeaderboardType>[]>(
    () => TABS.map((tab) => ({ value: tab.value, label: t(tab.labelKey) })),
    [t],
  );

  const handleEntryClick = (userId: string) => {
    // Prefer the unique nickname for a shareable URL; ids keep working.
    // profileHandle guards the null-nickname 'Player' fallback rows (review).
    const nickname = entries?.find((e) => e.id === userId)?.username;
    router.push(`/profile/${profileHandle(userId, nickname)}`);
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
              {subtitle}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {userEntry && (
              <div
                className="text-right text-2xl sm:text-3xl md:text-4xl tabular-nums text-brand-yellow drop-shadow-[0_2px_12px_rgba(255,229,0,0.25)]"
                style={poppinsTitle}
              >
                {userEntry.rankPoints.toLocaleString()} {pointsUnit}
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
            <UserRankStrip userEntry={userEntry} pointsUnit={pointsUnit} hideTier={!isRanked} />
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

        {/* ─── Header bar — mode tabs on the left, season/region selects on the
             right, sharing one hairline rail. ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
          className="flex flex-col gap-1.5"
        >
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-white/10">
            <div
                className="flex items-center gap-4 sm:gap-7"
              role="tablist"
              aria-label={t("leaderboard.modeTablistAriaLabel")}
            >
              {MODE_TABS.map((tab) => {
                const isActive = mode === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setMode(tab.value)}
                    className={cn(
                      "relative -mb-px px-1 pb-2 pt-1 text-[11px] sm:text-xs font-fun font-black uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                      isActive ? "text-white" : "text-white/40 hover:text-white/70",
                    )}
                  >
                    {t(tab.labelKey)}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-0 bottom-0 h-[3px] rounded-full transition-opacity",
                        isActive ? "opacity-100" : "opacity-0",
                        isEventMode ? "bg-[#FF6C0A]" : "bg-brand-orange",
                      )}
                    />
                  </button>
                );
              })}
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 pb-2 sm:flex-none">
              {/* Seasons are ranked-only; AP and TP boards are all-time. */}
              {isRanked && seasonOptions.length > 1 && (
                <LeaderboardSelect
                  eyebrow={t("leaderboard.seasonEyebrow")}
                  ariaLabel={t("leaderboard.seasonSelectAriaLabel")}
                  icon={Calendar}
                  options={seasonOptions}
                  value={seasonId ?? CURRENT_SEASON_VALUE}
                  onChange={(value) =>
                    setSeasonId(value === CURRENT_SEASON_VALUE ? null : value)
                  }
                  accentHex={accentHex}
                />
              )}
              <LeaderboardSelect
                eyebrow={t("leaderboard.regionEyebrow")}
                ariaLabel={t("leaderboard.regionSelectAriaLabel")}
                icon={Globe}
                options={regionOptions}
                value={activeTab}
                onChange={setActiveTab}
                accentHex={accentHex}
              />
            </div>
          </div>

          {isArchivedView && (
            <span className="text-right text-[10px] font-bold uppercase tracking-[0.18em] text-brand-yellow/80">
              {t("leaderboard.finalStandings")}
            </span>
          )}
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

              {entries.length === 0 && !isRanked ? (
                <div className="rounded-[10px] border-2 border-white/10 px-4 py-8 text-center">
                  <p className="text-sm font-fun font-black uppercase tracking-wide text-white/60">
                    {isAuction ? t("leaderboard.auctionEmpty") : t("leaderboard.ticTacToeEmpty")}
                  </p>
                </div>
              ) : (
                <LeaderboardTable
                  entries={entries}
                  currentUserId={currentPlayerId}
                  onEntryClick={handleEntryClick}
                  pointsLabel={pointsUnit}
                />
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
