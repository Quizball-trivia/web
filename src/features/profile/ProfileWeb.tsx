'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Trophy, Target, Flame, Star, Award, Pencil, Check, X,
  MapPin, Globe, Users, Clock, LogOut, Zap, Medal, Crown,
  ChevronDown, ChevronUp, Coins, Ticket, Settings2,
  type LucideIcon,
} from 'lucide-react';
import { COLLAPSED_MATCHES_COUNT, MAX_MATCHES_COUNT } from '@/lib/constants/matches';
import type { FormattedMatchScore } from '@/utils/matchScore';

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
import type { MatchStatsSummary } from '@/lib/domain';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';
import { useAvatarUrl } from './hooks/useAvatarUrl';

import { getTierVisual } from '@/utils/tierVisuals';

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

interface ProfileWebProps {
  player: PlayerStats;
  avatarUrl?: string | null;
  country?: string | null;
  favoriteClub?: string | null;
  preferredLanguage?: string | null;
  countryRank?: number | string | null;
  friendsRank?: number | string | null;
  matchStatsSummary?: MatchStatsSummary | null;
  rankedProfile?: RankedProfileResponse | null;
  rankedProfileLoading?: boolean;
  recentMatches?: ProfileRecentMatch[];
  recentMatchesLoading?: boolean;
  recentMatchesError?: string | null;
  onNameChange?: (newName: string) => Promise<void> | void;
  onAvatarChange?: (avatarUrl: string) => Promise<void> | void;
  onClubChange?: (club: string) => Promise<void> | void;
  onLanguageChange?: (language: string) => Promise<void> | void;
  onSignOut?: () => void;
  isUpdating?: boolean;
}

export function ProfileWeb({
  player, avatarUrl, country = null, favoriteClub, preferredLanguage,
  countryRank = null, friendsRank = null,
  matchStatsSummary = null,
  rankedProfile = null, rankedProfileLoading = false,
  recentMatches = [], recentMatchesLoading = false, recentMatchesError = null,
  onNameChange, onAvatarChange, onClubChange, onLanguageChange,
  onSignOut, isUpdating = false,
}: ProfileWebProps) {
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
  const winRate = Math.round(overallStats?.winRate ?? 0);
  const gamesPlayed = overallStats?.gamesPlayed ?? 0;
  const wins = overallStats?.wins ?? 0;
  const losses = overallStats?.losses ?? 0;
  const draws = overallStats?.draws ?? 0;
  const wldTotal = wins + losses + draws;
  const winPct = wldTotal > 0 ? (wins / wldTotal) * 100 : 0;
  const lossPct = wldTotal > 0 ? (losses / wldTotal) * 100 : 0;
  const drawPct = wldTotal > 0 ? (draws / wldTotal) * 100 : 0;

  const xpProgress = player.xpToNextLevel > 0
    ? Math.min(100, (player.xp / player.xpToNextLevel) * 100)
    : 0;

  const formatRank = (rankValue: number | string | null | undefined): string => {
    if (rankValue === null || rankValue === undefined || rankValue === '') return '#--';
    const normalizedRank = String(rankValue).trim();
    if (normalizedRank.length === 0) return '#--';
    return normalizedRank.startsWith('#') ? normalizedRank : `#${normalizedRank}`;
  };
  const countryRankDisplay = formatRank(countryRank);
  const friendsRankDisplay = formatRank(friendsRank);

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
    <div className="container mx-auto max-w-7xl px-4 py-4 lg:px-6 lg:py-8 space-y-5 font-fun">

      {/* ─── 1. Hero Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-visible rounded-3xl bg-card border-b-4 border-primary/60 p-6 lg:p-8"
      >
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent" />
        </div>

        <div className="relative flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8">
          {/* Avatar with tier-colored ring */}
          <button
            type="button"
            onClick={() => setIsAvatarPickerOpen(true)}
            className={`group relative size-28 lg:size-32 rounded-2xl border-4 bg-background shadow-lg flex items-center justify-center overflow-hidden shrink-0 active:scale-95 transition-transform ${
              showRankTier ? `${tierVisual.glow} shadow-lg` : ''
            }`}
            style={{
              borderColor: showRankTier ? undefined : 'rgba(28, 176, 246, 0.3)',
            }}
            aria-label="Change avatar"
          >
            <AvatarDisplay
              customization={{ ...(player.avatarCustomization ?? { base: player.avatar }), base: avatarBase }}
              size="xl"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
              Edit
            </span>
          </button>

          {/* Info Column */}
          <div className="flex-1 min-w-0 text-center lg:text-left space-y-3">
            {/* Name */}
            <div className="flex items-center justify-center lg:justify-start gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-11 text-2xl font-black bg-background border-2 border-primary/30 rounded-xl px-3 w-48 lg:w-64 text-center lg:text-left"
                    autoFocus
                    disabled={isUpdating}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameChange()}
                  />
                  <button onClick={handleNameChange} disabled={isUpdating} className="size-10 rounded-xl bg-primary border-b-[3px] border-primary/70 flex items-center justify-center text-primary-foreground active:translate-y-[1px] active:border-b-[1px] transition-all">
                    <Check className="size-5" />
                  </button>
                  <button onClick={() => setIsEditingName(false)} disabled={isUpdating} className="size-10 rounded-xl bg-destructive border-b-[3px] border-destructive/70 flex items-center justify-center text-destructive-foreground active:translate-y-[1px] active:border-b-[1px] transition-all">
                    <X className="size-5" />
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl lg:text-4xl font-black text-foreground truncate max-w-[220px] lg:max-w-md">{player.username}</h1>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                    aria-label="Edit nickname"
                    disabled={isUpdating}
                  >
                    <Pencil className="size-4" />
                  </button>
                </>
              )}
            </div>

            {/* Level + Tier badge */}
            <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-full bg-primary/15 border border-primary/25 text-primary uppercase tracking-wide">
                Level {player.level}
              </span>
              {showRankTier && (
                <span className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-full bg-gradient-to-r ${tierVisual.gradient} bg-opacity-15 border border-white/10 text-white uppercase tracking-wide`}>
                  {tierVisual.emoji} {rankedProfile!.tier}
                </span>
              )}
              {rankedDataReady && isPlacementInProgress && (
                <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-full bg-muted border border-border text-muted-foreground uppercase tracking-wide">
                  Placement {placementPlayed}/{placementRequired}
                </span>
              )}
              {rankedProfileLoading && (
                <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-full bg-muted border border-border text-muted-foreground uppercase tracking-wide animate-pulse">
                  Loading...
                </span>
              )}
            </div>

            {/* XP Progress Bar */}
            <div className="max-w-sm mx-auto lg:mx-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">XP Progress</span>
                <span className="text-[10px] font-black text-primary">{player.xp} / {player.xpToNextLevel}</span>
              </div>
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-[#85E0FF]"
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent h-1/2" />
                </motion.div>
              </div>
            </div>

            {/* Economy: Coins & Tickets */}
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-black text-yellow-400">
                <Coins className="size-4" />
                {player.coins.toLocaleString()}
              </span>
              {player.tickets !== undefined && (
                <>
                  <div className="w-px h-4 bg-border" />
                  <span className="inline-flex items-center gap-1.5 text-sm font-black text-purple-400">
                    <Ticket className="size-4" />
                    {player.tickets}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* RP Progress Card */}
          <div className="w-full lg:w-72 bg-background/60 rounded-2xl border-b-[3px] border-border p-4 mt-2 lg:mt-0 shrink-0">
            {rankedProfileLoading ? (
              <div className="space-y-2.5 animate-pulse">
                <div className="h-3 w-28 bg-muted rounded" />
                <div className="h-3.5 bg-muted rounded-full" />
                <div className="flex items-center justify-between">
                  <div className="h-6 w-16 bg-muted rounded" />
                  <div className="h-3 w-14 bg-muted rounded" />
                </div>
              </div>
            ) : isPlacementInProgress ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Placement Matches</span>
                  <span className="text-xs font-black text-primary">{placementPlayed}/{placementRequired}</span>
                </div>
                <div className="relative h-3.5 bg-muted rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(placementPlayed / placementRequired) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#58CC02] to-[#85E000]"
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent h-1/2" />
                  </motion.div>
                </div>
                <div className="text-xs font-bold text-muted-foreground">
                  Play placement matches to get your rank.
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rank Points</span>
                  {rankedProfile?.currentWinStreak && rankedProfile.currentWinStreak > 1 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-400">
                      <Flame className="size-3" />
                      {rankedProfile.currentWinStreak} streak
                    </span>
                  ) : null}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-black text-foreground">{displayRp}</span>
                  <span className="text-sm font-bold text-muted-foreground">RP</span>
                </div>
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${tierVisual.gradient}`}
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent h-1/2" />
                  </motion.div>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── 2. Quick Stats Row ─── */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="rounded-2xl bg-card border-b-4 border-green-500/30 p-4 text-center"
        >
          <div className="text-3xl lg:text-4xl font-black text-green-400">{winRate}%</div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Win Rate</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border-b-4 border-orange-500/30 p-4 text-center"
        >
          <div className="text-3xl lg:text-4xl font-black text-orange-400">{player.bestStreak}</div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Best Streak</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="rounded-2xl bg-card border-b-4 border-blue-500/30 p-4 text-center"
        >
          <div className="text-3xl lg:text-4xl font-black text-blue-400">{gamesPlayed}</div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Matches</div>
        </motion.div>
      </div>

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
              className="rounded-2xl bg-card border-b-4 border-border overflow-hidden"
            >
              <div className={`h-1.5 bg-gradient-to-r ${tierVisual.gradient}`} />
              <div className="p-6 flex flex-col items-center">
                <div className="size-20 rounded-2xl bg-primary/10 border-2 border-primary/25 flex items-center justify-center mb-3">
                  <Trophy className={`size-10 ${tierVisual.color}`} />
                </div>
                {rankedProfileLoading && (
                  <div className="animate-pulse space-y-3 w-full flex flex-col items-center">
                    <div className="h-6 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="w-full space-y-2 mt-2">
                      <div className="h-12 bg-muted rounded-xl" />
                      <div className="h-12 bg-muted rounded-xl" />
                      <div className="h-12 bg-muted rounded-xl" />
                    </div>
                  </div>
                )}
                {showRankTier && (
                  <>
                    <h2 className="text-xl font-black uppercase tracking-wide">{tierVisual.emoji} {rankedProfile!.tier}</h2>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-5">Current Season</p>

                    <div className="w-full space-y-2">
                      <div className="flex justify-between items-center px-4 py-3 bg-background/60 rounded-xl border-b-2 border-border/50">
                        <div className="flex items-center gap-2.5">
                          <Globe className="size-4 text-blue-400" />
                          <span className="text-sm font-bold">World Rank</span>
                        </div>
                        <span className="text-sm font-black text-blue-400">#{player.rank}</span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-3 bg-background/60 rounded-xl border-b-2 border-border/50">
                        <div className="flex items-center gap-2.5">
                          <MapPin className="size-4 text-red-400" />
                          <span className="text-sm font-bold">Country</span>
                        </div>
                        <span className="text-sm font-black text-red-400">{countryRankDisplay}</span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-3 bg-background/60 rounded-xl border-b-2 border-border/50">
                        <div className="flex items-center gap-2.5">
                          <Users className="size-4 text-green-400" />
                          <span className="text-sm font-bold">Friends</span>
                        </div>
                        <span className="text-sm font-black text-green-400">{friendsRankDisplay}</span>
                      </div>
                    </div>
                  </>
                )}
                {rankedDataReady && isPlacementInProgress && (
                  <>
                    <h2 className="text-xl font-black uppercase tracking-wide text-primary">Unranked</h2>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-5">
                      Placement {placementPlayed}/{placementRequired}
                    </p>
                    <div className="w-full p-4 bg-background/60 rounded-xl border-b-2 border-border/50 text-center">
                      <p className="text-sm font-bold text-foreground">
                        Play placement matches to get your rank.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* W/L/D Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="rounded-2xl bg-card border-b-4 border-border p-5"
            >
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                <Target className="size-4 text-primary" />
                Win / Loss / Draw
              </h3>

              {/* Visual bar */}
              {wldTotal > 0 ? (
                <>
                  <div className="flex rounded-full overflow-hidden h-4 mb-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${winPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                      className="bg-green-500 relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent h-1/2 rounded-l-full" />
                    </motion.div>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${drawPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                      className="bg-muted-foreground/50"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${lossPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
                      className="bg-red-500 relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent h-1/2 rounded-r-full" />
                    </motion.div>
                  </div>
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-green-400">{wins}W</span>
                    <span className="text-muted-foreground">{draws}D</span>
                    <span className="text-red-400">{losses}L</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/50 flex justify-between text-xs font-bold text-muted-foreground">
                    <span>Ranked: {rankedStats?.gamesPlayed ?? 0}</span>
                    <span>Friendly: {friendlyStats?.gamesPlayed ?? 0}</span>
                  </div>
                </>
              ) : (
                <div className="text-sm font-bold text-muted-foreground text-center py-2">
                  No matches played yet.
                </div>
              )}
            </motion.div>

            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="rounded-2xl bg-card border-b-4 border-border p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Medal className="size-4 text-yellow-500" />
                  Badges
                </h3>
                <button className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wide">
                  View All →
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {player.badges.slice(0, 5).map(badge => (
                  <span
                    key={badge.id}
                    className="text-xs font-black px-3 py-1.5 rounded-full bg-background/80 border border-border/80 text-foreground/80"
                  >
                    {badge.name}
                  </span>
                ))}
                {player.badges.length > 5 && (
                  <span className="text-xs font-black px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                    +{player.badges.length - 5}
                  </span>
                )}
                {player.badges.length === 0 && (
                  <span className="text-xs font-bold text-muted-foreground">No badges earned yet.</span>
                )}
              </div>
            </motion.div>

            {/* Preferences */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-card border-b-4 border-border p-5"
            >
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                <Settings2 className="size-4 text-muted-foreground" />
                Preferences
              </h3>
              <div className="space-y-3">
                {/* Country */}
                {country && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">Country</span>
                      <span className="text-sm font-bold text-foreground">{countryCodeToFlag(country)} {countryCodeToName(country)}</span>
                    </div>
                    <div className="h-px bg-border/50" />
                  </>
                )}
                {/* Club */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">Club</span>
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
                        <span className="text-sm font-bold text-foreground">
                          {favoriteClub || 'Not set'}
                        </span>
                        <button
                          onClick={() => setIsEditingClub(true)}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                          aria-label="Edit favorite club"
                          disabled={isUpdating}
                        >
                          <Pencil className="size-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Language */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">Language</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onLanguageChange?.('en')}
                      disabled={isUpdating}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wide transition-all border-b-2 active:translate-y-[1px] active:border-b-0 ${
                        preferredLanguage === 'en'
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'text-muted-foreground hover:text-foreground border-transparent hover:border-border'
                      }`}
                    >
                      🇬🇧 EN
                    </button>
                    <button
                      onClick={() => onLanguageChange?.('ka')}
                      disabled={isUpdating}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wide transition-all border-b-2 active:translate-y-[1px] active:border-b-0 ${
                        preferredLanguage === 'ka'
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'text-muted-foreground hover:text-foreground border-transparent hover:border-border'
                      }`}
                    >
                      🇬🇪 GE
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Sign Out */}
            {onSignOut && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.24 }}>
                <button
                  onClick={onSignOut}
                  className="w-full py-3 rounded-2xl bg-card border-b-4 border-border text-sm font-black text-muted-foreground uppercase tracking-wide hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 active:translate-y-[2px] active:border-b-0 transition-all flex items-center justify-center gap-2"
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

          {/* Recent Matches */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-card border-b-4 border-border p-5"
          >
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
              <Clock className="size-4 text-primary" />
              Recent Activity
            </h3>
            <div className="space-y-2">
              {recentMatchesLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border-b-2 border-border/50 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-muted" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-24 bg-muted rounded" />
                          <div className="h-3 w-32 bg-muted rounded" />
                        </div>
                      </div>
                      <div className="h-5 w-12 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              )}
              {!recentMatchesLoading && recentMatchesError && (
                <div className="p-4 rounded-xl bg-destructive/10 border-b-2 border-destructive/30 text-sm font-bold text-destructive">
                  {recentMatchesError}
                </div>
              )}
              {!recentMatchesLoading && !recentMatchesError && recentMatches.length === 0 && (
                <div className="p-6 rounded-xl bg-background/60 border-b-2 border-border/50 text-center">
                  <div className="text-2xl mb-2">⚽</div>
                  <div className="text-sm font-bold text-muted-foreground">No recent matches yet.</div>
                  <div className="text-xs text-muted-foreground/70 mt-1">Play a match and it will show up here!</div>
                </div>
              )}
              {!recentMatchesLoading && !recentMatchesError && visibleMatches.map((match, index) => {
                const isWin = match.result === 'Win';
                const isLoss = match.result === 'Loss';
                const badgeClass = isWin
                  ? 'bg-green-500/15 text-green-400 border-green-500/30'
                  : isLoss
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : 'bg-muted text-muted-foreground border-border';
                const badgeText = isWin ? 'W' : isLoss ? 'L' : 'D';
                const rpClass = isWin
                  ? 'text-green-400'
                  : isLoss
                    ? 'text-red-400'
                    : 'text-muted-foreground';
                const competitionLabel = match.competition === 'friendly'
                  ? 'Friendly'
                  : match.competition === 'placement'
                    ? 'Placement'
                    : 'Ranked';
                const showRpDelta = match.competition === 'ranked' && match.rpDelta !== null;
                const rpDeltaClass = (match.rpDelta ?? 0) > 0
                  ? 'bg-green-500/15 text-green-400 border-green-500/30'
                  : (match.rpDelta ?? 0) < 0
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : 'bg-muted text-muted-foreground border-border';
                const formattedRpDelta = `${(match.rpDelta ?? 0) >= 0 ? '+' : ''}${match.rpDelta ?? 0} RP`;

                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index, duration: 0.3 }}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border-b-2 border-border/50 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-9 rounded-xl flex items-center justify-center text-xs font-black border-2 ${badgeClass}`}>
                        {badgeText}
                      </div>
                      <div>
                        <div className="text-sm font-black text-foreground">vs {match.opponent}</div>
                        <div className="text-xs font-bold text-muted-foreground">{competitionLabel} · {match.time}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {showRpDelta && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${rpDeltaClass}`}>
                          {formattedRpDelta}
                        </span>
                      )}
                      <span className={`text-base font-black ${rpClass}`}>
                        {match.scoreFormatted.score}
                        {match.scoreFormatted.suffix && (
                          <span className="text-xs font-bold ml-1 opacity-80">{match.scoreFormatted.suffix}</span>
                        )}
                      </span>
                      {match.scoreFormatted.badge && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          match.scoreFormatted.badgeVariant === 'red'
                            ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/25'
                            : 'bg-muted text-muted-foreground ring-1 ring-border'
                        }`}>
                          {match.scoreFormatted.badge}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Expand/Collapse button */}
              {!recentMatchesLoading && !recentMatchesError && canExpand && (
                <button
                  type="button"
                  onClick={() => setIsMatchesExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-background/40 border border-border/50 hover:bg-background/60 hover:border-primary/30 transition-all text-sm font-bold text-muted-foreground hover:text-foreground"
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

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
              <Award className="size-4 text-yellow-500" />
              Achievements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {player.achievements.map((achievement) => {
                const Icon = achievementIconMap[achievement.icon] || Trophy;
                const hasProgress = achievement.progress !== undefined && achievement.target !== undefined;
                const progressPct = hasProgress
                  ? Math.min(100, ((achievement.progress ?? 0) / Math.max(1, achievement.target ?? 1)) * 100)
                  : achievement.unlocked ? 100 : 0;

                return (
                  <div
                    key={achievement.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-b-[3px] transition-all ${
                      achievement.unlocked
                        ? 'bg-card border-primary/30'
                        : 'bg-card border-border opacity-60'
                    }`}
                  >
                    <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 border-2 ${
                      achievement.unlocked
                        ? 'bg-primary/15 text-primary border-primary/30'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      <Icon className="size-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black truncate">{achievement.title}</div>
                      <div className="text-xs font-bold text-muted-foreground truncate">
                        {achievement.unlocked
                          ? 'Completed'
                          : hasProgress
                            ? `${achievement.progress} / ${achievement.target}`
                            : 'Locked'}
                      </div>
                      <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                          className={`h-full rounded-full ${
                            achievement.unlocked
                              ? 'bg-gradient-to-r from-primary to-primary/70'
                              : 'bg-muted-foreground/40'
                          }`}
                        >
                          {achievement.unlocked && (
                            <div className="h-1/2 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
                          )}
                        </motion.div>
                      </div>
                    </div>
                    {achievement.unlocked && (
                      <div className="size-7 rounded-full bg-primary flex items-center justify-center shrink-0 border-b-2 border-primary/60">
                        <Check className="size-3.5 text-primary-foreground" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      <AvatarPicker
        open={isAvatarPickerOpen}
        onOpenChange={setIsAvatarPickerOpen}
        currentAvatarUrl={resolvedAvatarUrl}
        googleAvatarUrl={googleAvatarUrl}
        onSelect={handleAvatarSelect}
        isSaving={isSavingAvatar}
      />
    </div>
  );
}
