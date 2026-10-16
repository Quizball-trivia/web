"use client";

import Image from "next/image";
import { Calendar, Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { useLocale } from "@/contexts/LocaleContext";
import type {
  BoardKind,
  BoardScope,
  BoardStanding,
  BoardView,
  LeaderboardEntry,
  LeaderboardStanding,
} from "@/lib/domain/leaderboard";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import type { LeaderboardMode } from "./boards";
import { BoardContext, GuestCta, VisitorNotice } from "./components/BoardContext";
import { BoardPicker } from "./components/BoardPicker";
import { BoardScopeBar } from "./components/BoardScopeBar";
import { LeaderboardPodium } from "./components/LeaderboardPodium";
import { LeaderboardSelect, type LeaderboardSelectOption } from "./components/LeaderboardSelect";
import { LeaderboardTable } from "./components/LeaderboardTable";
import { StandingsBoard } from "./components/StandingsBoard";
import { BOARD_COUNTRY_CODES } from "./countryCodes";
import { BOARD_CLUB_IDS } from "./boards";
import { TopBadge } from "./components/TopBadge";
import { boardName } from "./components/BoardBadge";
import { UserRankStrip } from "./components/UserRankStrip";

const poppinsTitle = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: 1,
} as const;

const MODE_TABS: { value: LeaderboardMode; labelKey: MessageKey }[] = [
  { value: "ranked", labelKey: "leaderboard.tabRanked" },
  { value: "auction", labelKey: "leaderboard.tabAuction" },
  { value: "ticTacToe", labelKey: "leaderboard.tabTicTacToe" },
];

export interface LeaderboardViewProps {
  mode: LeaderboardMode;
  onModeChange: (mode: LeaderboardMode) => void;
  seasonOptions: LeaderboardSelectOption<string>[];
  seasonValue: string;
  onSeasonChange: (value: string) => void;
  isArchivedView: boolean;

  scope: BoardScope;
  view: BoardView;
  countryChoice: string | null;
  clubChoice: string | null;
  myCountry: string | null;
  myClub: string | null;
  onSelectKind: (kind: BoardKind) => void;
  onSelectGroup: (kind: "country" | "club", value: string) => void;
  onViewChange: (view: BoardView) => void;
  pickerKind: "country" | "club" | null;
  onOpenPicker: (kind: "country" | "club") => void;
  onClosePicker: () => void;
  /** Standings for the picker and the standings view of the active country/club kind. */
  pickerStandings: LeaderboardStanding[];
  standings: LeaderboardStanding[];
  standingsLoading: boolean;

  entries: LeaderboardEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
  userEntry: LeaderboardEntry | null;
  boardStanding: BoardStanding | null;
  /** Standings view: where the viewer's points sit inside their own group's top 10. */
  groupStanding: BoardStanding | null;
  currentPlayerId?: string;
  onEntryClick: (userId: string) => void;
  /** Set for signed-out visitors. */
  onSignIn?: () => void;

  isEventMode: boolean;
}

export function LeaderboardView(props: LeaderboardViewProps) {
  const {
    mode, onModeChange, seasonOptions, seasonValue, onSeasonChange, isArchivedView,
    scope, view, countryChoice, clubChoice, myCountry, myClub,
    onSelectKind, onSelectGroup, onViewChange, pickerKind, onOpenPicker, onClosePicker,
    pickerStandings, standings, standingsLoading,
    entries, isLoading, isError, userEntry, boardStanding, groupStanding,
    currentPlayerId, onEntryClick, onSignIn, isEventMode,
  } = props;
  const { t, locale } = useLocale();

  const isAuction = mode === "auction";
  const isTicTacToe = mode === "ticTacToe";
  const isRanked = mode === "ranked";
  const pointsUnit = isAuction ? t("leaderboard.colAP") : isTicTacToe ? t("leaderboard.colTP") : t("leaderboard.colRP");
  const subtitle = isAuction ? t("leaderboard.auctionSubtitle") : isTicTacToe ? t("leaderboard.ticTacToeSubtitle") : t("leaderboard.subtitle");
  const accentHex = isEventMode ? "#FF6C0A" : undefined;

  const groupKind = scope.kind === "global" ? null : scope.kind;
  const groupValue = scope.kind === "country" ? scope.country : scope.kind === "club" ? scope.club : null;
  const mine = groupKind === "country" ? myCountry : groupKind === "club" ? myClub : null;
  const isVisitor = !!groupKind && !!groupValue && groupValue !== mine;
  const showStandings = !!groupKind && view === "standings";
  const topThree = entries ? entries.slice(0, 3) : [];

  return (
    <div className="relative flex flex-col bg-transparent font-fun" style={{ minHeight: "calc(100vh - 4rem)" }}>
      <div className="flex-1 container max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-6 space-y-5 sm:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-end justify-between gap-4"
        >
          <div className="min-w-0">
            <h1 className="text-4xl sm:text-5xl md:text-6xl uppercase text-white" style={poppinsTitle}>
              {t("leaderboard.title")}
            </h1>
            <p className="mt-2 text-[11px] sm:text-[13px] font-black uppercase tracking-[0.08em] text-white/70">{subtitle}</p>
          </div>
          {userEntry && (
            <div
              className="shrink-0 text-right text-2xl sm:text-3xl md:text-4xl tabular-nums text-brand-yellow drop-shadow-[0_2px_12px_rgba(255,229,0,0.25)]"
              style={poppinsTitle}
            >
              {userEntry.rankPoints.toLocaleString()} {pointsUnit}
            </div>
          )}
        </motion.div>

        {/* Mode tabs + season, then the board picker. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-white/10">
            <div className="flex items-center gap-4 sm:gap-7" role="tablist" aria-label={t("leaderboard.modeTablistAriaLabel")}>
              {MODE_TABS.map((tab) => {
                const isActive = mode === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onModeChange(tab.value)}
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
          </div>

          <BoardScopeBar
            scope={scope}
            countryChoice={countryChoice}
            clubChoice={clubChoice}
            view={view}
            accentHex={accentHex}
            standings={pickerStandingsFor(scope, standings)}
            pointsUnit={pointsUnit}
            trailing={isRanked && seasonOptions.length > 1 && !showStandings ? (
              <LeaderboardSelect
                eyebrow={t("leaderboard.seasonEyebrow")}
                ariaLabel={t("leaderboard.seasonSelectAriaLabel")}
                icon={Calendar}
                options={seasonOptions}
                value={seasonValue}
                onChange={onSeasonChange}
                accentHex={accentHex}
              />
            ) : undefined}
            onSelectKind={onSelectKind}
            onOpenPicker={onOpenPicker}
            onViewChange={onViewChange}
          />

          {isArchivedView && !showStandings && (
            <p className="text-right text-[10px] font-bold uppercase tracking-[0.18em] text-brand-yellow/80">
              {t("leaderboard.finalStandings")}
            </p>
          )}
        </motion.div>

        {/* Where the viewer stands on this board. */}
        {!showStandings && userEntry && !isVisitor && (
          <div className="relative space-y-2">
            <UserRankStrip userEntry={userEntry} pointsUnit={pointsUnit} hideTier={!isRanked} />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {groupKind && groupValue && boardStanding && boardStanding.rank <= 3 && (
                <TopBadge kind={groupKind} value={groupValue} rank={boardStanding.rank as 1 | 2 | 3} />
              )}
              <BoardContext kind={scope.kind} value={groupValue} standing={boardStanding} pointsUnit={pointsUnit} />
            </div>
            {isEventMode && (
              <div
                className="absolute -top-1 -right-2 z-20 flex flex-col items-start rounded-md px-2 py-1"
                style={{ backgroundColor: "#FF6C0A", width: 120, height: 34, rotate: "-5.8deg", border: "2px solid #000", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
              >
                <span className="text-[6px] font-bold uppercase tracking-wider text-white/80 leading-none">{t("welcome.poweredBy")}</span>
                <Image src="/assets/betsson/3.png" alt="Betsson Sport" width={96} height={18} className="h-4 w-auto object-contain mt-0.5" />
              </div>
            )}
          </div>
        )}
        {onSignIn && <GuestCta kind={scope.kind} value={groupValue} onSignIn={onSignIn} />}
        {!onSignIn && !showStandings && isVisitor && groupKind && groupValue && (
          <VisitorNotice kind={groupKind} value={groupValue} mine={mine} onGoMine={() => mine && onSelectGroup(groupKind, mine)} />
        )}

        {showStandings && groupKind ? (
          standingsLoading ? (
            <Loading label={t("leaderboard.loading")} />
          ) : (
            <StandingsBoard
              kind={groupKind}
              standings={standings}
              mine={mine}
              myStanding={groupStanding}
              myPoints={groupStanding?.livePoints ?? null}
              pointsUnit={pointsUnit}
              onOpenGroup={(key) => onSelectGroup(groupKind, key)}
            />
          )
        ) : (
          <>
            {isLoading && <Loading label={t("leaderboard.loading")} />}
            {isError && (
              <div className="rounded-[10px] border-2 border-brand-red-soft/40 bg-brand-red-soft/10 px-4 py-6 text-center">
                <p className="text-sm font-fun font-black uppercase tracking-wide text-brand-red-soft">{t("leaderboard.loadFailed")}</p>
              </div>
            )}
            {!isLoading && !isError && entries && (
              <div className="space-y-5 sm:space-y-6">
                {entries.length >= 3 && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
                    <LeaderboardPodium
                      topThree={topThree}
                      onEntryClick={onEntryClick}
                      renderBadge={groupKind && groupValue ? (rank) => <TopBadge kind={groupKind} value={groupValue} rank={rank} /> : undefined}
                    />
                  </motion.div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 }}
                  className="space-y-3"
                >
                  <h2 className="text-2xl sm:text-3xl uppercase text-white" style={poppinsTitle}>{groupKind === "club" && groupValue
                      ? t("leaderboard.fansHeading", { name: boardName("club", groupValue, locale) })
                      : groupKind === "country" && groupValue
                        ? t("leaderboard.countryHeading", { name: boardName("country", groupValue, locale) })
                        : t("leaderboard.rankings")}</h2>
                  {entries.length === 0 ? (
                    <div className="rounded-[10px] border-2 border-white/10 px-4 py-8 text-center">
                      <p className="text-sm font-fun font-black uppercase tracking-wide text-white/60">
                        {groupKind ? t("leaderboard.boardEmpty") : isAuction ? t("leaderboard.auctionEmpty") : t("leaderboard.ticTacToeEmpty")}
                      </p>
                    </div>
                  ) : (
                    <LeaderboardTable entries={entries} currentUserId={currentPlayerId} onEntryClick={onEntryClick} pointsLabel={pointsUnit} />
                  )}
                </motion.div>
              </div>
            )}
          </>
        )}
      </div>

      <BoardPicker
        kind={pickerKind}
        standings={pickerStandings}
        selected={pickerKind === "country" ? (scope.kind === "country" ? scope.country : countryChoice) : pickerKind === "club" ? (scope.kind === "club" ? scope.club : clubChoice) : null}
        mine={pickerKind === "country" ? myCountry : pickerKind === "club" ? myClub : null}
        catalogue={pickerKind === "club" ? BOARD_CLUB_IDS : BOARD_COUNTRY_CODES}
        pointsUnit={pointsUnit}
        onSelect={onSelectGroup}
        onClose={onClosePicker}
      />
    </div>
  );
}

function pickerStandingsFor(scope: BoardScope, standings: LeaderboardStanding[]) {
  return scope.kind === "global" ? [] : standings;
}

function Loading({ label }: { label: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="size-8 text-brand-yellow animate-spin" />
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">{label}</p>
    </motion.div>
  );
}
