'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Trophy, Target, Flame, Star, Award, Pencil, Check, X,
  MapPin, Globe, Users, Clock, Zap, Medal, Crown,
  ChevronDown, ChevronUp,
  type LucideIcon,
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

const achievementIconMap: Record<string, LucideIcon> = {
  Trophy, Target, Flame, Star, Award, Check, MapPin, Globe, Users, Clock, Zap, Medal, Crown,
};

import { AvatarDisplay } from '@/components/AvatarDisplay';
import { AvatarPreview } from '@/components/AvatarPreview';
import { CountryFlag } from '@/components/CountryFlag';
import { AvatarPicker } from './components/AvatarPicker';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import type { PlayerStats } from '@/types/game';
import type { MatchStatsSummary, HeadToHeadSummary, RankPosition, UserProgression } from '@/lib/domain';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';

import { getTierVisual } from '@/utils/tierVisuals';
import { RANKED_TIER_BANDS, getNextTierBand } from '@/utils/rankedTier';
import { useLocale } from '@/contexts/LocaleContext';
import type { MessageKey } from '@/lib/i18n/messages';

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
  opponentAvatarUrl: string | null;
  opponentAvatarCustomization: RecentMatchSummary["opponent"]["avatarCustomization"];
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
    opponentAvatarUrl: match.opponent.avatarUrl,
    opponentAvatarCustomization: match.opponent.avatarCustomization,
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
  progression?: UserProgression | null;
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



  const handleNameChange = async () => {
    try {
      if (editedName.trim() !== player.username) {
        await onNameChange?.(editedName.trim());
      }
      setIsEditingName(false);
    } catch (error) {
      toast.error('Failed to update name', {
        description: error instanceof Error ? error.message : 'Failed to update name',
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
      toast.error('Failed to update avatar', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSavingAvatar(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-5 lg:px-6 lg:py-7 space-y-4 lg:space-y-5 font-fun">

      {/* ─── 1. Hero ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden px-1 py-4 lg:py-6"
      >
        <div className="relative flex flex-col lg:flex-row items-center gap-5 lg:gap-7">
          {/* Avatar — blue square, character anchored to bottom per Figma */}
          {isSelf ? (
            <button
              type="button"
              onClick={() => setIsAvatarPickerOpen(true)}
              className="group relative size-36 lg:size-40 rounded-[12px] bg-brand-blue flex items-end justify-center overflow-hidden shrink-0 transition-transform active:translate-y-[2px]"
              aria-label={t("profileScreen.changeAvatar")}
            >
              <AvatarPreview
                customization={player.avatarCustomization ?? {}}
                width={130}
                className="lg:hidden translate-y-4"
              />
              <AvatarPreview
                customization={player.avatarCustomization ?? {}}
                width={150}
                className="hidden lg:block translate-y-5"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-black uppercase tracking-[0.18em] opacity-0 group-hover:opacity-100 transition-opacity">
                Edit
              </span>
            </button>
          ) : (
            <div className="relative size-36 lg:size-40 rounded-[12px] bg-brand-blue flex items-end justify-center overflow-hidden shrink-0">
              <AvatarPreview
                customization={player.avatarCustomization ?? {}}
                width={130}
                className="lg:hidden translate-y-4"
              />
              <AvatarPreview
                customization={player.avatarCustomization ?? {}}
                width={150}
                className="hidden lg:block translate-y-5"
              />
            </div>
          )}

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
                  <button onClick={handleNameChange} disabled={isUpdating} className="size-10 rounded-[8px] bg-brand-green flex items-center justify-center text-white active:translate-y-[2px] transition-transform">
                    <Check className="size-5" />
                  </button>
                  <button onClick={() => setIsEditingName(false)} disabled={isUpdating} className="size-10 rounded-[8px] bg-white/[0.06] flex items-center justify-center text-white/70 active:translate-y-[2px] transition-transform">
                    <X className="size-5" />
                  </button>
                </div>
              ) : (
                <>
                  <h1
                    className="truncate text-3xl lg:text-5xl uppercase text-white max-w-[220px] lg:max-w-md"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0', lineHeight: 1 }}
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
          {(() => {
            const ladder = [...RANKED_TIER_BANDS].reverse(); // ascending: Academy → GOAT
            const goatRp = ladder[ladder.length - 1].minRp; // 3200
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
            const overallPct = Math.min(100, Math.max(0, (displayRp / goatRp) * 100));

            const currentBandMin = currentIdx >= 0 ? ladder[currentIdx].minRp : 0;
            const bandTarget = next ? next.minRp : goatRp;
            const bandSpan = Math.max(1, bandTarget - currentBandMin);
            const bandPct = next
              ? Math.min(100, Math.max(0, ((displayRp - currentBandMin) / bandSpan) * 100))
              : 100;
            const currentVisual = currentTier ? getTierVisual(currentTier) : null;
            const nextVisual = next ? getTierVisual(next.tier) : null;

            return (
              <>
                {/* Hero row: current tier badge → big RP + progress → next tier badge.
                    Mobile shrinks the side cards (gap, width, padding, icon, font)
                    so the centre column — the progress bar — gets significantly more
                    horizontal room. Desktop keeps the original chunky 160px squares. */}
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-6">
                  {/* Current tier — big blue square card per Figma */}
                  <div className="flex w-[84px] sm:w-[160px] flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-[16px] sm:rounded-[20px] bg-brand-blue p-2.5 sm:p-4">
                    {currentVisual?.Icon ? (
                      <currentVisual.Icon className="size-9 sm:size-16 text-brand-yellow" weight="light" />
                    ) : (
                      <TrophyPh className="size-9 sm:size-16 text-brand-yellow" weight="light" />
                    )}
                    <div className="text-center">
                      <div className="font-poppins text-[9px] sm:text-[11px] font-semibold uppercase text-white/60">{t("profileScreen.current")}</div>
                      <div className="mt-0.5 sm:mt-1 font-poppins text-[11px] sm:text-base font-semibold uppercase leading-tight text-white">
                        {currentTier
                          ? (() => {
                              const key = `tiers.${currentTier}` as MessageKey;
                              const translated = t(key);
                              return translated === key ? currentTier : translated;
                            })()
                          : t("profileScreen.unranked")}
                      </div>
                      <div className="mt-0.5 sm:mt-1 font-poppins text-[10px] sm:text-[11px] font-semibold uppercase tabular-nums text-white/70">
                        {displayRp} RP
                      </div>
                    </div>
                  </div>

                  {/* Center — big RP, thick progress, RP-to-next label */}
                  <div className="min-w-0 flex flex-col items-center px-2 w-full">
                    <div
                      className="font-poppins text-3xl sm:text-5xl tabular-nums text-brand-yellow leading-none"
                      style={{ fontWeight: 600 }}
                    >
                      {displayRp} <span className="text-xl sm:text-2xl">RP</span>
                    </div>
                    <div className="mt-6 sm:mt-8 relative h-[18px] w-full bg-brand-green-deep overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${bandPct}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.25 }}
                        className="absolute inset-y-0 left-0 rounded-r-full bg-brand-green"
                      />
                    </div>
                    <div className="mt-3 sm:mt-4 font-poppins text-xs sm:text-base font-semibold uppercase text-white/50">
                      {next ? (
                        t("profileScreen.rpToNextTier", { rp: rpToNext })
                      ) : (
                        t("profileScreen.maxRankAchieved")
                      )}
                    </div>
                    <div className="mt-1 flex w-full items-center justify-between font-poppins text-[10px] font-semibold uppercase tabular-nums text-white/30">
                      <span>{currentBandMin} RP</span>
                      <span>{Math.round(bandPct)}%</span>
                      <span>{bandTarget} RP</span>
                    </div>
                  </div>

                  {/* Next tier — same mobile-shrink treatment as the
                      current-tier card; desktop keeps the full 160px square. */}
                  {next ? (
                    <div className="flex w-[84px] sm:w-[160px] flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-[16px] sm:rounded-[20px] bg-brand-blue/30 border-2 border-brand-blue p-2.5 sm:p-4">
                      {nextVisual?.Icon ? (
                        <nextVisual.Icon className="size-9 sm:size-16 text-white/80" weight="light" />
                      ) : (
                        <TrophyPh className="size-9 sm:size-16 text-white/80" weight="light" />
                      )}
                      <div className="text-center">
                        <div className="font-poppins text-[9px] sm:text-[11px] font-semibold uppercase text-white/50">{t("profileScreen.next")}</div>
                        <div className="mt-0.5 sm:mt-1 font-poppins text-[11px] sm:text-base font-semibold uppercase leading-tight text-white/85">
                          {(() => {
                            const key = `tiers.${next.tier}` as MessageKey;
                            const translated = t(key);
                            return translated === key ? next.tier : translated;
                          })()}
                        </div>
                        <div className="mt-0.5 sm:mt-1 font-poppins text-[10px] sm:text-[11px] font-semibold uppercase tabular-nums text-white/50">
                          {next.minRp} RP
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex w-[84px] sm:w-[160px] flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-[16px] sm:rounded-[20px] bg-brand-yellow/15 border-2 border-brand-yellow p-2.5 sm:p-4">
                      <TrophyPh className="size-9 sm:size-16 text-brand-yellow" weight="light" />
                      <div className="text-center">
                        <div className="font-poppins text-[9px] sm:text-[11px] font-semibold uppercase text-brand-yellow">{t("profileScreen.achieved")}</div>
                        <div className="mt-0.5 sm:mt-1 font-poppins text-[11px] sm:text-base font-semibold uppercase leading-tight text-white">
                          GOAT
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Full ladder — every tier visible with current highlighted */}
                <div className="mt-6">
                  <div className="relative flex items-end justify-between px-1">
                    {ladder.map((band, idx) => {
                      const visual = getTierVisual(band.tier);
                      const isCurrent = idx === currentIdx;
                      const isPast = idx < currentIdx;
                      return (
                        <div
                          key={band.tier}
                          className="flex flex-col items-center gap-1 transition-transform"
                          title={`${band.tier} (${band.minRp}+ RP)`}
                          style={{
                            opacity: isCurrent ? 1 : isPast ? 0.7 : 0.25,
                            transform: isCurrent ? 'scale(1.2)' : 'scale(1)',
                          }}
                        >
                          <visual.Icon
                            className={`size-5 sm:size-6 ${isCurrent ? 'text-brand-yellow' : isPast ? 'text-brand-green' : 'text-white/50'}`}
                            weight={isCurrent ? 'regular' : 'light'}
                          />
                          {isCurrent && <div className="size-1 rounded-full bg-brand-yellow" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 relative h-1 rounded-full bg-white/8 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${overallPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.35 }}
                      className="absolute inset-y-0 left-0 rounded-full bg-brand-green"
                    />
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </motion.div>

      {/* ─── 3. Stat cards row (3 columns on desktop) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Rank Card — translucent blue with brand-blue border outline.
              Mirrors the "next tier" badge style elsewhere on this page so
              the card sits as an outline panel rather than a solid fill. */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-[20px] overflow-hidden border-2 border-brand-blue bg-surface-card/40 backdrop-blur-sm"
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
                    <tierVisual.Icon className="size-10 text-brand-yellow mb-1" weight="light" />
                    <h2
                      className="text-xl uppercase text-white text-center"
                      style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0', lineHeight: 1 }}
                    >
                      {rankedProfile!.tier}
                    </h2>
                    <p className="font-poppins text-[11px] font-semibold uppercase text-white/50 mt-2 mb-4">{t("profileScreen.currentSeason")}</p>

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

            {/* W/L/D Breakdown — two stacked blue cards per Figma, fill column height */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="h-full flex flex-col gap-3"
            >
              {/* Mode header card */}
              <div className="flex h-12 shrink-0 items-center justify-between rounded-[20px] border-2 border-brand-blue bg-surface-card/40 backdrop-blur-sm px-6">
                <span className="font-poppins text-sm font-semibold uppercase text-white">
                  {t('profileScreen.rankedLabel')}: <span className="text-brand-yellow">{rankedStats?.gamesPlayed ?? 0}</span>
                </span>
                <span className="font-poppins text-sm font-semibold uppercase text-white">
                  {t('profileScreen.friendlyLabel')}: <span className="text-white">{friendlyStats?.gamesPlayed ?? 0}</span>
                </span>
              </div>

              {/* W/D/L card — flex-1 fills remaining column height */}
              <div className="flex-1 flex items-center justify-center rounded-[20px] border-2 border-brand-blue bg-surface-card/40 backdrop-blur-sm">
                {wldTotal > 0 ? (
                  <div className="grid w-full grid-cols-3 px-6 py-8 text-center">
                    <div>
                      <div
                        className="text-5xl tabular-nums text-brand-green"
                        style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, lineHeight: 1 }}
                      >
                        {wins}
                      </div>
                      <div className="mt-3 font-poppins text-sm font-semibold uppercase text-white">{t('profileScreen.win')}</div>
                    </div>
                    <div>
                      <div
                        className="text-5xl tabular-nums text-white"
                        style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, lineHeight: 1 }}
                      >
                        {draws}
                      </div>
                      <div className="mt-3 font-poppins text-sm font-semibold uppercase text-white">{t('profileScreen.draw')}</div>
                    </div>
                    <div>
                      <div
                        className="text-5xl tabular-nums text-brand-red"
                        style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, lineHeight: 1 }}
                      >
                        {losses}
                      </div>
                      <div className="mt-3 font-poppins text-sm font-semibold uppercase text-white">{t('profileScreen.lose')}</div>
                    </div>
                  </div>
                ) : (
                  <div className="font-poppins text-sm font-semibold uppercase text-white/50 text-center py-10">
                    {t('profileScreen.noMatchesPlayed')}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Preferences (self only) — blue card per Figma */}
            {isSelf && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-[20px] border-2 border-brand-blue bg-surface-card/40 backdrop-blur-sm px-6 py-5"
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
                  <div className="flex items-center justify-between py-3.5">
                    <span className="font-poppins text-sm font-semibold uppercase text-white/50">{t('profileScreen.club')}</span>
                    <div className="flex items-center gap-2">
                      {isEditingClub ? (
                        <div className="w-48">
                          <ClubSelect
                            value={favoriteClub ?? ''}
                            onChange={async (val) => {
                              try {
                                await onClubChange?.(val);
                                setIsEditingClub(false);
                              } catch {
                                toast.error('Failed to update club');
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <>
                          <span className="font-poppins text-sm font-semibold uppercase text-white truncate max-w-[160px]">
                            {favoriteClub || 'Not set'}
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
                            toast.error('Failed to update language');
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
                            toast.error('Failed to update language');
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
                className="rounded-[10px] p-5"
                style={{ backgroundColor: '#1B2F36' }}
              >
                <h3 className="text-[11px] font-fun font-black uppercase tracking-[0.22em] text-white/45 mb-4">
                  Head to Head
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-fun font-black uppercase tracking-wide text-white">{t("profileScreen.yourWins")}</span>
                    <span
                      className="text-xl tabular-nums text-brand-green"
                      style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
                    >
                      {headToHead.winsA}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-fun font-black uppercase tracking-wide text-white">{t("profileScreen.theirWins")}</span>
                    <span
                      className="text-xl tabular-nums text-brand-red-soft"
                      style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
                    >
                      {headToHead.winsB}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-fun font-black uppercase tracking-wide text-white">{t("profileScreen.draws")}</span>
                    <span
                      className="text-xl tabular-nums text-white/55"
                      style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
                    >
                      {headToHead.draws}
                    </span>
                  </div>
                  <div className="h-px bg-white/8" />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-fun font-black uppercase tracking-[0.2em] text-white/40">{t("profileScreen.totalMatches")}</span>
                    <span className="text-sm font-fun font-black tabular-nums text-white">{headToHead.total}</span>
                  </div>
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
                    <div key={i} className="flex items-center gap-3 rounded-[16px] min-h-[58px] md:min-h-[62px] px-4 md:px-5 border-2 border-brand-slate-deep bg-[#041217] animate-pulse">
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
                <div className="p-4 rounded-[16px] border-2 border-brand-red-soft/40 bg-brand-red-soft/10 text-sm font-fun font-black uppercase tracking-wide text-brand-red-soft">
                  {recentMatchesError}
                </div>
              )}
              {!recentMatchesLoading && !recentMatchesError && recentMatches.length === 0 && (
                <div className="p-6 text-center rounded-[16px] border-2 border-brand-slate-deep bg-[#041217]">
                  <div className="text-2xl mb-2">⚽</div>
                  <div className="text-sm font-fun font-black uppercase tracking-wide text-white/55">No recent matches yet.</div>
                  <div className="text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/30 mt-1">Play a match and it&apos;ll show up here.</div>
                </div>
              )}
              {!recentMatchesLoading && !recentMatchesError && visibleMatches.map((match, index) => {
                const isWin = match.result === 'Win';
                const isLoss = match.result === 'Loss';
                const borderColor = isWin ? 'border-brand-green' : isLoss ? 'border-brand-red-deep' : 'border-brand-slate-deep';
                const rpPillTone = isWin ? 'bg-brand-green-deep text-white' : isLoss ? 'bg-[#B8401D] text-white' : 'bg-brand-slate-deep text-white';
                const competitionLabel = match.competition === 'friendly'
                  ? t('profileScreen.modeFriendly')
                  : match.competition === 'placement'
                    ? t('profileScreen.modePlacement')
                    : t('profileScreen.modeRanked');
                const showRpDelta = match.competition !== 'friendly' && match.rpDelta !== null;
                const rpDelta = match.rpDelta ?? 0;
                const formattedRpDelta = `${rpDelta >= 0 ? '+' : ''}${rpDelta} RP`;
                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index, duration: 0.3 }}
                    className={`flex items-center gap-3 rounded-[16px] min-h-[58px] md:min-h-[62px] px-4 md:px-5 border-2 bg-[#041217] ${borderColor}`}
                  >
                    {/* Avatar */}
                    <div className="relative size-8 md:size-10 shrink-0 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
                      <AvatarDisplay
                        customization={match.opponentAvatarCustomization ?? { base: match.opponentAvatarUrl ?? undefined }}
                        size="xs"
                      />
                    </div>

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
                              ? 'bg-[#4D1C1B] text-brand-red-light'
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
                const Icon = achievementIconMap[achievement.icon] || Trophy;
                const hasProgress = achievement.progress !== undefined && achievement.target !== undefined;
                const progressPct = hasProgress
                  ? Math.min(100, ((achievement.progress ?? 0) / Math.max(1, achievement.target ?? 1)) * 100)
                  : achievement.unlocked ? 100 : 0;

                return (
                  <div key={achievement.id} className="flex items-center gap-2">
                    {/* Icon card — yellow outline matches the achievement
                        accent colour (the trophy icons + progress fill are
                        already brand-yellow), creating a tighter colour story
                        than the previous blue border. */}
                    <div className="flex size-[64px] shrink-0 items-center justify-center rounded-[16px] border-2 border-brand-yellow bg-surface-card/40 backdrop-blur-sm">
                      <Icon
                        className={`size-8 ${achievement.unlocked ? 'text-brand-yellow' : 'text-brand-yellow/80'}`}
                        strokeWidth={2.5}
                      />
                    </div>

                    {/* Body card */}
                    <div className="relative flex-1 min-w-0 h-[64px] rounded-[16px] border-2 border-brand-yellow bg-surface-card/40 backdrop-blur-sm px-3 py-2">
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
