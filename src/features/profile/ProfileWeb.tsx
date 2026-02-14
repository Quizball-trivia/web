'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Trophy, Target, Flame, Star, Award, Pencil, Check, X,
  MapPin, Globe, Users, Clock, LogOut, Zap, Medal, Crown,
  ChevronDown, ChevronUp,
  type LucideIcon,
} from 'lucide-react';
import { COLLAPSED_MATCHES_COUNT, MAX_MATCHES_COUNT } from '@/lib/constants/matches';
import type { FormattedMatchScore } from '@/utils/matchScore';

const achievementIconMap: Record<string, LucideIcon> = {
  Trophy, Target, Flame, Star, Award, Check, MapPin, Globe, Users, Clock, Zap, Medal, Crown,
};

import { AvatarDisplay } from '@/components/AvatarDisplay';
import { AvatarPicker } from './components/AvatarPicker';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import type { PlayerStats } from '@/types/game';
import type { MatchStatsSummary } from '@/lib/domain';
import { getRankInfo, getDivisionColor, getDivisionEmoji } from '@/utils/rankSystem';
import { useAvatarUrl } from './hooks/useAvatarUrl';
import ClubSelect from '@/features/onboarding/ClubSelect';

export interface ProfileRecentMatch {
  id: string | number;
  mode: string;
  result: 'Win' | 'Loss' | 'Draw';
  time: string;
  opponent: string;
  scoreFormatted: FormattedMatchScore;
}

interface ProfileWebProps {
  player: PlayerStats;
  avatarUrl?: string | null;
  favoriteClub?: string | null;
  preferredLanguage?: string | null;
  countryRank?: number | string | null;
  friendsRank?: number | string | null;
  matchStatsSummary?: MatchStatsSummary | null;
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
  player, avatarUrl, favoriteClub, preferredLanguage,
  countryRank = null, friendsRank = null,
  matchStatsSummary = null,
  recentMatches = [], recentMatchesLoading = false, recentMatchesError = null,
  onNameChange, onAvatarChange, onClubChange, onLanguageChange,
  onSignOut, isUpdating = false,
}: ProfileWebProps) {
  const rankInfo = getRankInfo(player.rankPoints || 0);
  const divisionColors = getDivisionColor(rankInfo.division);
  const divisionEmoji = getDivisionEmoji(rankInfo.division);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(player.username);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isEditingClub, setIsEditingClub] = useState(false);
  const [isMatchesExpanded, setIsMatchesExpanded] = useState(false);

  // Compute visible matches: show first 3 when collapsed, up to 20 when expanded
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
          {/* Avatar */}
          <button
            type="button"
            onClick={() => setIsAvatarPickerOpen(true)}
            className="group relative size-24 lg:size-28 rounded-2xl border-4 border-primary/30 bg-background shadow-lg flex items-center justify-center overflow-hidden shrink-0 active:scale-95 transition-transform"
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

            {/* Level + Division */}
            <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
              <span className="text-sm font-black text-primary uppercase tracking-wide">Level {player.level}</span>
              <span className="text-muted-foreground">·</span>
              <span className={`text-sm font-black uppercase tracking-wide ${divisionColors.text}`}>
                {divisionEmoji} {rankInfo.division}
              </span>
            </div>

            {/* Stats chips */}
            <div className="flex items-center justify-center lg:justify-start gap-2 pt-1 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 uppercase tracking-wide">
                🏆 {winRate}% Win Rate
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-400 uppercase tracking-wide">
                🔥 {player.bestStreak} Streak
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400 uppercase tracking-wide">
                ⚽ {gamesPlayed} Matches
              </span>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-4 text-xs font-bold text-muted-foreground">
              <span>Ranked: {rankedStats?.gamesPlayed ?? 0}</span>
              <span>Friendly: {friendlyStats?.gamesPlayed ?? 0}</span>
            </div>

            {/* Preferences */}
            <div className="flex items-center justify-center lg:justify-start gap-3 pt-1 flex-wrap">
              {/* Club */}
              <div className="flex items-center gap-2">
                <span className="text-sm">⚽</span>
                {isEditingClub ? (
                  <div className="w-56">
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
                    <span className="text-sm font-bold text-muted-foreground">
                      {favoriteClub || 'No club set'}
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

              <div className="w-px h-5 bg-border" />

              {/* Language */}
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

          {/* RP Progress */}
          <div className="w-full lg:w-72 bg-background/60 rounded-2xl border-b-[3px] border-border p-4 mt-2 lg:mt-0 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rank Progress</span>
            </div>
            <div className="relative h-3.5 bg-muted rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${rankInfo.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#58CC02] to-[#85E000]"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent h-1/2" />
              </motion.div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-foreground">{player.rankPoints ?? 0} <span className="text-sm font-bold text-muted-foreground">RP</span></span>
              <span className="text-xs font-bold text-muted-foreground">{rankInfo.pointsToNext} to next</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. Main Content Grid ─── */}
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
              <div className={`h-1.5 bg-gradient-to-r ${divisionColors.gradient}`} />
              <div className="p-6 flex flex-col items-center">
                <div className="size-20 rounded-2xl bg-primary/10 border-2 border-primary/25 flex items-center justify-center mb-3">
                  <Trophy className={`size-10 ${divisionColors.text}`} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-wide">{rankInfo.division}</h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-5">Current Season</p>

                <div className="w-full space-y-2">
                  {/* TODO(profile-ranks-api): `countryRank` and `friendsRank` may still be mock data from the parent for now; replace with real API-backed rank values. */}
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
              </div>
            </motion.div>

            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
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
              </div>
            </motion.div>

            {/* Sign Out */}
            {onSignOut && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
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
              {/* TODO(profile-activity-api): Parent may still pass mock activity data while API integration is in progress. Replace with real recent matches endpoint data. */}
              {recentMatchesLoading && (
                <div className="p-4 rounded-xl bg-background/60 border-b-2 border-border/50 text-sm font-bold text-muted-foreground">
                  Loading recent matches...
                </div>
              )}
              {!recentMatchesLoading && recentMatchesError && (
                <div className="p-4 rounded-xl bg-destructive/10 border-b-2 border-destructive/30 text-sm font-bold text-destructive">
                  {recentMatchesError}
                </div>
              )}
              {!recentMatchesLoading && !recentMatchesError && recentMatches.length === 0 && (
                <div className="p-4 rounded-xl bg-background/60 border-b-2 border-border/50 text-sm font-bold text-muted-foreground">
                  No recent matches yet.
                </div>
              )}
              {!recentMatchesLoading && !recentMatchesError && visibleMatches.map((match) => {
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

                return (
                  <div key={match.id} className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border-b-2 border-border/50 hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`size-9 rounded-xl flex items-center justify-center text-xs font-black border-2 ${badgeClass}`}>
                        {badgeText}
                      </div>
                      <div>
                        <div className="text-sm font-black text-foreground">vs {match.opponent}</div>
                        <div className="text-xs font-bold text-muted-foreground">{match.mode} · {match.time}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                  </div>
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
                return (
                  <div
                    key={achievement.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-b-[3px] transition-all ${
                      achievement.unlocked
                        ? 'bg-card border-primary/30'
                        : 'bg-card border-border opacity-50'
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
                        {achievement.unlocked ? 'Completed' : 'Locked'}
                      </div>
                      <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            achievement.unlocked
                              ? 'bg-gradient-to-r from-primary to-primary/70'
                              : 'bg-muted-foreground/50'
                          }`}
                          style={{ width: achievement.unlocked ? '100%' : '30%' }}
                        >
                          {achievement.unlocked && (
                            <div className="h-1/2 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
                          )}
                        </div>
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
