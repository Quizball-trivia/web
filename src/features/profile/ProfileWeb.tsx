'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Trophy, Target, Flame, Star, Award, Pencil, Check, X,
  MapPin, Globe, Users, Clock, LogOut, Zap, Medal, Crown,
  ChevronDown, ChevronUp, Coins, Ticket,
  type LucideIcon,
} from 'lucide-react';
import { COLLAPSED_MATCHES_COUNT, MAX_MATCHES_COUNT } from '@/lib/constants/matches';
import { formatMatchScore, type FormattedMatchScore } from '@/utils/matchScore';
import type { RecentMatchSummary } from '@/lib/domain/recentMatch';

function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
}

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
import { AvatarPicker } from './components/AvatarPicker';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import type { PlayerStats } from '@/types/game';
import type { MatchStatsSummary, HeadToHeadSummary, RankPosition, UserProgression } from '@/lib/domain';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';
import { useAvatarUrl } from './hooks/useAvatarUrl';
import { useStoreWallet } from '@/lib/queries/store.queries';

import { getTierVisual } from '@/utils/tierVisuals';
import { RANKED_TIER_BANDS, getNextTierBand } from '@/utils/rankedTier';

import ClubSelect from '@/features/onboarding/ClubSelect';

export interface ProfileRecentMatch {
  id: string | number;
  mode: string;
  competition: "friendly" | "placement" | "ranked";
  result: 'Win' | 'Loss' | 'Draw';
  time: string;
  rpDelta: number | null;
  opponent: string;
  scoreFormatted: FormattedMatchScore;
}

export function toProfileRecentMatch(match: RecentMatchSummary): ProfileRecentMatch {
  return {
    id: match.matchId,
    mode: match.mode === "ranked" ? "Ranked" : "Friendly",
    competition: match.competition,
    result: match.result === "win" ? "Win" : match.result === "loss" ? "Loss" : "Draw",
    time: match.timeLabel,
    rpDelta: match.rpDelta,
    opponent: match.opponent.username,
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
  onSignOut?: () => void;
  isUpdating?: boolean;
}

export function ProfileWeb({
  viewMode = 'self',
  player, avatarUrl, country = null, favoriteClub, preferredLanguage,
  progression = null,
  globalRank = null, countryRank = null,
  matchStatsSummary = null,
  rankedProfile = null, rankedProfileLoading = false,
  recentMatches = [], recentMatchesLoading = false, recentMatchesError = null,
  headToHead = null,
  onNameChange, onAvatarChange, onClubChange, onLanguageChange,
  onSignOut, isUpdating = false,
}: ProfileWebProps) {
  const isSelf = viewMode === 'self';
  const { data: storeWallet } = useStoreWallet();
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

  const { avatarBase, resolvedAvatarUrl, googleAvatarUrl } = useAvatarUrl({
    avatarUrl,
    avatarCustomization: player.avatarCustomization,
    fallbackAvatar: player.avatar,
  });

  const overallStats = matchStatsSummary?.overall;
  const rankedStats = matchStatsSummary?.ranked;
  const friendlyStats = matchStatsSummary?.friendly;
  const displayedCoins = isSelf ? (storeWallet?.coins ?? 0) : player.coins;
  const progressionLevel = progression?.level ?? 1;
  const progressionTotalXp = progression?.totalXp ?? 0;
  const progressionCurrentLevelXp = progression?.currentLevelXp ?? 0;
  const progressionXpForNextLevel = progression?.xpForNextLevel ?? 100;
  const progressionPct = Math.max(0, Math.min(100, progression?.progressPct ?? 0));
  const winRate = Math.round(overallStats?.winRate ?? 0);
  const gamesPlayed = overallStats?.gamesPlayed ?? 0;
  const wins = overallStats?.wins ?? 0;
  const losses = overallStats?.losses ?? 0;
  const draws = overallStats?.draws ?? 0;
  const wldTotal = wins + losses + draws;
  const winPct = wldTotal > 0 ? (wins / wldTotal) * 100 : 0;
  const lossPct = wldTotal > 0 ? (losses / wldTotal) * 100 : 0;
  const drawPct = wldTotal > 0 ? (draws / wldTotal) * 100 : 0;

  const displayedTickets = isSelf ? (storeWallet?.tickets ?? 0) : player.tickets;



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

      {/* ─── 1. Hero Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[10px] p-5 lg:p-7"
        style={{ backgroundColor: '#1B2F36' }}
      >
        <div className="relative flex flex-col lg:flex-row items-center lg:items-start gap-5 lg:gap-7">
          {/* Avatar */}
          {isSelf ? (
            <button
              type="button"
              onClick={() => setIsAvatarPickerOpen(true)}
              className="group relative size-24 lg:size-28 rounded-[10px] bg-black/30 flex items-center justify-center overflow-hidden shrink-0 transition-transform active:translate-y-[2px]"
              aria-label="Change avatar"
            >
              <AvatarDisplay
                customization={{ ...(player.avatarCustomization ?? { base: player.avatar }), base: avatarBase }}
                size="xl"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-black uppercase tracking-[0.18em] opacity-0 group-hover:opacity-100 transition-opacity">
                Edit
              </span>
            </button>
          ) : (
            <div className="relative size-24 lg:size-28 rounded-[10px] bg-black/30 flex items-center justify-center overflow-hidden shrink-0">
              <AvatarDisplay
                customization={{ ...(player.avatarCustomization ?? { base: player.avatar }), base: avatarBase }}
                size="xl"
              />
            </div>
          )}

          {/* Info Column */}
          <div className="flex-1 min-w-0 text-center lg:text-left space-y-3">
            {/* Name */}
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
                  <button onClick={handleNameChange} disabled={isUpdating} className="size-10 rounded-[8px] bg-[#38B60E] flex items-center justify-center text-white active:translate-y-[2px] transition-transform">
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
                      aria-label="Edit nickname"
                      disabled={isUpdating}
                    >
                      <Pencil className="size-4" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Tier badge */}
            <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
              {showRankTier && (
                <span className="inline-flex items-center gap-1 text-[11px] font-fun font-black uppercase tracking-[0.18em] text-white">
                  {tierVisual.emoji} {rankedProfile!.tier}
                </span>
              )}
              {rankedDataReady && isPlacementInProgress && (
                <span className="inline-flex items-center gap-1 text-[11px] font-fun font-black uppercase tracking-[0.18em] text-white/55">
                  Placement {placementPlayed}/{placementRequired}
                </span>
              )}
              {rankedProfileLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] font-fun font-black uppercase tracking-[0.18em] text-white/40 animate-pulse">
                  Loading…
                </span>
              )}
            </div>

            {/* Economy: Coins & Tickets (self only) */}
            {isSelf && (
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-fun font-black tabular-nums text-[#FFE500]">
                  <Coins className="size-4" />
                  {displayedCoins.toLocaleString()}
                </span>
                {displayedTickets !== undefined && (
                  <>
                    <div className="w-px h-4 bg-white/10" />
                    <span className="inline-flex items-center gap-1.5 text-sm font-fun font-black tabular-nums text-[#CE82FF]">
                      <Ticket className="size-4" />
                      {displayedTickets}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Inline quick stats — fills the empty space under name/club/coins */}
            <div className="grid grid-cols-3 gap-2 lg:gap-3 pt-2 lg:pt-3 border-t border-white/8">
              <div className="text-center lg:text-left">
                <div
                  className="text-2xl lg:text-3xl tabular-nums text-[#38B60E]"
                  style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0', lineHeight: 1 }}
                >
                  {winRate}%
                </div>
                <div className="text-[9px] lg:text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/40 mt-1.5">Win Rate</div>
              </div>
              <div className="text-center lg:text-left">
                <div
                  className="text-2xl lg:text-3xl tabular-nums text-[#FF9600]"
                  style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0', lineHeight: 1 }}
                >
                  {rankedProfile?.currentWinStreak ?? 0}
                </div>
                <div className="text-[9px] lg:text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/40 mt-1.5">Win Streak</div>
              </div>
              <div className="text-center lg:text-left">
                <div
                  className="text-2xl lg:text-3xl tabular-nums text-[#FFE500]"
                  style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0', lineHeight: 1 }}
                >
                  {gamesPlayed}
                </div>
                <div className="text-[9px] lg:text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/40 mt-1.5">Matches</div>
              </div>
            </div>
          </div>

          {/* RP Progress Card */}
          <div className="w-full lg:w-72 bg-black/25 rounded-[10px] p-4 mt-2 lg:mt-0 shrink-0">
            {rankedProfileLoading ? (
              <div className="space-y-2.5 animate-pulse">
                <div className="h-3 w-28 bg-white/10 rounded" />
                <div className="h-3.5 bg-white/10 rounded-full" />
                <div className="flex items-center justify-between">
                  <div className="h-6 w-16 bg-white/10 rounded" />
                  <div className="h-3 w-14 bg-white/10 rounded" />
                </div>
              </div>
            ) : isPlacementInProgress ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/45">Placement</span>
                  <span className="text-xs font-fun font-black text-[#FFE500] tabular-nums">{placementPlayed}/{placementRequired}</span>
                </div>
                <div className="relative h-2.5 bg-[#2D950B]/50 rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(placementPlayed / placementRequired) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute inset-y-0 left-0 rounded-full bg-[#FFE500]"
                  />
                </div>
                <div className="text-[10px] font-fun font-black uppercase tracking-wide text-white/45">
                  Play placement matches to get your rank.
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/45">Rank Points</span>
                  {rankedProfile?.currentWinStreak && rankedProfile.currentWinStreak > 1 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-fun font-black uppercase tracking-wide text-[#FF9600]">
                      <Flame className="size-3" />
                      {rankedProfile.currentWinStreak} streak
                    </span>
                  ) : null}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span
                    className="text-3xl tabular-nums text-[#FFE500]"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0', lineHeight: 1 }}
                  >
                    {displayRp}
                  </span>
                  <span className="text-sm font-fun font-black uppercase text-[#FFE500]">RP</span>
                </div>
                <div className="relative h-2.5 bg-[#2D950B]/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    className="absolute inset-y-0 left-0 rounded-full bg-[#FFE500]"
                  />
                </div>
              </>
            )}

            <div className="mt-4 pt-4 border-t border-white/8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/45">XP Progress</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-fun font-black uppercase tracking-wide text-[#1CB0F6]">
                  <Zap className="size-3.5" />
                  Level {progressionLevel}
                </span>
              </div>
              <div className="flex items-end justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="text-lg font-fun font-black tabular-nums text-white">
                    {progressionCurrentLevelXp.toLocaleString()} / {progressionXpForNextLevel.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/35">
                    Current level XP
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/35">Total XP</div>
                  <div className="text-sm font-fun font-black tabular-nums text-white">{progressionTotalXp.toLocaleString()}</div>
                </div>
              </div>
              <div className="relative h-2.5 bg-white/8 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressionPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  className="absolute inset-y-0 left-0 rounded-full bg-[#1CB0F6]"
                />
              </div>
              <div className="text-[10px] font-fun font-black uppercase tracking-wide text-white/45">
                {progressionPct}% to level {progressionLevel + 1}
              </div>
            </div>
          </div>
        </div>

        {/* ── Rank Progression — single track, no cards ── */}
        <div className="mt-5 pt-5 border-t border-white/8">
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
                {/* Section label */}
                <div className="mb-4 flex items-center justify-between gap-3 px-1">
                  <span className="text-[11px] font-fun font-black uppercase tracking-[0.22em] text-white/45">
                    Rank Progression
                  </span>
                  <span className="text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/35 tabular-nums">
                    {displayRp} / {goatRp} RP · {Math.round(overallPct)}%
                  </span>
                </div>

                {/* Hero row: current tier badge → progress bar → next tier badge */}
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-5">
                  {/* Current tier */}
                  <div className="flex items-center gap-3 rounded-[12px] bg-[#FFE500]/10 border border-[#FFE500]/30 px-3 py-2.5 sm:px-4 sm:py-3 shadow-[0_0_24px_rgba(255,229,0,0.15)]">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-[#FFE500]/25 blur-md" />
                      <div className="relative text-3xl sm:text-4xl drop-shadow-[0_2px_8px_rgba(255,229,0,0.5)]">
                        {currentVisual?.emoji ?? '⭐'}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-fun font-black uppercase tracking-[0.22em] text-white/55">Current</div>
                      <div
                        className="text-base sm:text-lg uppercase text-white leading-none mt-1"
                        style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
                      >
                        {currentTier ?? 'Unranked'}
                      </div>
                      <div className="mt-1 text-[10px] font-fun font-black uppercase tracking-wide text-[#FFE500] tabular-nums">
                        {displayRp} RP
                      </div>
                    </div>
                  </div>

                  {/* Progress bar with RP-to-next callout */}
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/45">
                        Progress
                      </span>
                      {next ? (
                        <span className="text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/65">
                          <span className="text-[#FFE500] tabular-nums">{rpToNext} RP</span>
                          <span className="mx-1.5 text-white/35">to next</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-fun font-black uppercase tracking-[0.18em] text-[#FFE500]">
                          Max rank
                        </span>
                      )}
                    </div>
                    <div className="relative h-3 rounded-full bg-white/8 overflow-hidden border border-white/8">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${bandPct}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.25 }}
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#FFE500] to-[#FF9600] shadow-[0_0_12px_rgba(255,229,0,0.5)]"
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[9px] font-fun font-black uppercase tracking-[0.18em] text-white/35 tabular-nums">
                      <span>{currentBandMin} RP</span>
                      <span>{Math.round(bandPct)}%</span>
                      <span>{bandTarget} RP</span>
                    </div>
                  </div>

                  {/* Next tier */}
                  {next ? (
                    <div className="flex items-center gap-3 rounded-[12px] bg-white/[0.04] border border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
                      <div className="text-3xl sm:text-4xl opacity-70 grayscale-[30%]">
                        {nextVisual?.emoji ?? '🏆'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] font-fun font-black uppercase tracking-[0.22em] text-white/45">Next</div>
                        <div
                          className="text-base sm:text-lg uppercase text-white/85 leading-none mt-1"
                          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
                        >
                          {next.tier}
                        </div>
                        <div className="mt-1 text-[10px] font-fun font-black uppercase tracking-wide text-white/45 tabular-nums">
                          {next.minRp} RP
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-[12px] bg-[#FFE500]/10 border border-[#FFE500]/30 px-3 py-2.5 sm:px-4 sm:py-3">
                      <div className="text-3xl sm:text-4xl">🏆</div>
                      <div className="min-w-0">
                        <div className="text-[9px] font-fun font-black uppercase tracking-[0.22em] text-[#FFE500]">Achieved</div>
                        <div
                          className="text-base sm:text-lg uppercase text-white leading-none mt-1"
                          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
                        >
                          GOAT
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Full ladder — every tier visible with current highlighted */}
                <div className="mt-5 pt-4 border-t border-white/8">
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
                          <div className="text-lg sm:text-xl">{visual.emoji}</div>
                          {isCurrent && <div className="size-1 rounded-full bg-[#FFE500]" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 relative h-1 rounded-full bg-white/8 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${overallPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.35 }}
                      className="absolute inset-y-0 left-0 rounded-full bg-[#38B60E]"
                    />
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </motion.div>

      {/* ─── 3. Main Content Grid ─── */}
      <div className="grid grid-cols-12 gap-5 lg:gap-8">

        {/* Left Column */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <div className="lg:sticky lg:top-24 space-y-5">

            {/* Rank Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-[10px] overflow-hidden"
              style={{ backgroundColor: '#1B2F36' }}
            >
              <div className="p-5 flex flex-col items-center">
                {rankedProfileLoading && (
                  <div className="animate-pulse space-y-3 w-full flex flex-col items-center">
                    <div className="h-10 w-10 bg-white/8 rounded" />
                    <div className="h-5 w-32 bg-white/8 rounded" />
                    <div className="h-3 w-24 bg-white/8 rounded" />
                    <div className="w-full space-y-1.5 mt-2">
                      <div className="h-10 bg-white/8 rounded-[8px]" />
                      <div className="h-10 bg-white/8 rounded-[8px]" />
                    </div>
                  </div>
                )}
                {showRankTier && (
                  <>
                    <div className="text-4xl mb-1">{tierVisual.emoji}</div>
                    <h2
                      className="text-xl uppercase text-white"
                      style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0', lineHeight: 1 }}
                    >
                      {rankedProfile!.tier}
                    </h2>
                    <p className="text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/35 mt-2 mb-4">Current Season</p>

                    <div className="w-full space-y-1.5">
                      <div className="flex justify-between items-center px-3 py-2.5 bg-white/[0.03] rounded-[8px]">
                        <div className="flex items-center gap-2">
                          <Globe className="size-4 text-[#1CB0F6]" />
                          <span className="text-xs font-fun font-black uppercase tracking-wide text-white">World</span>
                        </div>
                        <span
                          className="text-sm tabular-nums text-[#1CB0F6]"
                          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
                        >
                          {globalRank ? `#${globalRank.rank}` : '#--'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center px-3 py-2.5 bg-white/[0.03] rounded-[8px]">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-[#FF4B4B]" />
                          <span className="text-xs font-fun font-black uppercase tracking-wide text-white">Country</span>
                        </div>
                        <span
                          className="text-sm tabular-nums text-[#FF4B4B]"
                          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
                        >
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
                    <p className="text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/35 mt-2 mb-4">
                      Placement {placementPlayed}/{placementRequired}
                    </p>
                    <p className="text-xs font-fun font-black uppercase tracking-wide text-white/50 text-center">
                      Play placement matches to get your rank.
                    </p>
                  </>
                )}
              </div>
            </motion.div>

            {/* W/L/D Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="rounded-[10px] p-5"
              style={{ backgroundColor: '#1B2F36' }}
            >
              <h3 className="text-[11px] font-fun font-black uppercase tracking-[0.22em] text-white/45 mb-4">
                Win · Loss · Draw
              </h3>

              {wldTotal > 0 ? (
                <>
                  <div className="flex rounded-full overflow-hidden h-3 mb-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${winPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                      style={{ backgroundColor: '#38B60E' }}
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${drawPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                      className="bg-white/25"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${lossPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
                      style={{ backgroundColor: '#FF4B4B' }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-fun font-black uppercase tracking-wide tabular-nums">
                    <span className="text-[#38B60E]">{wins}W</span>
                    <span className="text-white/45">{draws}D</span>
                    <span className="text-[#FF4B4B]">{losses}L</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/8 flex justify-between text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/45">
                    <span>Ranked {rankedStats?.gamesPlayed ?? 0}</span>
                    <span>Friendly {friendlyStats?.gamesPlayed ?? 0}</span>
                  </div>
                </>
              ) : (
                <div className="text-xs font-fun font-black uppercase tracking-wide text-white/40 text-center py-2">
                  No matches played yet.
                </div>
              )}
            </motion.div>

            {/* Preferences (self only) */}
            {isSelf && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-[10px] p-5"
                style={{ backgroundColor: '#1B2F36' }}
              >
                <h3 className="text-[11px] font-fun font-black uppercase tracking-[0.22em] text-white/45 mb-4">
                  Preferences
                </h3>
                <div className="space-y-3">
                  {/* Country */}
                  {country && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-fun font-black uppercase tracking-[0.2em] text-white/40">Country</span>
                        <span className="text-sm font-fun font-black uppercase tracking-wide text-white">{countryCodeToFlag(country)} {countryCodeToName(country)}</span>
                      </div>
                      <div className="h-px bg-white/8" />
                    </>
                  )}
                  {/* Club */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-fun font-black uppercase tracking-[0.2em] text-white/40">Club</span>
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
                          <span className="text-sm font-fun font-black uppercase tracking-wide text-white">
                            {favoriteClub || 'Not set'}
                          </span>
                          <button
                            onClick={() => setIsEditingClub(true)}
                            className="text-white/35 hover:text-white disabled:opacity-50 transition-colors"
                            aria-label="Edit favorite club"
                            disabled={isUpdating}
                          >
                            <Pencil className="size-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-white/8" />

                  {/* Language */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-fun font-black uppercase tracking-[0.2em] text-white/40">Language</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onLanguageChange?.('en')}
                        disabled={isUpdating}
                        className={`inline-flex h-7 min-w-[52px] items-center justify-center rounded-full px-3 text-[10px] font-fun font-black uppercase tracking-wide transition-colors active:translate-y-[1px] ${
                          preferredLanguage === 'en'
                            ? 'bg-[#38B60E] text-white'
                            : 'border border-[#38B60E] text-white/85 hover:bg-[#38B60E]/10'
                        }`}
                      >
                        🇬🇧 EN
                      </button>
                      <button
                        onClick={() => onLanguageChange?.('ka')}
                        disabled={isUpdating}
                        className={`inline-flex h-7 min-w-[52px] items-center justify-center rounded-full px-3 text-[10px] font-fun font-black uppercase tracking-wide transition-colors active:translate-y-[1px] ${
                          preferredLanguage === 'ka'
                            ? 'bg-[#38B60E] text-white'
                            : 'border border-[#38B60E] text-white/85 hover:bg-[#38B60E]/10'
                        }`}
                      >
                        🇬🇪 GE
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
                    <span className="text-xs font-fun font-black uppercase tracking-wide text-white">Your Wins</span>
                    <span
                      className="text-xl tabular-nums text-[#38B60E]"
                      style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
                    >
                      {headToHead.winsA}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-fun font-black uppercase tracking-wide text-white">Their Wins</span>
                    <span
                      className="text-xl tabular-nums text-[#FF4B4B]"
                      style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
                    >
                      {headToHead.winsB}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-fun font-black uppercase tracking-wide text-white">Draws</span>
                    <span
                      className="text-xl tabular-nums text-white/55"
                      style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
                    >
                      {headToHead.draws}
                    </span>
                  </div>
                  <div className="h-px bg-white/8" />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-fun font-black uppercase tracking-[0.2em] text-white/40">Total Matches</span>
                    <span className="text-sm font-fun font-black tabular-nums text-white">{headToHead.total}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Sign Out (self only) */}
            {isSelf && onSignOut && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.24 }}>
                <button
                  onClick={onSignOut}
                  className="w-full h-[48px] rounded-[10px] bg-black text-sm font-fun font-black uppercase tracking-wide text-[#FF4B4B] hover:text-[#FF8D8D] active:translate-y-[2px] transition-transform flex items-center justify-center gap-2"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

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
              Recent Activity
            </h3>
            <div className="space-y-2.5">
              {recentMatchesLoading && (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-[16px] min-h-[58px] md:min-h-[62px] px-4 md:px-5 border-2 border-[#3A4F56] bg-[#041217] animate-pulse">
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
                <div className="p-4 rounded-[16px] border-2 border-[#FF4B4B]/40 bg-[#FF4B4B]/10 text-sm font-fun font-black uppercase tracking-wide text-[#FF4B4B]">
                  {recentMatchesError}
                </div>
              )}
              {!recentMatchesLoading && !recentMatchesError && recentMatches.length === 0 && (
                <div className="p-6 text-center rounded-[16px] border-2 border-[#3A4F56] bg-[#041217]">
                  <div className="text-2xl mb-2">⚽</div>
                  <div className="text-sm font-fun font-black uppercase tracking-wide text-white/55">No recent matches yet.</div>
                  <div className="text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/30 mt-1">Play a match and it&apos;ll show up here.</div>
                </div>
              )}
              {!recentMatchesLoading && !recentMatchesError && visibleMatches.map((match, index) => {
                const isWin = match.result === 'Win';
                const isLoss = match.result === 'Loss';
                const borderColor = isWin ? 'border-[#38B60E]' : isLoss ? 'border-[#E04B3A]' : 'border-[#3A4F56]';
                const rpPillTone = isWin ? 'bg-[#348A1A] text-white' : isLoss ? 'bg-[#B8401D] text-white' : 'bg-[#3A4F56] text-white';
                const competitionLabel = match.competition === 'friendly'
                  ? 'Friendly'
                  : match.competition === 'placement'
                    ? 'Placement'
                    : 'Ranked';
                const showRpDelta = match.competition !== 'friendly' && match.rpDelta !== null;
                const rpDelta = match.rpDelta ?? 0;
                const formattedRpDelta = `${rpDelta >= 0 ? '+' : ''}${rpDelta} RP`;
                const initial = match.opponent.charAt(0).toUpperCase();

                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index, duration: 0.3 }}
                    className={`flex items-center gap-3 rounded-[16px] min-h-[58px] md:min-h-[62px] px-4 md:px-5 border-2 bg-[#041217] ${borderColor}`}
                  >
                    {/* Avatar (initial fallback) */}
                    <div className="relative size-8 md:size-10 shrink-0 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
                      <span className="text-sm font-black text-white/80">{initial}</span>
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="font-poppins text-[12px] md:text-[14px] font-semibold leading-none text-white uppercase truncate">
                        vs {match.opponent}
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
                              ? 'bg-[#4D1C1B] text-[#FF8B7D]'
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

              {/* Expand/Collapse button */}
              {!recentMatchesLoading && !recentMatchesError && canExpand && (
                <button
                  type="button"
                  onClick={() => setIsMatchesExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[#1B2F36] hover:bg-[#243B44] transition-all text-sm font-bold text-[#56707A] hover:text-white"
                >
                  {isMatchesExpanded ? (
                    <>
                      <ChevronUp className="size-4" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-4" />
                      Show {hiddenCount} more
                    </>
                  )}
                </button>
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
              Achievements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {player.achievements.map((achievement) => {
                const Icon = achievementIconMap[achievement.icon] || Trophy;
                const hasProgress = achievement.progress !== undefined && achievement.target !== undefined;
                const progressPct = hasProgress
                  ? Math.min(100, ((achievement.progress ?? 0) / Math.max(1, achievement.target ?? 1)) * 100)
                  : achievement.unlocked ? 100 : 0;

                return (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 p-3 rounded-[10px]"
                    style={{
                      backgroundColor: '#1B2F36',
                      opacity: achievement.unlocked ? 1 : 0.55,
                    }}
                  >
                    <div
                      className="size-11 rounded-[8px] flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: achievement.unlocked ? '#FFE500' : 'rgba(255,255,255,0.06)',
                        color: achievement.unlocked ? '#000' : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      <Icon className="size-5" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-fun font-black uppercase tracking-wide truncate text-white">{achievement.title}</div>
                      <div className="text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/40 truncate">
                        {achievement.unlocked
                          ? 'Completed'
                          : hasProgress
                            ? `${achievement.progress} / ${achievement.target}`
                            : 'Locked'}
                      </div>
                      <div className="mt-2 h-1.5 w-full bg-white/8 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: achievement.unlocked ? '#FFE500' : 'rgba(255,255,255,0.3)' }}
                        />
                      </div>
                    </div>
                    {achievement.unlocked && (
                      <div className="size-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFE500' }}>
                        <Check className="size-3.5 text-black" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {isSelf && (
        <AvatarPicker
          open={isAvatarPickerOpen}
          onOpenChange={setIsAvatarPickerOpen}
          currentAvatarUrl={resolvedAvatarUrl}
          googleAvatarUrl={googleAvatarUrl}
          onSelect={handleAvatarSelect}
          isSaving={isSavingAvatar}
        />
      )}
    </div>
  );
}
