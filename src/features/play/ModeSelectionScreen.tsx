import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ModeConfirmModal } from '@/features/play/components/ModeConfirmModal';
import { FriendPlayModal } from '@/features/friend/components/FriendPlayModal';
import { HomeRecentMatches } from '@/features/home/components/dashboard/HomeRecentMatches';
import type { MatchStatsSummary } from '@/lib/domain';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';
import { CHALLENGES } from '../tournaments/GameHubScreen';
import { logger } from '@/utils/logger';

import { getTierVisual } from '@/utils/tierVisuals';
import { getRankedTierProgress } from '@/utils/rankedTier';

// ── Soccer SVG Icons ──
function SoccerBall({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2 L14 8 L20 8 L15 12.5 L17 19 L12 15 L7 19 L9 12.5 L4 8 L10 8 Z" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function Whistle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="15" cy="14" rx="7" ry="5" />
      <path d="M8 12 L4 6" strokeWidth="2.5" />
      <circle cx="3" cy="5" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

function Jersey({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3 L2 7 L5 9 L5 20 L19 20 L19 9 L22 7 L18 3 L15 5 Q12 7 9 5 Z" />
      <line x1="12" y1="10" x2="12" y2="16" opacity="0.4" />
    </svg>
  );
}

function Boot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8 L4 16 L8 18 L20 18 L22 14 L18 12 L16 8 L10 6 Z" />
      <line x1="8" y1="18" x2="8" y2="14" opacity="0.4" />
      <line x1="12" y1="18" x2="12" y2="13" opacity="0.4" />
      <line x1="16" y1="18" x2="16" y2="12" opacity="0.4" />
    </svg>
  );
}

function StadiumSilhouette() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 300" fill="none" preserveAspectRatio="xMidYMid slice">
      <path d="M0 300 L0 180 Q100 80 200 120 Q300 60 400 100 Q500 60 600 120 Q700 80 800 180 L800 300 Z" fill="rgba(34,197,94,0.04)" />
      <path d="M0 300 L0 200 Q200 120 400 160 Q600 120 800 200 L800 300 Z" fill="rgba(34,197,94,0.03)" />
      <line x1="100" y1="80" x2="200" y2="250" stroke="rgba(255,255,255,0.02)" strokeWidth="60" />
      <line x1="700" y1="80" x2="600" y2="250" stroke="rgba(255,255,255,0.02)" strokeWidth="60" />
      <ellipse cx="400" cy="280" rx="120" ry="40" stroke="rgba(34,197,94,0.06)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

interface ModeSelectionScreenProps {
  onSelectMode: (mode: 'ranked' | 'friendly' | 'solo') => void;
  /** If provided, called when ranked card is clicked BEFORE the confirm modal opens.
   *  Return `true` to prevent the confirm modal from showing (i.e. the caller handles it). */
  onRankedIntercept?: () => boolean;
  ticketsRemaining?: number;
  matchStatsSummary?: MatchStatsSummary | null;
  rankedProfile: RankedProfileResponse | null;
  rankedProfileLoading?: boolean;
}

const IS_DEV = process.env.NODE_ENV === 'development';

const PLACEHOLDER_OBJECTIVES = [
  { title: 'Streak Master', desc: 'Answer 10 in a row', reward: '+150 coins', icon: '🔥' },
  { title: 'Social Butterfly', desc: 'Challenge 2 friends', reward: '+120 coins', icon: '👥' },
  { title: 'Perfect Game', desc: '100% accuracy match', reward: '+200 coins', icon: '🎯' },
];

export function ModeSelectionScreen({
  onSelectMode,
  onRankedIntercept,
  ticketsRemaining = 10,
  matchStatsSummary = null,
  rankedProfile,
  rankedProfileLoading = false,
}: ModeSelectionScreenProps) {
  const [selectedMode, setSelectedMode] = useState<'ranked' | 'friendly' | 'solo' | null>(null);
  const isPlacementInProgress = rankedProfile ? rankedProfile.placementStatus !== 'placed' : false;
  const placementPlayed = rankedProfile?.placementPlayed ?? 0;
  const placementRequired = Math.max(1, rankedProfile?.placementRequired ?? 3);
  const placementMatchesLeft = Math.max(0, placementRequired - placementPlayed);
  const displayRp = isPlacementInProgress ? 0 : (rankedProfile?.rp ?? 0);
  const tierVisual = rankedProfile ? getTierVisual(rankedProfile.tier) : getTierVisual('Academy');
  const rankedWinRate = Math.round(matchStatsSummary?.ranked.winRate ?? 0);
  const rankedGamesPlayed = matchStatsSummary?.ranked.gamesPlayed ?? 0;
  const tierProgress = getRankedTierProgress(displayRp);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleConfirm = () => {
    if (!selectedMode) return;
    if (selectedMode !== 'friendly') {
      onSelectMode(selectedMode);
    }
    setSelectedMode(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-3 py-4 space-y-4 md:px-4 md:py-6 md:space-y-5 font-fun">

      {/* ─── 1. Ranked Hero Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => {
          if (onRankedIntercept?.()) return;
          setSelectedMode('ranked');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onRankedIntercept?.()) return;
            setSelectedMode('ranked');
          }
        }}
        role="button"
        tabIndex={0}
        className="relative rounded-3xl bg-gradient-to-br from-[#1B3A25] via-[#1B2F36] to-[#1B2F36] border-b-4 border-[#58CC02] overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58CC02] active:border-b-2 active:translate-y-[2px] transition-all"
      >
        {/* Soccer Field Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 right-0 h-1 bg-white" />
          <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white" />
        </div>

        <StadiumSilhouette />

        <div className="relative z-10 p-4 md:p-6">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="size-10 md:size-16 rounded-xl md:rounded-2xl bg-[#58CC02]/20 border-2 border-[#58CC02]/40 flex items-center justify-center">
                <SoccerBall className="size-5 md:size-9 text-[#58CC02]" />
              </div>
              <div>
                <h1 className="text-lg md:text-3xl font-black text-white uppercase leading-tight">Ranked Match</h1>
                <span className="text-[10px] md:text-sm font-bold text-[#58CC02] uppercase tracking-wider">
                  {!rankedProfileLoading && isPlacementInProgress ? `Placement ${placementPlayed}/${placementRequired}` : '1v1 Competitive'}
                </span>
              </div>
            </div>
            <div>
              <span
                className={cn(
                  "px-8 py-3.5 md:px-14 md:py-5 rounded-2xl bg-[#58CC02] border-b-4 border-[#46A302] text-white font-black text-base md:text-xl inline-block pointer-events-none uppercase tracking-wide transition-all",
                  isPlacementInProgress && "shadow-[0_0_12px_rgba(88,204,2,0.28)] animate-[pulse_4.5s_ease-in-out_infinite]"
                )}
              >
                Play
              </span>
            </div>
          </div>

          <p className="hidden md:block text-base text-white/80 font-semibold mb-4 max-w-xl">
            🏆 Compete for Rank Points (RP) and climb the global leaderboards. Win to promote to higher divisions!
          </p>

          {!rankedProfileLoading && isPlacementInProgress && (
            <div className="mb-2 rounded-lg border border-[#B483FF]/45 bg-[#B483FF]/10 px-3 py-1.5 shadow-[0_0_10px_rgba(180,131,255,0.22)] inline-flex">
              <p className="text-[11px] md:text-xs font-black uppercase tracking-wide text-[#D8B8FF]">
                Finish placements to unlock your rank
              </p>
            </div>
          )}

          <div className="flex gap-1.5 md:gap-3 mb-2 md:mb-4">
            <span className="text-[10px] md:text-xs font-black px-2.5 md:px-4 py-1 md:py-2 rounded-full bg-white/10 border border-white/20 md:border-2 text-white/90">
              ⚡ 1v1 Duel
            </span>
            <span className="text-[10px] md:text-xs font-black px-2.5 md:px-4 py-1 md:py-2 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/30 md:border-2 text-[#FFD700]">
              +10–45 RP / Win
            </span>
          </div>

          {/* RP Progress + Stats */}
          <div className="bg-[#131F24] rounded-xl md:rounded-2xl border-b-[3px] md:border-b-4 border-[#0D1B21] p-2.5 md:p-4">
            {rankedProfileLoading ? (
              <div className="space-y-2.5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-36 bg-[#243B44] rounded" />
                  <div className="h-3 w-20 bg-[#243B44] rounded" />
                </div>
                <div className="h-3 md:h-4 bg-[#243B44] rounded-full" />
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <div className="h-3 w-16 bg-[#243B44] rounded" />
                    <div className="h-3 w-16 bg-[#243B44] rounded" />
                  </div>
                  <div className="h-6 w-12 bg-[#243B44] rounded" />
                </div>
              </div>
            ) : (
            <>
            <div className="flex items-center justify-between mb-1.5 md:mb-2">
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className={cn("text-sm md:text-base font-black", isPlacementInProgress ? "text-[#85E000]" : tierVisual.color)}>
                  {isPlacementInProgress ? "UNRANKED (PLACEMENT)" : `${tierVisual.emoji} ${rankedProfile?.tier ?? 'Academy'}`}
                </span>
              </div>
              <span className={cn(
                "font-black",
                isPlacementInProgress
                  ? "text-sm md:text-base text-[#D8B8FF]"
                  : "text-[10px] md:text-xs text-[#56707A]"
              )}>
                {isPlacementInProgress
                  ? `${placementMatchesLeft} to rank reveal`
                  : 'Competitive'}
              </span>
            </div>
            <div className="relative h-3 md:h-4 bg-[#243B44] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${isPlacementInProgress ? (placementPlayed / placementRequired) * 100 : tierProgress.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#58CC02] to-[#85E000]"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent h-1/2" />
              </motion.div>
            </div>
            <div className="flex items-center justify-between mt-1.5 md:mt-2">
              <div className="flex items-center gap-3 md:gap-4">
                <span className="text-[10px] md:text-xs font-bold text-[#56707A]">🏆 <span className="text-[#2D8CBA] font-black">{rankedWinRate}%</span> win</span>
                <span className="text-[10px] md:text-xs font-bold text-[#56707A]">🎯 <span className="text-[#9B7EC8] font-black">{rankedGamesPlayed}</span> games</span>
              </div>
              <div>
                <span className="text-xl md:text-2xl font-black text-white">{displayRp}</span>
                <span className="text-xs md:text-sm font-bold text-[#56707A] ml-1">RP</span>
              </div>
            </div>
            </>
            )}
          </div>
          {process.env.NODE_ENV === 'development' && (
            <Link
              href="/dev/match"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 inline-block text-[10px] font-bold text-yellow-500/60 hover:text-yellow-400 transition-colors uppercase tracking-widest"
            >
              Dev Quick Match →
            </Link>
          )}
        </div>
      </motion.div>

      {/* ─── 2. Secondary Modes Grid ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {/* Friendly */}
        <div
          onClick={() => setSelectedMode('friendly')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedMode('friendly');
            }
          }}
          role="button"
          tabIndex={0}
          className="relative text-left bg-[#1B2F36] rounded-2xl border-b-4 border-[#1CB0F6] p-4 md:p-6 hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1CB0F6] overflow-hidden"
        >
          {/* Soccer lines decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-white" />
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-white" />
            <div className="absolute top-12 left-0 right-0 h-0.5 bg-white" />
          </div>

          <div className="relative z-10">
            <div className="size-11 md:size-14 rounded-xl bg-[#1CB0F6]/20 border-2 border-[#1CB0F6]/40 flex items-center justify-center mb-2 md:mb-3">
              <Jersey className="size-6 md:size-7 text-[#1CB0F6]" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white mb-1 md:mb-2 uppercase">Friendly Match</h3>
            <p className="text-xs md:text-sm text-[#56707A] font-semibold mb-3 md:mb-4">
              👥 Create a private room or join a friend&apos;s game. No RP at stake.
            </p>
            <span className="px-5 py-2.5 md:px-6 md:py-3 rounded-2xl bg-[#1A7FA8] border-b-4 border-[#14627F] text-white font-black text-xs md:text-sm inline-block pointer-events-none uppercase">
              Create / Join Room
            </span>
          </div>
        </div>

        {/* Solo */}
        <div
          onClick={() => router.push('/career')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              router.push('/career');
            }
          }}
          role="button"
          tabIndex={0}
          className="relative text-left bg-[#1B2F36] rounded-2xl border-b-4 border-[#FF9600] p-4 md:p-6 hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9600] overflow-hidden"
        >
          {/* Boot prints decoration */}
          <div className="absolute bottom-0 right-4 opacity-5">
            <Boot className="w-24 h-24 text-white" />
          </div>

          <div className="relative z-10">
            <div className="size-11 md:size-14 rounded-xl bg-[#FF9600]/20 border-2 border-[#FF9600]/40 flex items-center justify-center mb-2 md:mb-3">
              <Boot className="size-6 md:size-7 text-[#FF9600]" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white mb-1 md:mb-2 uppercase">Solo Practice</h3>
            <p className="text-xs md:text-sm text-[#56707A] font-semibold mb-3 md:mb-4">
              ⚽ Start your journey from benchwarmer to legend.
            </p>
            <span className="px-5 py-2.5 md:px-6 md:py-3 rounded-2xl bg-[#C47400] border-b-4 border-[#9A5B00] text-white font-black text-xs md:text-sm inline-block pointer-events-none uppercase">
              Start Practice
            </span>
          </div>
        </div>
      </motion.div>

      {/* ─── 3. Daily Challenges (Horizontal Scroll) ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-white flex items-center gap-2 uppercase">
            <Whistle className="size-5 text-[#FFD700]" />
            Daily Challenges
          </h2>
          {/* TODO: Replace hardcoded "Resets in 12h" with a live countdown computed from the daily reset timestamp */}
          <span className="text-xs font-bold text-[#56707A] bg-[#1B2F36] px-3 py-1.5 rounded-full border-b-2 border-[#0D1B21]">Resets in 12h</span>
        </div>
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {CHALLENGES.map((c) => {
            const isLocked = c.status === 'locked';
            const tierColor = { bronze: 'border-b-[#FF9600]', silver: 'border-b-slate-400', gold: 'border-b-[#FFD700]', platinum: 'border-b-[#1CB0F6]' }[c.tier];
            const tierBg = { bronze: 'bg-[#FF9600]/20 text-[#FF9600]', silver: 'bg-slate-400/20 text-slate-300', gold: 'bg-[#FFD700]/20 text-[#FFD700]', platinum: 'bg-[#1CB0F6]/20 text-[#1CB0F6]' }[c.tier];
            const tierIcon = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' }[c.tier];
            const handleChallengeClick = () => {
              if (isLocked) return;
              logger.info('Challenge enter', { id: c.id });
              router.push(`/daily/challenges/${c.id}`);
            };

            return (
              <div
                key={c.id}
                onClick={handleChallengeClick}
                onKeyDown={(e) => {
                  if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleChallengeClick();
                  }
                }}
                role="button"
                tabIndex={isLocked ? -1 : 0}
                className={cn(
                  'shrink-0 w-[180px] bg-[#1B2F36] rounded-2xl border-b-4 p-4',
                  isLocked
                    ? 'opacity-50 cursor-default border-b-[#243B44]'
                    : 'cursor-pointer hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  tierColor
                )}
              >
                <div className={cn('size-10 rounded-xl flex items-center justify-center mb-2 text-xl border-2', tierBg, isLocked && 'border-[#243B44]')}>
                  {isLocked ? '🔒' : tierIcon}
                </div>
                <h4 className="text-sm font-black text-white mb-1">{c.title}</h4>
                <p className="text-xs font-semibold text-[#56707A]">{isLocked ? c.requirement : c.rewards}</p>
              </div>
            );
          })}
        </div>
        <Link
          href="/daily/challenges"
          className="mt-2 inline-block text-xs font-bold text-[#1CB0F6] hover:text-[#1CB0F6]/80 transition-colors uppercase tracking-wide"
        >
          View All Challenges →
        </Link>
      </motion.div>

      {/* ─── 4. Objectives ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-white flex items-center gap-2 uppercase">
            <Boot className="size-5 text-[#CE82FF]" />
            Objectives
          </h2>
          {/* TODO: Replace hardcoded "1/4 complete" with dynamic values from objectives API/hook */}
          <span className="text-xs font-bold text-[#56707A] bg-[#1B2F36] px-3 py-1.5 rounded-full border-b-2 border-[#0D1B21]">1/4 complete</span>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {/* TODO: Replace hardcoded progress (33%, "1/3", "+100 coins") with dynamic values from objectives API/hook */}
          <Link
            href="/objectives"
            className="shrink-0 w-[220px] bg-[#1B2F36] rounded-2xl border-b-4 border-b-[#CE82FF] p-4 hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px] transition-all"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="size-10 rounded-xl bg-[#CE82FF]/20 border-2 border-[#CE82FF]/40 flex items-center justify-center text-lg">
                ⚡
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-white truncate">Morning Kickoff</h4>
                <p className="text-[11px] font-semibold text-[#56707A] truncate">Play 3 matches</p>
              </div>
            </div>
            <div className="h-2 bg-[#243B44] rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-[#CE82FF] to-[#E0A8FF] rounded-full" style={{ width: '33%' }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-[#CE82FF]">1/3</span>
              <span className="text-[10px] font-bold text-[#56707A] bg-[#243B44] px-2 py-0.5 rounded-full">+100 coins</span>
            </div>
          </Link>

          {/* Other objectives — unlocked in dev mode */}
          {PLACEHOLDER_OBJECTIVES.map((obj) => {
            const isLocked = !IS_DEV;
            const Wrapper = IS_DEV ? Link : 'div' as React.ElementType;
            const wrapperProps = IS_DEV ? { href: '/objectives' } : {};
            return (
              <Wrapper
                key={obj.title}
                {...wrapperProps}
                className={cn(
                  'shrink-0 w-[220px] bg-[#1B2F36] rounded-2xl border-b-4 p-4',
                  isLocked
                    ? 'border-b-[#243B44] opacity-50 cursor-default'
                    : 'border-b-[#CE82FF] hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px] transition-all'
                )}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={cn(
                    'size-10 rounded-xl border-2 flex items-center justify-center text-lg',
                    isLocked ? 'bg-[#243B44] border-[#243B44]' : 'bg-[#CE82FF]/20 border-[#CE82FF]/40'
                  )}>
                    {isLocked ? '🔒' : obj.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-white truncate">{obj.title}</h4>
                    <p className="text-[11px] font-semibold text-[#56707A] truncate">{obj.desc}</p>
                  </div>
                </div>
                <div className="h-2 bg-[#243B44] rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-[#56707A] rounded-full" style={{ width: '0%' }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-[#56707A]">0/1</span>
                  <span className="text-[10px] font-bold text-[#56707A] bg-[#243B44] px-2 py-0.5 rounded-full">{obj.reward}</span>
                </div>
              </Wrapper>
            );
          })}
        </div>
        <Link
          href="/objectives"
          className="mt-2 inline-block text-xs font-bold text-[#CE82FF] hover:text-[#CE82FF]/80 transition-colors uppercase tracking-wide"
        >
          View All Objectives →
        </Link>
      </motion.div>

      {/* ─── 5. Recent Matches ─── */}
      <HomeRecentMatches collapsedOnly />

      {/* ─── 6. Modals ─── */}
      <ModeConfirmModal
        mode={selectedMode !== 'friendly' ? selectedMode : null}
        isOpen={!!selectedMode && selectedMode !== 'friendly'}
        onOpenChange={(open) => !open && setSelectedMode(null)}
        onConfirm={handleConfirm}
        ticketsRemaining={ticketsRemaining}
      />
      <FriendPlayModal
        isOpen={selectedMode === 'friendly'}
        onOpenChange={(open) => !open && setSelectedMode(null)}
      />
    </div>
  );
}
