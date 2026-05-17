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
import { useObjectives } from '@/lib/queries/objectives.queries';

import { colors } from '@/lib/colors';

import { getNextTierBand } from '@/utils/rankedTier';


function RpProgressBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="h-3 md:h-4 w-full rounded-[4px] bg-brand-green-deep overflow-hidden">
      <div
        className="h-full rounded-[4px] bg-brand-yellow transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
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
  const { data: objectivesData, isLoading: objectivesLoading } = useObjectives();
  const rankedTitleStyle = {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 600,
    letterSpacing: "0",
    lineHeight: 1,
  } as const;
  const friendlyTitleStyle = {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 600,
    letterSpacing: "0",
    lineHeight: 1,
  } as const;
  const dailyTitleStyle = {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 600,
    letterSpacing: "0",
    lineHeight: 1,
  } as const;

  const handleConfirm = () => {
    if (!selectedMode) return;
    if (selectedMode !== 'friendly') {
      onSelectMode(selectedMode);
    }
    setSelectedMode(null);
  };

  const previewObjectives = [...(objectivesData?.daily.objectives ?? [])]
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const aPct = a.target > 0 ? a.progress / a.target : 0;
      const bPct = b.target > 0 ? b.progress / b.target : 0;
      return bPct - aPct;
    })
    .slice(0, 4);
  const hasPreviewObjectives = previewObjectives.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-3 space-y-4 md:py-6 md:space-y-5 font-fun">

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
        className="relative overflow-hidden rounded-[10px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 active:translate-y-[2px] transition-all"
        style={{ backgroundColor: colors.green.base }}
      >
        {/* Ranked icon — centered background watermark (desktop only; mobile uses inline icon below) */}
        <Image
          src="/assets/ranked-icon.webp"
          alt=""
          width={200}
          height={200}
          className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 object-contain opacity-80 pointer-events-none"
        />

        <div className="relative z-10 p-4 md:p-7">
          {/* ── Desktop layout ── */}
          <div className="hidden lg:flex items-start gap-6">
            {/* Left: Title + Play */}
            <div className="flex-1 min-w-0">
              <h1
                className="text-[3.25rem] uppercase text-white"
                style={rankedTitleStyle}
              >
                Ranked Match
              </h1>
              <div className="mt-1.5 text-lg font-black uppercase tracking-wide text-white/90">
                {rankedProfileLoading
                  ? '1v1 Competitive'
                  : isPlacementInProgress
                    ? `Placement ${placementPlayed}/${placementRequired}`
                    : '1v1 Competitive'}
              </div>


              <div className="mt-5">
                <div className="flex w-[180px] items-center justify-center rounded-[8px] bg-black h-[56px] text-xl font-black uppercase tracking-wide text-white">
                  Play
                </div>
              </div>
            </div>

            {/* Right: RP stats */}
            <div className="text-right shrink-0 w-[280px]">
              <div className="inline-flex flex-col items-stretch">
                <div className="text-4xl font-black text-brand-yellow drop-shadow-[0_2px_12px_rgba(255,229,0,0.25)] whitespace-nowrap">
                  {displayRp}/{nextTierTargetRp ?? 600} RP
                </div>
                <div className="mt-2">
                  <RpProgressBar current={displayRp} target={nextTierTargetRp ?? 600} />
                </div>
              </div>
              {!rankedProfileLoading && (
                <div className="mt-1.5 text-[11px] font-black uppercase tracking-wide text-white/70">
                  {rankedWinRate}% win rate · {rankedGamesPlayed} ranked games
                </div>
              )}
              <div className="mt-0.5 text-sm font-black uppercase tracking-wide text-white">
                {isPlacementInProgress
                  ? `${placementMatchesLeft} match${placementMatchesLeft === 1 ? "" : "es"} to rank reveal`
                  : nextTierBand
                    ? <>{Math.max(0, (nextTierTargetRp ?? 0) - displayRp)} RP to <span className="text-white">{nextTierBand.tier}</span></>
                    : "Max rank reached"}
              </div>
            </div>
          </div>

          {/* ── Mobile layout ── */}
          <div className="lg:hidden">
            {/* Top row: title (left) | RP block (right) */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1
                  className="text-[1.55rem] leading-none uppercase text-white whitespace-nowrap"
                  style={rankedTitleStyle}
                >
                  Ranked Match
                </h1>
                <div className="mt-1.5 text-[11px] font-black uppercase tracking-wide text-white/90">
                  {rankedProfileLoading
                    ? '1v1 Competitive'
                    : isPlacementInProgress
                      ? `Placement ${placementPlayed}/${placementRequired}`
                      : '1v1 Competitive'}
                </div>
              </div>
              <div className="shrink-0 text-right w-[125px]">
                <div className="text-[1.4rem] font-black leading-none text-brand-yellow drop-shadow-[0_2px_12px_rgba(255,229,0,0.25)]">
                  {displayRp}/{nextTierTargetRp ?? 600} RP
                </div>
                <div className="mt-2">
                  <RpProgressBar current={displayRp} target={nextTierTargetRp ?? 600} />
                </div>
                <div className="mt-1 text-[9px] font-black uppercase tracking-wide text-white/85">
                  {isPlacementInProgress
                    ? `${placementMatchesLeft} match${placementMatchesLeft === 1 ? "" : "es"} left`
                    : nextTierBand
                      ? <>{Math.max(0, (nextTierTargetRp ?? 0) - displayRp)} RP to <span className="text-white">{nextTierBand.tier}</span></>
                      : "Max rank reached"}
                </div>
              </div>
            </div>

            {/* Bottom row: trophy icon + win rate (left) | PLAY (right) */}
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="flex flex-col items-start gap-2">
                <Image
                  src="/assets/ranked-icon.webp"
                  alt=""
                  width={160}
                  height={160}
                  className="h-[88px] w-[88px] object-contain pointer-events-none"
                />
                {!rankedProfileLoading && (
                  <div className="text-[10px] font-black uppercase tracking-wide text-white/80">
                    {rankedWinRate}% win rate · {rankedGamesPlayed} ranked games
                  </div>
                )}
              </div>
              <div className="mb-1 flex h-[44px] w-[120px] items-center justify-center rounded-[8px] bg-black text-[15px] font-black uppercase tracking-wide text-white">
                Play
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. Secondary Modes Grid ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3 md:gap-4"
      >
        {/* Friendly Match */}
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
          className="relative cursor-pointer overflow-hidden rounded-[10px] md:min-h-0 p-3 md:p-6 text-left active:translate-y-[2px] transition-all focus-visible:outline-none focus-visible:ring-2"
          style={{ backgroundColor: colors.blue.brand }}
        >
          {/* Desktop watermark icon (mobile uses inline icon below) */}
          <Image
            src="/assets/friendly_match-icon.webp"
            alt=""
            width={160}
            height={160}
            className="hidden lg:block absolute right-4 bottom-4 h-36 w-36 object-contain opacity-90 pointer-events-none"
          />
          <div className="relative z-10 flex h-full flex-col items-center text-center md:items-start md:text-left">
            <h3
              className="whitespace-nowrap text-[0.95rem] leading-[1] uppercase text-white md:text-4xl"
              style={friendlyTitleStyle}
            >
              Friendly Match
            </h3>
            <p className="mt-1 text-[10px] md:mt-1.5 md:text-base font-black uppercase text-white">Create/Join Room</p>

            {/* Mobile: icon (centered, right under subtitle) + PLAY (bottom, full width) */}
            <div className="mt-1.5 flex flex-1 items-center justify-center lg:hidden">
              <Image
                src="/assets/friendly_match-icon.webp"
                alt=""
                width={500}
                height={500}
                className="h-[110px] w-[110px] object-contain pointer-events-none"
              />
            </div>
            <div className="mt-1.5 flex h-[36px] w-full items-center justify-center rounded-[8px] bg-black text-[12px] font-black uppercase tracking-wide text-white lg:hidden">
              Play
            </div>

            {/* Desktop: bottom-left PLAY */}
            <div className="mt-auto hidden pt-8 lg:block">
              <div className="flex h-[56px] w-[180px] items-center justify-center rounded-[8px] bg-black text-xl font-black uppercase tracking-wide text-white">
                Play
              </div>
            </div>
          </div>
        </div>

        {/* Daily Challenge */}
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
          className="relative cursor-pointer overflow-hidden rounded-[10px] md:min-h-0 p-3 md:p-6 text-left active:translate-y-[2px] transition-all focus-visible:outline-none focus-visible:ring-2"
          style={{ backgroundColor: colors.yellow.base }}
        >
          {/* Desktop watermark icon (mobile uses inline icon below) */}
          <Image
            src="/assets/daily_chllangeicon.webp"
            alt=""
            width={160}
            height={160}
            className="hidden lg:block absolute right-2 bottom-2 h-40 w-40 object-contain opacity-90 pointer-events-none"
          />
          <div className="relative z-10 flex h-full flex-col items-center text-center md:items-start md:text-left">
            <h3
              className="whitespace-nowrap text-[0.95rem] leading-[1] uppercase text-black md:text-4xl"
              style={dailyTitleStyle}
            >
              Daily Challenge
            </h3>
            <p className="mt-1 text-[10px] md:mt-1.5 md:text-base font-black uppercase text-black">View Challenges</p>

            {/* Mobile: icon (centered, right under subtitle) + PLAY (bottom, full width) */}
            <div className="mt-1.5 flex flex-1 items-center justify-center lg:hidden">
              <Image
                src="/assets/daily_challenge_mobile.webp"
                alt=""
                width={528}
                height={528}
                className="h-[150px] w-full object-contain pointer-events-none"
              />
            </div>
            <div className="mt-1.5 flex h-[36px] w-full items-center justify-center rounded-[8px] bg-black text-[12px] font-black uppercase tracking-wide text-white lg:hidden">
              Play
            </div>

            {/* Desktop: bottom-left PLAY */}
            <div className="mt-auto hidden pt-8 lg:block">
              <div className="flex h-[56px] w-[180px] items-center justify-center rounded-[8px] bg-black text-xl font-black uppercase tracking-wide text-white">
                Play
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
          <h2 className="text-base font-black text-white uppercase">
            Objectives
          </h2>
          <Link
            href="/objectives"
            className="flex items-center justify-center w-[120px] h-[40px] rounded-xl border-2 border-brand-green-light text-xs font-black text-white uppercase tracking-wide hover:bg-brand-green-light/10 transition-colors"
          >
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:hidden">
          {objectivesLoading && [0, 1].map((item) => (
            <div
              key={item}
              className="rounded-xl bg-brand-green-deep/70 p-3"
            >
              <div className="mb-2 flex items-center justify-center">
                <div className="size-12 animate-pulse rounded-[10px] bg-white/10" />
              </div>
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/12" />
              <div className="mt-2 h-2 w-full animate-pulse rounded-full bg-white/8" />
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#07200C]">
                <div className="h-full w-1/4 animate-pulse rounded-full bg-brand-green-light/55" />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="h-2 w-8 animate-pulse rounded-full bg-white/12" />
                <div className="h-2 w-14 animate-pulse rounded-full bg-white/12" />
              </div>
            </div>
          ))}
          {!objectivesLoading && !hasPreviewObjectives && (
            <Link
              href="/objectives"
              className="col-span-2 rounded-xl bg-brand-green-deep p-4 transition-all hover:bg-brand-green"
            >
              <div className="mb-2 flex items-center justify-center">
                <Image src="/assets/obj_icon.png" alt="" width={45} height={44} className="size-12 object-contain opacity-90" />
              </div>
              <h4 className="text-center text-[11px] font-black leading-tight text-white uppercase">Objectives unavailable</h4>
              <p className="mt-1 text-center text-[10px] leading-tight text-white/75">Open objectives to refresh</p>
            </Link>
          )}
          {previewObjectives.map((objective) => {
            const progressPercent = objective.target > 0
              ? Math.min(100, Math.round((objective.progress / objective.target) * 100))
              : 0;

            return (
              <Link
                key={objective.id}
                href="/objectives"
                className="rounded-xl bg-brand-green-deep p-3 transition-all hover:bg-brand-green"
              >
                <div className="mb-2 flex items-center justify-center">
                  <Image src="/assets/obj_icon.png" alt="" width={45} height={44} className="size-12 object-contain opacity-90" />
                </div>
                <h4 className="text-[10px] font-black leading-tight text-white uppercase truncate">{objective.title}</h4>
                <p className="mt-0.5 line-clamp-2 min-h-[22px] text-[9px] leading-tight text-white/80">{objective.description}</p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#07200C]">
                  <div className="h-full rounded-full bg-brand-green-light" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase">
                  <span className="text-white">{objective.progress}/{objective.target}</span>
                  <span className="text-white/65">+{objective.rewardCoins} Coins</span>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="hidden lg:flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {objectivesLoading && [0, 1, 2].map((item) => (
            <div
              key={item}
              className="shrink-0 w-[260px] rounded-[10px] bg-[#1A3A1A]/80 p-4 md:w-[300px]"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="size-12 shrink-0 animate-pulse rounded-[10px] bg-white/10" />
                <div className="min-w-0 flex-1">
                  <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/12" />
                  <div className="mt-2 h-2 w-full animate-pulse rounded-full bg-white/8" />
                </div>
              </div>
              <div className="mb-2.5 h-3 overflow-hidden rounded-full bg-[#0F260F]">
                <div className="h-full w-1/4 animate-pulse rounded-full bg-brand-green-light/55" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-10 animate-pulse rounded-full bg-white/12" />
                <div className="h-3 w-20 animate-pulse rounded-full bg-white/12" />
              </div>
            </div>
          ))}
          {!objectivesLoading && !hasPreviewObjectives && (
            <Link
              href="/objectives"
              className="shrink-0 w-[260px] rounded-[10px] bg-[#1A3A1A] p-4 transition-all hover:bg-[#224422] md:w-[300px]"
            >
              <div className="mb-3 flex items-center gap-3">
                <Image src="/assets/obj_icon.png" alt="" width={45} height={44} className="size-12 object-contain" />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-black uppercase text-white">Objectives unavailable</h4>
                  <p className="truncate text-[11px] font-bold uppercase text-white/60">Open objectives to refresh</p>
                </div>
              </div>
              <div className="mb-2.5 h-3 overflow-hidden rounded-full bg-[#0F260F]">
                <div className="h-full w-[8%] rounded-full bg-brand-green-light" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white">0/1</span>
                <span className="text-xs font-black uppercase text-white">Coins + XP</span>
              </div>
            </Link>
          )}
          {previewObjectives.map((objective) => {
            const progressPercent = objective.target > 0
              ? Math.min(100, Math.round((objective.progress / objective.target) * 100))
              : 0;

            return (
              <Link
                key={objective.id}
                href="/objectives"
                className={cn(
                  "shrink-0 w-[260px] rounded-[10px] bg-[#1A3A1A] p-4 transition-all hover:bg-[#224422] md:w-[300px]",
                  objective.completed && "ring-1 ring-brand-green-light/30"
                )}
              >
                <div className="mb-3 flex items-center gap-3">
                  <Image src="/assets/obj_icon.png" alt="" width={45} height={44} className="size-12 object-contain" />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-black uppercase text-white">{objective.title}</h4>
                    <p className="truncate text-[11px] font-bold uppercase text-white/60">{objective.description}</p>
                  </div>
                </div>
                <div className="mb-2.5 h-3 overflow-hidden rounded-full bg-[#0F260F]">
                  <div className="h-full rounded-full bg-brand-green-light" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">{objective.progress}/{objective.target}</span>
                  <span className="text-xs font-black uppercase text-white">+{objective.rewardCoins} Coins</span>
                </div>
              </Link>
            );
          })}
        </div>
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
