import { cn } from '@/lib/utils';
import { useState } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ModeConfirmModal } from '@/components/shared/ModeConfirmModal';
import { FriendPlayModal } from '@/components/shared/FriendPlayModal';
import { HomeRecentMatches } from '@/components/shared/HomeRecentMatches';
import type { MatchStatsSummary } from '@/lib/domain';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';

import { logger } from '@/utils/logger';
import { colors } from '@/lib/colors';

import { getNextTierBand } from '@/utils/rankedTier';
import { ClipboardList } from 'lucide-react';


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
  ticketsRemaining = 0,
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
  const rankedWinRate = Math.round(matchStatsSummary?.ranked.winRate ?? 0);
  const rankedGamesPlayed = matchStatsSummary?.ranked.gamesPlayed ?? 0;
  const nextTierBand = getNextTierBand(displayRp);
  const nextTierTargetRp = nextTierBand?.minRp ?? null;
  const router = useRouter();

  const handleConfirm = () => {
    if (!selectedMode) return;
    if (selectedMode !== 'friendly') {
      onSelectMode(selectedMode);
    }
    setSelectedMode(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-4 md:py-6 md:space-y-5 font-fun">

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
        className="relative overflow-hidden rounded-[28px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 active:translate-y-[2px] transition-all"
        style={{ backgroundColor: colors.green.base }}
      >
        {/* Cup icon */}
        <Image
          src="/assets/brand/cup.png"
          alt=""
          width={160}
          height={160}
          className="absolute right-2 bottom-2 w-16 h-16 md:w-40 md:h-40 object-contain opacity-90 pointer-events-none"
        />
        <div className="relative z-10 p-5 md:p-7">
          {/* Desktop top row */}
          <div className="hidden md:flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-5xl font-black uppercase leading-none text-white">Ranked Match</h1>
              <div className="mt-2 text-lg font-black uppercase tracking-wide text-white/95">
                {rankedProfileLoading
                  ? '1v1 Competitive'
                  : isPlacementInProgress
                    ? `Placement ${placementPlayed}/${placementRequired}`
                    : '1v1 Competitive'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black text-[#FFE500] drop-shadow-[0_2px_12px_rgba(255,229,0,0.25)]">
                {displayRp}/{nextTierTargetRp ?? 600} RP
              </div>
              <div className="mt-0.5 text-sm font-black uppercase tracking-wide text-white">
                {isPlacementInProgress
                  ? `${placementMatchesLeft} match${placementMatchesLeft === 1 ? "" : "es"} to rank reveal`
                  : nextTierBand
                    ? `${Math.max(0, nextTierTargetRp! - displayRp)} RP to ${nextTierBand.tier}`
                    : "Max rank reached"}
              </div>
              {!rankedProfileLoading && (
                <div className="mt-0.5 text-xs font-black uppercase tracking-wide text-white/80">
                  {rankedWinRate}% win rate • {rankedGamesPlayed} ranked games
                </div>
              )}
            </div>
          </div>

          {/* Mobile top section */}
          <div className="md:hidden">
            <h1 className="text-2xl font-black uppercase leading-none text-white">Ranked Match</h1>
            <div className="mt-1 text-xs font-black uppercase tracking-wide text-white/95">
              {rankedProfileLoading
                ? '1v1 Competitive'
                : isPlacementInProgress
                  ? `Placement ${placementPlayed}/${placementRequired}`
                  : '1v1 Competitive'}
            </div>
            <div className="mt-1.5 text-lg font-black text-[#FFE500] drop-shadow-[0_2px_12px_rgba(255,229,0,0.25)]">
              {displayRp}/{nextTierTargetRp ?? 600} RP
            </div>
            <div className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-white">
              {isPlacementInProgress
                ? `${placementMatchesLeft} match${placementMatchesLeft === 1 ? "" : "es"} to rank reveal`
                : nextTierBand
                  ? `${Math.max(0, nextTierTargetRp! - displayRp)} RP to ${nextTierBand.tier}`
                  : "Max rank reached"}
            </div>
            {!rankedProfileLoading && (
              <div className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-white/80">
                {rankedWinRate}% win rate • {rankedGamesPlayed} ranked games
              </div>
            )}
          </div>

          {IS_DEV && (
            <div className="mt-3 flex flex-wrap items-center gap-2 md:gap-3">
              <Link
                href="/dev/match"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center rounded-xl bg-black/90 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-black"
              >
                Dev Quick Ranked
              </Link>
              <Link
                href="/dev/mock-match"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center rounded-xl border border-[#0F3A00]/20 bg-[#E6F8C9] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#0F3A00] transition-colors hover:bg-[#DCF4B6]"
              >
                New Ranked Dev
              </Link>
            </div>
          )}

          <div className="mt-3 md:mt-7">
            <div
              className="flex w-[calc(50%-8px)] items-center justify-center rounded-2xl md:rounded-3xl bg-black h-[48px] md:h-[112px] text-sm md:text-2xl font-black uppercase tracking-wide text-white"
            >
              Play
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. Secondary Modes Grid ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-4"
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
        className="relative cursor-pointer overflow-hidden rounded-[20px] md:rounded-[28px] p-3 md:p-6 text-left active:translate-y-[2px] transition-all focus-visible:outline-none focus-visible:ring-2"
        style={{ backgroundColor: colors.blue.brand }}
      >
        <div className="relative z-10 flex flex-col h-full">
          <h3 className="text-base md:text-4xl font-black uppercase leading-tight text-white">Friendly Match</h3>
          <p className="mt-0.5 md:mt-2 text-[10px] md:text-lg font-black uppercase text-white/70">Create/Join Room</p>
          <div className="mt-auto pt-2 md:pt-6">
            <div className="flex items-center justify-between rounded-xl md:rounded-3xl bg-black border-[3px] border-blue-400 px-2.5 py-1.5 md:px-5 md:py-4">
              <Image
                src="/assets/brand/friend.png"
                alt=""
                width={120}
                height={120}
                className="w-9 h-9 md:w-20 md:h-20 object-contain"
              />
              <Image
                src="/assets/brand/play-blue.png"
                alt="Play"
                width={56}
                height={56}
                className="w-7 h-7 md:w-14 md:h-14 object-contain"
              />
            </div>
          </div>
        </div>
      </div>

        {/* Daily Challenges */}
        <div
          onClick={() => router.push('/daily/challenges')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              router.push('/daily/challenges');
            }
          }}
        role="button"
        tabIndex={0}
        className="relative cursor-pointer overflow-hidden rounded-[20px] md:rounded-[28px] p-3 md:p-6 text-left active:translate-y-[2px] transition-all focus-visible:outline-none focus-visible:ring-2"
        style={{ backgroundColor: colors.yellow.base, color: "#000000" }}
      >
        <div className="relative z-10 flex flex-col h-full">
          <h3 className="text-base md:text-4xl font-black uppercase leading-tight text-black">Daily Challenge</h3>
          <p className="mt-0.5 md:mt-2 text-[10px] md:text-lg font-black uppercase text-black/70">View Challenges</p>
          <div className="mt-auto pt-2 md:pt-6">
            <div className="flex items-center justify-between rounded-xl md:rounded-3xl bg-black border-[3px] border-yellow-400 px-2.5 py-1.5 md:px-5 md:py-4">
              <Image
                src="/assets/brand/daily-challenge.png"
                alt=""
                width={120}
                height={120}
                className="w-9 h-9 md:w-20 md:h-20 object-contain"
              />
              <Image
                src="/assets/brand/play-yellow.png"
                alt="Play"
                width={56}
                height={56}
                className="w-7 h-7 md:w-14 md:h-14 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
      </motion.div>

      {/* ─── 3. Objectives ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-white flex items-center gap-2 uppercase">
            <ClipboardList className="size-5 text-[#CE82FF]" />
            Objectives
          </h2>
          {/* TODO: Replace hardcoded "1/4 complete" with dynamic values from objectives API/hook */}
          <span className="text-xs font-bold text-[#56707A] bg-[#1B2F36] px-3 py-1.5 rounded-full border-b-2 border-[#0D1B21]">1/4 complete</span>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {/* TODO: Replace hardcoded progress (33%, "1/3", "+100 coins") with dynamic values from objectives API/hook */}
          <Link
            href="/objectives"
            className="shrink-0 w-[220px] bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] p-4 hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px] transition-all"
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
                    ? 'border-[#0D1B21] opacity-50 cursor-default'
                    : 'border-[#0D1B21] hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px] transition-all'
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
