'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { buildProfileNavTarget } from '@/lib/hooks/useProfileNavigation';
import { motion } from 'motion/react';
import {
  Pencil, Check, X,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { Trophy as TrophyPh } from '@phosphor-icons/react';
import { COLLAPSED_MATCHES_COUNT, MAX_MATCHES_COUNT } from '@/lib/constants/matches';
import { formatMatchScore, type FormattedMatchScore } from '@/utils/matchScore';
import type { RecentMatchSummary } from '@/lib/domain/recentMatch';

function countryCodeToName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

import { TierFrameAvatar } from '@/components/TierFrameAvatar';
import { CountryFlag } from '@/components/CountryFlag';
import { AvatarPicker } from './components/AvatarPicker';
import { RankFrameCard } from './components/RankFrameCard';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import type { PlayerStats } from '@/types/game';
import type { MatchStatsSummary, ModeMatchStatsSummary, HeadToHeadSummary, RankPosition } from '@/lib/domain';
import type { MessageKey } from '@/lib/i18n/messages';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';

import { getTierVisual } from '@/utils/tierVisuals';
import { RANKED_TIER_BANDS, getNextTierBand } from '@/utils/rankedTier';
import { useLocale } from '@/contexts/LocaleContext';
import { useTierLabel } from '@/hooks/useTierLabel';
import { useActiveEventMode } from '@/lib/hooks/useActiveEventMode';

function resolveI18n(field: Record<string, string> | string | undefined, locale: string): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[locale] ?? field.en ?? Object.values(field)[0] ?? '';
}

import ClubSelect from '@/features/onboarding/ClubSelect';

export interface ProfileRecentMatch {
  id: string | number;
  mode: string;
  competition: "friendly" | "placement" | "ranked";
  result: 'Win' | 'Loss' | 'Draw';
  time: string;
  rpDelta: number | null;
  opponent: string;
  opponentId: string | null;
  opponentIsAi: boolean;
  opponentAvatarUrl: string | null;
  opponentAvatarCustomization: RecentMatchSummary["opponent"]["avatarCustomization"];
  opponentTier: RecentMatchSummary["opponent"]["tier"];
  scoreFormatted: FormattedMatchScore;
}

export function toProfileRecentMatch(match: RecentMatchSummary): ProfileRecentMatch {
  return {
    id: match.matchId,
    mode: match.mode === "ranked" ? "ranked" : "friendly",
    competition: match.competition,
    result: match.result === "win" ? "Win" : match.result === "loss" ? "Loss" : "Draw",
    time: match.timeLabel,
    rpDelta: match.rpDelta,
    opponent: match.opponent.username,
    opponentId: match.opponent.id,
    opponentIsAi: match.opponent.isAi,
    opponentAvatarUrl: match.opponent.avatarUrl,
    opponentAvatarCustomization: match.opponent.avatarCustomization,
    opponentTier: match.opponent.tier,
    scoreFormatted: formatMatchScore(match),
  };
}

interface ProfileWebProps {
  viewMode?: 'self' | 'other';
  player: PlayerStats;
  avatarUrl?: string | null;
  country?: string | null;
  favoriteClub?: string | null;
  preferredLanguage?: string | null;
  globalRank?: RankPosition | null;
  countryRank?: RankPosition | null;
  matchStatsSummary?: MatchStatsSummary | null;
  rankedProfile?: RankedProfileResponse | null;
  rankedProfileLoading?: boolean;
  recentMatches?: ProfileRecentMatch[];
  recentMatchesLoading?: boolean;
  recentMatchesError?: string | null;
  headToHead?: HeadToHeadSummary | null;
  onNameChange?: (newName: string) => Promise<void> | void;
  onAvatarChange?: (avatarUrl: string) => Promise<void> | void;
  onClubChange?: (club: string) => Promise<void> | void;
  onLanguageChange?: (language: string) => Promise<void> | void;
  isUpdating?: boolean;
}

export function ProfileWeb({
  viewMode = 'self',
  player, avatarUrl, country = null, favoriteClub, preferredLanguage,
  globalRank = null, countryRank = null,
  matchStatsSummary = null,
  rankedProfile = null, rankedProfileLoading = false,
  recentMatches = [], recentMatchesLoading = false, recentMatchesError = null,
  headToHead = null,
  onNameChange, onAvatarChange, onClubChange, onLanguageChange,
  isUpdating = false,
}: ProfileWebProps) {
  const { t, locale } = useLocale();
  const { isEventMode } = useActiveEventMode();
  const router = useRouter();
  const tierLabelOf = useTierLabel();
  const isSelf = viewMode === 'self';
  const isPlacementInProgress = rankedProfile ? rankedProfile.placementStatus !== 'placed' : false;
  const placementPlayed = rankedProfile?.placementPlayed ?? 0;
  const placementRequired = Math.max(1, rankedProfile?.placementRequired ?? 3);
  const displayRp = isPlacementInProgress ? 0 : (rankedProfile?.rp ?? 0);
  const tierVisual = rankedProfile ? getTierVisual(rankedProfile.tier) : getTierVisual('Academy');
  const rankedDataReady = !rankedProfileLoading && rankedProfile !== null;
  const showRankTier = rankedDataReady && !isPlacementInProgress;

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(player.username);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isEditingClub, setIsEditingClub] = useState(false);
  const [isMatchesExpanded, setIsMatchesExpanded] = useState(false);

  const { visibleMatches, hiddenCount, canExpand } = useMemo(() => {
    const cappedMatches = recentMatches.slice(0, MAX_MATCHES_COUNT);
    const visible = isMatchesExpanded
      ? cappedMatches
      : cappedMatches.slice(0, COLLAPSED_MATCHES_COUNT);
    const hidden = cappedMatches.length - visible.length;
    return {
      visibleMatches: visible,
      hiddenCount: hidden,
      canExpand: cappedMatches.length > COLLAPSED_MATCHES_COUNT,
    };
  }, [recentMatches, isMatchesExpanded]);

  const overallStats = matchStatsSummary?.overall;
  const rankedStats = matchStatsSummary?.ranked;
  const friendlyStats = matchStatsSummary?.friendly;
  const winRate = Math.round(overallStats?.winRate ?? 0);
  const gamesPlayed = overallStats?.gamesPlayed ?? 0;
  const wins = overallStats?.wins ?? 0;
  const losses = overallStats?.losses ?? 0;
  const draws = overallStats?.draws ?? 0;
  const wldTotal = wins + losses + draws;

  // World Cup event: split the ranked W/D/L into the event season vs the
  // post-reset season. Only shown in event mode once the backend provides it.
  const rankedSeasons = matchStatsSummary?.rankedSeasons;
  const showSeasonSplit = isEventMode && !!rankedSeasons;



  const handleNameChange = async () => {
    try {
      if (editedName.trim() !== player.username) {
        await onNameChange?.(editedName.trim());
      }
      setIsEditingName(false);
    } catch (error) {
      toast.error(t('profile.failedToUpdateName'), {
        description: error instanceof Error ? error.message : t('profile.failedToUpdateName'),
      });
    }
  };

  const handleAvatarSelect = async (nextUrl: string) => {
    if (!onAvatarChange || nextUrl === avatarUrl) {
      setIsAvatarPickerOpen(false);
      return;
    }
    try {
      setIsSavingAvatar(true);
      await onAvatarChange(nextUrl);
      setIsAvatarPickerOpen(false);
    } catch (error) {
      toast.error(t('profile.failedToUpdateAvatar'), {
        description: error instanceof Error ? error.message : t('profile.tryAgain'),
      });
    } finally {
      setIsSavingAvatar(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-5 lg:px-6 lg:py-7 space-y-4 lg:space-y-5 font-poppins">

      {/* ─── 1. Hero ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden px-1 py-4 lg:py-6"
      >
        <div className="relative flex flex-col lg:flex-row items-center gap-5 lg:gap-7">
          {/* Name */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-11 text-2xl font-black bg-black/30 border border-white/10 rounded-[8px] px-3 w-48 lg:w-64 text-center lg:text-left text-white"
                    autoFocus
                    disabled={isUpdating}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameChange()}
                  />
                  <button onClick={handleNameChange} disabled={isUpdating} className="size-10 rounded-[8px] bg-brand-green flex items-center justify-center text-white">
                    <Check className="size-5" />
                  </button>
                  <button onClick={() => setIsEditingName(false)} disabled={isUpdating} className="size-10 rounded-[8px] bg-white/[0.06] flex items-center justify-center text-white/70">
                    <X className="size-5" />
                  </button>
                </div>
              ) : (
                <>
                  <h1
                    className="text-[clamp(1.25rem,6vw,1.875rem)] lg:text-5xl uppercase text-white max-w-[240px] lg:max-w-md [overflow-wrap:anywhere]"
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 600,
                      letterSpacing: '0',
                      lineHeight: 1.05,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                    title={player.username}
                  >
                    {player.username}
                  </h1>
                  {isSelf && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-white/35 hover:text-white disabled:opacity-50 transition-colors"
                      aria-label={t("profileScreen.editNickname")}
                      disabled={isUpdating}
                    >
                      <Pencil className="size-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Inline quick stats — right side per Figma */}
          <div className="flex items-center gap-6 lg:gap-10 shrink-0">
            <div className="text-center">
              <div
                className="text-3xl lg:text-4xl tabular-nums text-brand-green leading-none"
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
              >
                {winRate}%
              </div>
              <div className="text-[10px] lg:text-[11px] font-poppins font-semibold uppercase text-white/50 mt-2">{t("profileScreen.winRate")}</div>
            </div>
            <div className="text-center">
              <div
                className="text-3xl lg:text-4xl tabular-nums text-brand-yellow leading-none"
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
              >
                {rankedProfile?.currentWinStreak ?? 0}
              </div>
              <div className="text-[10px] lg:text-[11px] font-poppins font-semibold uppercase text-white/50 mt-2">{t("profileScreen.winStreak")}</div>
            </div>
            <div className="text-center">
              <div
                className="text-3xl lg:text-4xl tabular-nums text-white leading-none"
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
              >
                {gamesPlayed}
              </div>
              <div className="text-[10px] lg:text-[11px] font-poppins font-semibold uppercase text-white/50 mt-2">{t("profileScreen.matches")}</div>
            </div>
          </div>

        </div>

        {/* ── Rank Progression — no header, no separator ── */}
        <div className="mt-6">
          {/* While the ranked profile is loading, RP would read 0 and the
              cards would flash the Academy frame before snapping to the real
              tier — show a neutral skeleton instead until data arrives. */}
          {rankedProfileLoading ? (
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-6">
              <div className="aspect-[200/320] w-[96px] animate-pulse rounded-[16px] bg-white/5 sm:w-[160px]" />
              <div className="flex w-full flex-col items-center px-2">
                <div className="h-8 w-28 animate-pulse rounded bg-white/5 sm:h-12" />
                <div className="mt-6 h-[18px] w-full animate-pulse bg-white/5 sm:mt-8" />
                <div className="mt-3 h-4 w-40 animate-pulse rounded bg-white/5 sm:mt-4" />
              </div>
              <div className="aspect-[200/320] w-[96px] animate-pulse rounded-[16px] bg-white/5 sm:w-[160px]" />
            </div>
          ) : (() => {
            const ladder = [...RANKED_TIER_BANDS].reverse(); // ascending: Academy → GOAT
            const goatRp = ladder[ladder.length - 1].minRp; // 5000
            const currentIdx = (() => {
              if (isPlacementInProgress) return -1;
              for (let i = ladder.length - 1; i >= 0; i--) {
                if (displayRp >= ladder[i].minRp) return i;
              }
              return 0;
            })();
            const currentTier = currentIdx >= 0 ? ladder[currentIdx].tier : null;
            const next = !isPlacementInProgress ? getNextTierBand(displayRp) : ladder[0];
            const rpToNext = next ? Math.max(0, next.minRp - displayRp) : 0;

            const currentBandMin = currentIdx >= 0 ? ladder[currentIdx].minRp : 0;
            const bandTarget = next ? next.minRp : goatRp;
            const bandSpan = Math.max(1, bandTarget - currentBandMin);
            const bandPct = next
              ? Math.min(100, Math.max(0, ((displayRp - currentBandMin) / bandSpan) * 100))
              : 100;
            const avatarCustomization = player.avatarCustomization ?? {};

            return (
              <>
                {/* Hero row: current tier badge → big RP + progress → next tier badge.
                    Mobile shrinks the side cards (gap, width, padding, icon, font)
                    so the centre column — the progress bar — gets significantly more
                    horizontal room. Desktop keeps the original chunky 160px squares. */}
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-6">
                  {/* Current tier — player avatar inside the tier's shield frame.
                      Clicking it (self view) opens the avatar picker, replacing
                      the old hero-avatar edit entry point. Unranked keeps the
                      legacy blue card since there is no tier frame yet. */}
                  {currentTier ? (
                    isSelf ? (
                      <button
                        type="button"
                        onClick={() => setIsAvatarPickerOpen(true)}
                        className="group relative shrink-0"
                        aria-label={t("profileScreen.changeAvatar")}
                      >
                        <RankFrameCard
                          tier={currentTier}
                          caption={t("profileScreen.current")}
                          tierLabel={tierLabelOf(currentTier)}
                          rpLabel={`${displayRp}RP`}
                          customization={avatarCustomization}
                        />
                        <span className="absolute inset-x-0 top-[38%] mx-auto w-fit rounded-[6px] bg-black/60 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {t('profile.avatarPicker.edit')}
                        </span>
                      </button>
                    ) : (
                      <RankFrameCard
                        tier={currentTier}
                        caption={t("profileScreen.current")}
                        tierLabel={tierLabelOf(currentTier)}
                        rpLabel={`${displayRp}RP`}
                        customization={avatarCustomization}
                        className="shrink-0"
                      />
                    )
                  ) : (
                    /* Unranked — legacy blue card. For self view it stays a
                       button so the avatar picker remains reachable (the old
                       hero-avatar entry point was removed). */
                    (() => {
                      const unrankedCard = (
                        <div className="flex w-[84px] sm:w-[160px] flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-[16px] sm:rounded-[20px] bg-brand-blue p-2.5 sm:p-4">
                          <TrophyPh className="size-9 sm:size-16 text-brand-yellow" weight="light" />
                          <div className="text-center">
                            <div className="font-poppins text-[9px] sm:text-[11px] font-semibold uppercase text-white/60">{t("profileScreen.current")}</div>
                            <div className="mt-0.5 sm:mt-1 font-poppins text-[11px] sm:text-base font-semibold uppercase leading-tight text-white">
                              {t("profileScreen.unranked")}
                            </div>
                            <div className="mt-0.5 sm:mt-1 font-poppins text-[10px] sm:text-[11px] font-semibold uppercase tabular-nums text-white/70">
                              {displayRp} RP
                            </div>
                          </div>
                        </div>
                      );
                      return isSelf ? (
                        <button
                          type="button"
                          onClick={() => setIsAvatarPickerOpen(true)}
                          className="group relative shrink-0"
                          aria-label={t("profileScreen.changeAvatar")}
                        >
                          {unrankedCard}
                          <span className="absolute inset-0 flex items-center justify-center rounded-[16px] sm:rounded-[20px] bg-black/40 text-[9px] font-black uppercase tracking-[0.18em] text-white opacity-0 transition-opacity group-hover:opacity-100">
                            {t('profile.avatarPicker.edit')}
                          </span>
                        </button>
                      ) : unrankedCard;
                    })()
                  )}

                  {/* Center — RP-to-next-tier headline, thick progress, band edges */}
                  <div className="min-w-0 flex flex-col items-center px-2 w-full">
                    {next ? (
                      <div className="flex flex-col items-center leading-none">
                        <div
                          className="font-poppins text-3xl sm:text-5xl tabular-nums text-brand-yellow leading-none"
                          style={{ fontWeight: 600 }}
                        >
                          {rpToNext} <span className="text-xl sm:text-2xl">RP</span>
                        </div>
                        <div className="mt-1.5 sm:mt-2 font-poppins text-xs sm:text-base font-semibold uppercase text-white/90">
                          {t("profileScreen.toNextLeagueLabel")}
                        </div>
                      </div>
                    ) : (
                      <div className="font-poppins max-w-full text-balance text-center text-xl sm:text-3xl font-semibold uppercase leading-tight text-brand-yellow">
                        {t("profileScreen.maxRankAchieved")}
                      </div>
                    )}
                    <div className="mt-6 sm:mt-8 relative h-[18px] w-full bg-brand-green-deep overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${bandPct}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.25 }}
                        className="absolute inset-y-0 left-0 rounded-r-full bg-brand-green"
                      />
                    </div>
                    <div className="mt-2 sm:mt-3 flex w-full items-center justify-between font-poppins uppercase tabular-nums">
                      <span className="text-[10px] font-semibold text-brand-yellow">{currentBandMin} RP</span>
                      <span className="hidden sm:inline text-sm font-black text-white">{Math.round(bandPct)}%</span>
                      <span className="text-[10px] font-semibold text-brand-yellow">{bandTarget} RP</span>
                    </div>
                  </div>

                  {/* Next tier — same avatar previewed inside the next tier's
                      frame, softly blurred ("what you're chasing"). At max rank
                      (GOAT) it shows the GOAT frame unblurred with a glow. */}
                  {next ? (
                    <RankFrameCard
                      tier={next.tier}
                      caption={t("profileScreen.next")}
                      tierLabel={tierLabelOf(next.tier)}
                      rpLabel={`${next.minRp}RP`}
                      customization={avatarCustomization}
                      blurred
                      className="shrink-0"
                    />
                  ) : (
                    <RankFrameCard
                      tier="GOAT"
                      caption={t("profileScreen.achieved")}
                      tierLabel={tierLabelOf('GOAT')}
                      rpLabel={`${goatRp}RP`}
                      customization={avatarCustomization}
                      glow
                      className="shrink-0"
                    />
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </motion.div>

      {/* ─── 3. Stat cards row (3 columns on desktop) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">

          {/* Rank Card — translucent blue with brand-blue border outline.
              Mirrors the "next tier" badge style elsewhere on this page so
              the card sits as an outline panel rather than a solid fill. */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="h-full rounded-[20px] overflow-hidden bg-surface-card/40 backdrop-blur-sm"
            >
              <div className="p-5 flex flex-col items-center">
                {rankedProfileLoading && (
                  <div className="animate-pulse space-y-3 w-full flex flex-col items-center">
                    <div className="h-10 w-10 bg-white/15 rounded" />
                    <div className="h-5 w-32 bg-white/15 rounded" />
                    <div className="h-3 w-24 bg-white/15 rounded" />
                    <div className="w-full space-y-1.5 mt-2">
                      <div className="h-10 bg-white/15 rounded-full" />
                      <div className="h-10 bg-white/15 rounded-full" />
                    </div>
                  </div>
                )}
                {showRankTier && (
                  <>
                    <p className="font-poppins text-xs font-semibold uppercase text-white/80 mb-2">{t("profileScreen.currentSeason")}</p>

                    {/* Games-played counts, folded into the season card. */}
                    <div className="mb-4 flex w-full items-center justify-center gap-4 font-poppins text-xs font-semibold uppercase text-white/90">
                      <span>{t('profileScreen.rankedLabel')} <span className="text-brand-yellow">{rankedStats?.gamesPlayed ?? 0}</span></span>
                      <span className="text-white/30">·</span>
                      <span>{t('profileScreen.friendlyLabel')} <span className="text-white">{friendlyStats?.gamesPlayed ?? 0}</span></span>
                    </div>

                    <div className="w-full space-y-2">
                      <div className="flex justify-between items-center h-10 rounded-full bg-brand-green px-4">
                        <span className="font-poppins text-xs font-semibold uppercase text-white">{t("profileScreen.global")}</span>
                        <span className="font-poppins text-xs font-semibold tabular-nums text-white">
                          {globalRank ? `#${globalRank.rank}` : '#--'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center h-10 rounded-full bg-brand-yellow px-4">
                        <span className="font-poppins text-xs font-semibold uppercase text-black">{t("profileScreen.country")}</span>
                        <span className="font-poppins text-xs font-semibold tabular-nums text-black">
                          {countryRank ? `#${countryRank.rank}` : '#--'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                {rankedDataReady && isPlacementInProgress && (
                  <>
                    <h2
                      className="text-xl uppercase text-white"
                      style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0', lineHeight: 1 }}
                    >
                      Unranked
                    </h2>
                    <p className="font-poppins text-[11px] font-semibold uppercase text-white/50 mt-2 mb-4">
                      Placement {placementPlayed}/{placementRequired}
                    </p>
                    <p className="font-poppins text-xs font-semibold uppercase text-white/70 text-center">
                      Play placement matches to get your rank.
                    </p>
                  </>
                )}
              </div>
            </motion.div>

            {/* W/L/D Breakdown — in event mode a single card with a toggle to
                switch between Ranked (regular) and World Cup event stats. The
                games-played counts live in the season card (left). */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="flex h-full flex-col gap-3"
            >
              {showSeasonSplit ? (
                <SeasonToggleCard
                  regular={rankedSeasons!.regular}
                  event={rankedSeasons!.event}
                  defaultTab={isEventMode ? 'event' : 'ranked'}
                  t={t}
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-[20px] border-2 border-brand-blue bg-surface-card/40 backdrop-blur-sm">
                  {wldTotal > 0 ? (
                    <WinDrawLossGrid wins={wins} draws={draws} losses={losses} t={t} />
                  ) : (
                    <div className="font-poppins text-sm font-semibold uppercase text-white/50 text-center py-10">
                      {t('profileScreen.noMatchesPlayed')}
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Preferences (self only) — blue card per Figma */}
            {isSelf && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="h-full rounded-[20px] bg-surface-card/40 backdrop-blur-sm px-6 py-5"
              >
                <h3 className="font-poppins text-sm font-semibold uppercase text-white text-center mb-4">
                  {t('profileScreen.preferences')}
                </h3>
                <div className="divide-y divide-white/15">
                  {/* Country */}
                  {country && (
                    <div className="flex items-center justify-between py-3.5">
                      <span className="font-poppins text-sm font-semibold uppercase text-white/50">{t("profileScreen.country")}</span>
                      <span className="inline-flex items-center gap-2 font-poppins text-sm font-semibold uppercase text-white">
                        <CountryFlag code={country} className="text-base overflow-hidden rounded-sm" />
                        {countryCodeToName(country)}
                      </span>
                    </div>
                  )}
                  {/* Club */}
                  <div className="flex items-center justify-between gap-3 py-3.5">
                    <span className="shrink-0 font-poppins text-sm font-semibold uppercase text-white/50">{t('profileScreen.club')}</span>
                    <div className={`flex items-center gap-2 ${isEditingClub ? 'min-w-0 flex-1' : ''}`}>
                      {isEditingClub ? (
                        <div className="w-full min-w-0">
                          <ClubSelect
                            value={favoriteClub ?? ''}
                            onChange={async (val) => {
                              // Close without saving when nothing changed OR when
                              // cleared (×): the backend requires a non-empty club,
                              // so an empty value just keeps the current pick.
                              if (!val || val === (favoriteClub ?? '')) {
                                setIsEditingClub(false);
                                return;
                              }
                              try {
                                await onClubChange?.(val);
                                setIsEditingClub(false);
                              } catch {
                                toast.error(t('profile.failedToUpdateClub'));
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <>
                          <span className="font-poppins text-sm font-semibold uppercase text-white truncate max-w-[160px]">
                            {favoriteClub || t('profile.notSet')}
                          </span>
                          <button
                            onClick={() => setIsEditingClub(true)}
                            className="text-white/40 hover:text-white disabled:opacity-50 transition-colors"
                            aria-label={t("profileScreen.editFavoriteClub")}
                            disabled={isUpdating}
                          >
                            <Pencil className="size-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Language */}
                  <div className="flex items-center justify-between py-3.5">
                    <span className="font-poppins text-sm font-semibold uppercase text-white/50">{t("profileScreen.language")}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={async () => {
                          try {
                            await onLanguageChange?.('ka');
                          } catch {
                            toast.error(t('profile.failedToUpdateLanguage'));
                          }
                        }}
                        disabled={isUpdating}
                        className={`inline-flex h-9 min-w-[80px] items-center justify-center gap-1.5 rounded-[20px] px-3 font-poppins text-sm font-semibold uppercase transition-colors active:translate-y-[1px] ${
                          preferredLanguage === 'ka'
                            ? 'bg-brand-green text-white'
                            : 'border-2 border-brand-green text-white hover:bg-brand-green/10'
                        }`}
                      >
                        <CountryFlag code="ge" className="text-base shrink-0 overflow-hidden rounded-sm" />
                        GEO
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await onLanguageChange?.('en');
                          } catch {
                            toast.error(t('profile.failedToUpdateLanguage'));
                          }
                        }}
                        disabled={isUpdating}
                        className={`inline-flex h-9 min-w-[80px] items-center justify-center gap-1.5 rounded-[20px] px-3 font-poppins text-sm font-semibold uppercase transition-colors active:translate-y-[1px] ${
                          preferredLanguage === 'en'
                            ? 'bg-brand-green text-white'
                            : 'border-2 border-brand-green text-white hover:bg-brand-green/10'
                        }`}
                      >
                        <CountryFlag code="gb" className="text-base shrink-0 overflow-hidden rounded-sm" />
                        ENG
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Head-to-Head card (other user only) */}
            {!isSelf && headToHead && headToHead.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex h-full flex-col rounded-[20px] p-5 bg-surface-card/40 backdrop-blur-sm"
              >
                <h3 className="text-[11px] font-poppins font-black uppercase tracking-[0.22em] text-white/45 px-1">
                  {t('friend.headToHead')}
                </h3>
                <div className="flex flex-1 items-center justify-center">
                  <WinDrawLossGrid
                    wins={headToHead.winsA}
                    draws={headToHead.draws}
                    losses={headToHead.winsB}
                    t={t}
                    size="sm"
                  />
                </div>
                <div className="flex items-center justify-center gap-2 px-1 font-poppins text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  <span>{t('profileScreen.totalMatches')}</span>
                  <span className="text-white/70">{headToHead.total}</span>
                </div>
              </motion.div>
            )}

      </div>

      {/* ─── 4. Recent Matches + Achievements (full width below) ─── */}
      <div className="space-y-5">

          {/* Recent Matches — hidden on other profiles when there are no matches */}
          {(isSelf || recentMatchesLoading || recentMatches.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <h3
              className="text-xl uppercase text-white"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0', lineHeight: 1 }}
            >
              {t('profileScreen.recentActivity')}
            </h3>
            <div className="space-y-2.5">
              {recentMatchesLoading && (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-[16px] min-h-[58px] md:min-h-[62px] px-4 md:px-5 border-2 border-brand-slate-deep bg-surface-row-deep animate-pulse">
                      <div className="size-8 md:size-10 rounded-full bg-white/10" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-24 bg-white/10 rounded" />
                        <div className="h-3 w-32 bg-white/10 rounded" />
                      </div>
                      <div className="h-5 w-12 bg-white/10 rounded" />
                    </div>
                  ))}
                </>
              )}
              {!recentMatchesLoading && recentMatchesError && (
                <div className="p-4 rounded-[16px] border-2 border-brand-red-soft/40 bg-brand-red-soft/10 text-sm font-poppins font-black uppercase tracking-wide text-brand-red-soft">
                  {recentMatchesError}
                </div>
              )}
              {!recentMatchesLoading && !recentMatchesError && recentMatches.length === 0 && (
                <div className="p-6 text-center rounded-[16px] border-2 border-brand-slate-deep bg-surface-row-deep">
                  <div className="text-2xl mb-2">⚽</div>
                  <div className="text-sm font-poppins font-black uppercase tracking-wide text-white/55">{t('recentMatches.empty')}</div>
                  <div className="text-[10px] font-poppins font-black uppercase tracking-[0.18em] text-white/30 mt-1">{t('profileScreen.recentMatchesEmptyHint')}</div>
                </div>
              )}
              {!recentMatchesLoading && !recentMatchesError && visibleMatches.map((match, index) => {
                const isWin = match.result === 'Win';
                const isLoss = match.result === 'Loss';
                const borderColor = isWin ? 'border-brand-green' : isLoss ? 'border-brand-red-deep' : 'border-brand-slate-deep';
                const rpPillTone = isWin ? 'bg-brand-green-deep text-white' : isLoss ? 'bg-brand-red-rust text-white' : 'bg-brand-slate-deep text-white';
                const competitionLabel = match.competition === 'friendly'
                  ? t('profileScreen.modeFriendly')
                  : match.competition === 'placement'
                    ? t('profileScreen.modePlacement')
                    : t('profileScreen.modeRanked');
                const isPlacementMatch = match.competition === 'placement';
                // Placement matches don't move RP per win/loss (the seed is
                // applied once), so a +/- RP number is misleading — show a
                // neutral "Placement" badge instead. Ranked still shows RP.
                const showRpDelta = !isPlacementMatch && match.competition !== 'friendly' && match.rpDelta !== null;
                const rpDelta = match.rpDelta ?? 0;
                const formattedRpDelta = `${rpDelta >= 0 ? '+' : ''}${rpDelta} RP`;
                const nav = buildProfileNavTarget(router, match.opponentId, match.opponentIsAi);
                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index, duration: 0.3 }}
                    {...nav.handlers}
                    className={`flex items-center gap-3 rounded-[16px] min-h-[76px] md:min-h-[82px] px-4 md:px-5 border-2 bg-surface-row-deep ${borderColor} ${nav.className}`}
                  >
                    {/* Avatar — rank frame using the opponent's real tier; falls
                        back to a neutral frame until the backend supplies it. */}
                    <TierFrameAvatar
                      tier={match.opponentTier ?? 'Academy'}
                      avatarCustomization={match.opponentAvatarCustomization ?? { base: match.opponentAvatarUrl ?? undefined }}
                      size="sm"
                      className="shrink-0"
                    />

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="font-poppins text-[12px] md:text-[14px] font-semibold leading-none text-white uppercase truncate">
                        {t('profileScreen.vsOpponent', { opponent: match.opponent })}
                      </div>
                      <div className="mt-1 font-poppins text-[8px] md:text-[9px] font-medium leading-none tracking-[0.08em] text-white/70 uppercase">
                        {competitionLabel} · {match.time}
                      </div>
                    </div>

                    {/* RP + Score */}
                    <div className="ml-auto flex items-center justify-end gap-3 md:gap-5 shrink-0 whitespace-nowrap">
                      {isPlacementMatch && (
                        <span className="rounded-[8px] bg-white/10 px-3 py-2 font-poppins text-[10px] md:text-[11px] font-semibold uppercase leading-none text-white/70">
                          {t('recentMatches.placementMatch')}
                        </span>
                      )}
                      {showRpDelta && (
                        <span className={`rounded-[8px] px-3 py-2 font-poppins text-[10px] md:text-[11px] font-semibold leading-none tabular-nums ${rpPillTone}`}>
                          {formattedRpDelta}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="font-poppins text-[20px] md:text-[22px] font-semibold leading-none text-white tabular-nums">
                          {match.scoreFormatted.score}
                        </span>
                        {match.scoreFormatted.suffix && (
                          <span className="font-poppins text-[10px] md:text-[11px] font-medium text-white/70">
                            {match.scoreFormatted.suffix}
                          </span>
                        )}
                        {match.scoreFormatted.badge && (
                          <span className={`rounded-[8px] px-2 py-1 font-poppins text-[9px] md:text-[10px] font-semibold uppercase ${
                            match.scoreFormatted.badgeVariant === 'red'
                              ? 'bg-brand-red-rust-deep text-brand-red-light'
                              : 'bg-white/10 text-white/70'
                          }`}>
                            {match.scoreFormatted.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Expand/Collapse toggle — compact pill, mostly transparent so
                  it sits as a tertiary action under the match list. */}
              {!recentMatchesLoading && !recentMatchesError && canExpand && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setIsMatchesExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-slate transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    {isMatchesExpanded ? (
                      <>
                        <ChevronUp className="size-3.5" />
                        {t('profileScreen.showLess')}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-3.5" />
                        {t('profileScreen.showMore', { count: hiddenCount })}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
          )}

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="space-y-3"
          >
            <h3
              className="text-xl uppercase text-white"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0', lineHeight: 1 }}
            >
              {t("achievements.sectionTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {player.achievements.map((achievement) => {
                const hasProgress = achievement.progress !== undefined && achievement.target !== undefined;
                const progressPct = hasProgress
                  ? Math.min(100, ((achievement.progress ?? 0) / Math.max(1, achievement.target ?? 1)) * 100)
                  : achievement.unlocked ? 100 : 0;

                return (
                  <div key={achievement.id} className="relative min-w-0 h-[64px] rounded-[16px] border border-brand-yellow bg-surface-card/40 backdrop-blur-sm px-3 py-2">
                    <div className="font-poppins text-[13px] font-semibold uppercase truncate text-white pr-7">
                      {resolveI18n(achievement.title, locale)}
                    </div>
                    <div className="mt-0.5 font-poppins text-[10px] font-semibold uppercase text-white/60 truncate">
                      {achievement.unlocked
                        ? t("achievements.completed")
                        : hasProgress
                          ? `${achievement.progress} / ${achievement.target}`
                          : t("achievements.locked")}
                    </div>
                    <div className="mt-1.5 h-1 w-full rounded-full overflow-hidden bg-brand-yellow/20">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                        className="h-full rounded-full bg-brand-yellow"
                      />
                    </div>
                    {achievement.unlocked && (
                      <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-brand-yellow">
                        <Check className="size-3 text-black" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
      </div>

      {isSelf && (
        <AvatarPicker
          open={isAvatarPickerOpen}
          onOpenChange={setIsAvatarPickerOpen}
          currentCustomization={player.avatarCustomization ?? null}
          onSelect={handleAvatarSelect}
          isSaving={isSavingAvatar}
        />
      )}
    </div>
  );
}

const WDL_NUM_STYLE = { fontFamily: "'Poppins', sans-serif", fontWeight: 600, lineHeight: 1 } as const;

/** The win / draw / loss number grid. */
function WinDrawLossGrid({
  wins,
  draws,
  losses,
  t,
  size = 'lg',
}: {
  wins: number;
  draws: number;
  losses: number;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  size?: 'lg' | 'sm';
}) {
  const numClass = size === 'lg' ? 'text-5xl' : 'text-4xl';
  const pad = size === 'lg' ? 'px-6 py-8' : 'px-4 py-5';
  const labelMt = 'mt-3';
  const labelClass = size === 'lg' ? 'text-sm' : 'text-xs';
  return (
    <div className={`grid w-full grid-cols-3 ${pad} text-center`}>
      <div>
        <div className={`${numClass} tabular-nums text-brand-green`} style={WDL_NUM_STYLE}>{wins}</div>
        <div className={`${labelMt} font-poppins ${labelClass} font-semibold uppercase text-white`}>{t('profileScreen.win')}</div>
      </div>
      <div>
        <div className={`${numClass} tabular-nums text-white`} style={WDL_NUM_STYLE}>{draws}</div>
        <div className={`${labelMt} font-poppins ${labelClass} font-semibold uppercase text-white`}>{t('profileScreen.draw')}</div>
      </div>
      <div>
        <div className={`${numClass} tabular-nums text-brand-red`} style={WDL_NUM_STYLE}>{losses}</div>
        <div className={`${labelMt} font-poppins ${labelClass} font-semibold uppercase text-white`}>{t('profileScreen.lose')}</div>
      </div>
    </div>
  );
}

/** A single W/D/L card with a segmented toggle to switch between the Ranked
 *  (regular) season and the World Cup event. Replaces the two stacked cards so
 *  the middle column stays compact in event mode. */
function SeasonToggleCard({
  regular,
  event,
  defaultTab = 'event',
  t,
}: {
  regular: ModeMatchStatsSummary;
  event: ModeMatchStatsSummary;
  /** Which season is selected on first render. Defaults to the World Cup
   *  event — this card only renders while an event is active, so the event
   *  season is the one the player wants to see first. */
  defaultTab?: 'ranked' | 'event';
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
}) {
  const [active, setActive] = useState<'ranked' | 'event'>(defaultTab);
  const stats = active === 'event' ? event : regular;
  const total = stats.wins + stats.draws + stats.losses;

  return (
    <div className="relative flex h-full flex-col rounded-[20px] bg-surface-card/40 backdrop-blur-sm overflow-hidden">
      {/* Segmented toggle */}
      <div className="flex gap-1 p-1.5">
        {([
          { key: 'ranked' as const, label: t('profileScreen.rankedLabel'), activeBg: 'bg-brand-blue' },
          { key: 'event' as const, label: t('profileScreen.wcEventShort'), activeBg: 'bg-brand-yellow' },
        ]).map((tab) => {
          const on = active === tab.key;
          const onText = tab.key === 'event' ? 'text-black' : 'text-white';
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[14px] px-1.5 py-2 font-poppins text-[11px] font-black uppercase tracking-wide transition-colors ${
                on ? `${tab.activeBg} ${onText}` : 'bg-white/5 text-white/50 hover:text-white/80'
              }`}
            >
              {tab.key === 'event' && (
                <Image
                  src="/assets/brand/world-cup-trophy.webp"
                  alt=""
                  width={16}
                  height={16}
                  className={`h-4 w-auto shrink-0 object-contain ${on ? '' : 'opacity-60'}`}
                />
              )}
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-1 items-center justify-center pb-1">
        {total > 0 ? (
          <WinDrawLossGrid wins={stats.wins} draws={stats.draws} losses={stats.losses} t={t} size="sm" />
        ) : (
          <div className="font-poppins text-xs font-semibold uppercase text-white/40 text-center py-6">
            {t('profileScreen.noMatchesPlayed')}
          </div>
        )}
      </div>
    </div>
  );
}

