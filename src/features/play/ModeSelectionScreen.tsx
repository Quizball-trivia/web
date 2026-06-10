import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ModeConfirmModal } from '@/components/shared/ModeConfirmModal';
import { FriendPlayModal } from '@/components/shared/FriendPlayModal';
import { HomeRecentMatches } from '@/components/shared/HomeRecentMatches';
import { useLocale } from '@/contexts/LocaleContext';
import { getI18nText } from '@/lib/utils/i18n';
import type { MatchStatsSummary } from '@/lib/domain';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';
import { useObjectives } from '@/lib/queries/objectives.queries';
import { useObjectivesEnabled } from '@/lib/hooks/useObjectivesEnabled';
import { useActiveEventMode } from '@/lib/hooks/useActiveEventMode';

import { colors } from '@/lib/colors';

import { getNextTierBand } from '@/utils/rankedTier';

const PLAY_ENTRANCE_SESSION_KEY = 'quizball.playEntranceSeen';
const PLAY_ENTRANCE_INITIAL = { opacity: 0.88, scale: 0.985 } as const;
const PLAY_ENTRANCE_ANIMATE = { opacity: 1, scale: 1 } as const;
const PLAY_ENTRANCE_TRANSITION = { duration: 0.22, ease: 'easeOut' } as const;

function shouldPlayEntranceAnimation() {
  if (typeof window === 'undefined') return false;

  try {
    return window.sessionStorage.getItem(PLAY_ENTRANCE_SESSION_KEY) !== '1';
  } catch {
    return false;
  }
}


/**
 * Renders the win-rate stat line ("13% win rate · 104 ranked games") with white
 * label text but the numeric values highlighted in brand yellow. The line is
 * split on " · " into its two halves; in both EN and KA each half starts with
 * its number, so we wrap the leading numeric token of each half in yellow.
 */
function WinRateStat({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const halves = text.split(' · ');
  return (
    <span className={className} style={style}>
      {halves.map((half, i) => {
        const match = half.match(/^(\d[\d.,]*%?)(.*)$/);
        return (
          <span key={i}>
            {i > 0 && ' · '}
            {match ? (
              <>
                <span className="text-brand-yellow">{match[1]}</span>
                {match[2]}
              </>
            ) : (
              half
            )}
          </span>
        );
      })}
    </span>
  );
}

function RpProgressBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div
      className="h-3.5 md:h-[18px] w-full overflow-hidden rounded-[5px]"
      style={{ backgroundColor: '#195006' }}
    >
      <div
        className="h-full rounded-[5px] bg-brand-yellow transition-all duration-500"
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
  const { t, locale } = useLocale();
  const { isEventMode } = useActiveEventMode();
  const [selectedMode, setSelectedMode] = useState<'ranked' | 'friendly' | 'solo' | null>(null);
  const [playEntranceAnimation] = useState(shouldPlayEntranceAnimation);
  const [wcDaysLeft] = useState(() => Math.max(0, Math.ceil((new Date('2026-07-19T23:59:59Z').getTime() - Date.now()) / 86_400_000)));
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
  const objectivesEnabled = useObjectivesEnabled();
  const { data: objectivesData, isLoading: objectivesLoading } = useObjectives({ enabled: objectivesEnabled });
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
  // Shared Poppins style for body/label/button text (replaces the old
  // font-black/font-bold Duolingo weights). Only Poppins 600 is loaded.
  const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

  useEffect(() => {
    if (!playEntranceAnimation) return;

    try {
      window.sessionStorage.setItem(PLAY_ENTRANCE_SESSION_KEY, '1');
    } catch {
      // Session storage can be unavailable in private or restricted contexts.
    }
  }, [playEntranceAnimation]);

  const handleConfirm = () => {
    if (!selectedMode) return;
    if (selectedMode === 'friendly') {
      setSelectedMode(null);
      return;
    }
    // Keep the modal OPEN: the PLAY button switches to its starting spinner
    // while onSelectMode does its pre-navigation work (ranked refetches the
    // live wallet before router.push) and the game route loads. Closing the
    // modal here left the play screen with zero feedback for that window,
    // which read as "the tap didn't register". The modal unmounts naturally
    // with the page on navigation.
    onSelectMode(selectedMode);
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
    <motion.div
      initial={playEntranceAnimation ? PLAY_ENTRANCE_INITIAL : false}
      animate={PLAY_ENTRANCE_ANIMATE}
      transition={playEntranceAnimation ? PLAY_ENTRANCE_TRANSITION : { duration: 0 }}
      className="max-w-5xl mx-auto px-4 py-3 space-y-4 md:py-6 md:space-y-5 font-fun"
    >

      {/* ─── 1. Ranked Hero Card ─── */}
      <div
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
        {/* Ranked trophy — centred horizontally at ~52.6%, anchored from the top
            at ~15% and sized to ~90% of card height so the wrists run off the
            bottom edge and clip there (matches Figma node 1361:52, which sits
            ~104% down the card). The card's overflow-hidden does the clipping. */}
        <Image
          src="/assets/brand/ranked-hands-trophy.svg"
          alt=""
          width={257}
          height={294}
          className="hidden lg:block absolute left-[52.6%] top-[15%] h-[90%] w-auto -translate-x-1/2 object-contain object-top pointer-events-none"
        />

        <div className="relative z-10 p-4 md:p-7">
          {/* ── Desktop layout ── */}
          <div className="hidden lg:flex items-start gap-6">
            {/* Left: Title + Play. Title is capped at the trophy's left edge
                (~40% of the card) so long locales (e.g. Georgian) wrap onto a
                second line instead of running under the absolute trophy. */}
            <div className="flex-1 min-w-0">
              <h1
                className="max-w-[20rem] text-[clamp(1.75rem,3vw,2.75rem)] uppercase text-white break-words [hyphens:auto]"
                style={{ ...rankedTitleStyle, lineHeight: 1.15 }}
              >
                {isEventMode ? t('play.rankedMatchEvent') : t('play.rankedMatch')}
              </h1>
              <div className="mt-1.5 text-lg uppercase tracking-wide text-white/90" style={poppins}>
                {rankedProfileLoading
                  ? t('play.rankedSubtitle')
                  : isPlacementInProgress
                    ? t('play.rankedPlacement', { played: placementPlayed, required: placementRequired })
                    : t('play.rankedSubtitle')}
              </div>

              {/* World Cup event info — event only */}
              {isEventMode && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-yellow px-3 py-1 text-[10px] font-black uppercase tracking-wide text-black">
                    <Image src="/assets/brand/world-cup-trophy.webp" alt="" width={14} height={14} className="h-3.5 w-auto object-contain" />
                    {t('play.eventWinPrizes')}
                  </span>
                  <span className="rounded-full bg-brand-orange px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white animate-pulse">
                    🔥 {t('play.eventDaysLeft', { count: wcDaysLeft })}
                  </span>
                </div>
              )}

              <div className="mt-5">
                <div className="flex h-[56px] w-[180px] items-center justify-center rounded-[16px] bg-surface-page text-xl uppercase tracking-wide text-white" style={poppins}>
                  {t('common.play')}
                </div>
              </div>
            </div>

            {/* Right: RP stats */}
            <div className="text-right shrink-0 w-[280px]">
              <div className="inline-flex flex-col items-stretch">
                <div className="text-4xl text-brand-yellow drop-shadow-[0_2px_12px_rgba(255,229,0,0.25)] whitespace-nowrap" style={poppins}>
                  {displayRp}/{nextTierTargetRp ?? 600} RP
                </div>
                <div className="mt-2">
                  <RpProgressBar current={displayRp} target={nextTierTargetRp ?? 600} />
                </div>
              </div>
              {!rankedProfileLoading && (
                <WinRateStat
                  text={t('play.winRateLine', { rate: rankedWinRate, games: rankedGamesPlayed })}
                  className="mt-2 block whitespace-nowrap text-[13px] uppercase leading-snug tracking-wide text-white"
                  style={poppins}
                />
              )}
              <div className="mt-1 text-[17px] uppercase tracking-wide text-white" style={poppins}>
                {isPlacementInProgress
                  ? t(
                      placementMatchesLeft === 1
                        ? 'play.matchesToRankReveal'
                        : 'play.matchesToRankRevealPlural',
                      { count: placementMatchesLeft },
                    )
                  : nextTierBand
                    ? <>{t('play.rpToTier', { rp: Math.max(0, (nextTierTargetRp ?? 0) - displayRp) })}<span className="text-brand-yellow">{nextTierBand.tier}</span></>
                    : t('play.maxRankReached')}
              </div>
            </div>
          </div>

          {/* ── Mobile layout ── */}
          <div className="lg:hidden">
            {/* Top row: title (left) | RP block (right) */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1
                  className="text-[1.55rem] leading-[1.05] uppercase text-white break-words [hyphens:auto]"
                  style={rankedTitleStyle}
                >
                  {t('play.rankedMatch')}
                </h1>
                <div className="mt-1.5 text-[11px] uppercase tracking-wide text-white/90" style={poppins}>
                  {rankedProfileLoading
                    ? t('play.rankedSubtitle')
                    : isPlacementInProgress
                      ? t('play.rankedPlacement', { played: placementPlayed, required: placementRequired })
                      : t('play.rankedSubtitle')}
                </div>
                {/* World Cup event info — mobile, event only */}
                {isEventMode && (
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-yellow px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-black">
                      <Image src="/assets/brand/world-cup-trophy.webp" alt="" width={12} height={12} className="h-3 w-auto object-contain" />
                      {t('play.eventWinPrizes')}
                    </span>
                    <span className="rounded-full bg-brand-orange px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-white animate-pulse">
                      🔥 {t('play.eventDaysLeftShort', { count: wcDaysLeft })}
                    </span>
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right w-[125px]">
                <div className="text-[1.4rem] leading-none text-brand-yellow drop-shadow-[0_2px_12px_rgba(255,229,0,0.25)]" style={poppins}>
                  {displayRp}/{nextTierTargetRp ?? 600} RP
                </div>
                <div className="mt-2">
                  <RpProgressBar current={displayRp} target={nextTierTargetRp ?? 600} />
                </div>
                <div className="mt-1.5 text-[12px] uppercase leading-snug tracking-wide text-white" style={poppins}>
                  {isPlacementInProgress
                    ? t(
                        placementMatchesLeft === 1
                          ? 'play.matchesLeft'
                          : 'play.matchesLeftPlural',
                        { count: placementMatchesLeft },
                      )
                    : nextTierBand
                      ? <>{t('play.rpToTier', { rp: Math.max(0, (nextTierTargetRp ?? 0) - displayRp) })}<span className="text-brand-yellow">{nextTierBand.tier}</span></>
                      : t('play.maxRankReached')}
                </div>
                {/* Betsson badge — mobile only, below tier label, event only */}
                {isEventMode && (
                  <div
                    className="mt-1.5 inline-flex flex-col items-start rounded-md px-2 py-1 lg:hidden"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <span className="text-[5px] font-bold uppercase tracking-wider text-white/60 leading-none">Powered by</span>
                    <Image src="/assets/betsson/3.png" alt="Betsson Sport" width={72} height={14} className="h-2.5 w-auto object-contain mt-0.5" />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom row: trophy icon + win rate (left) | PLAY (right) */}
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="flex flex-col items-start gap-2">
                <Image
                  src="/assets/brand/ranked-hands-trophy.svg"
                  alt=""
                  width={257}
                  height={294}
                  className="h-[176px] w-auto object-contain pointer-events-none"
                />
                {!rankedProfileLoading && (
                  <WinRateStat
                    text={t('play.winRateLine', { rate: rankedWinRate, games: rankedGamesPlayed })}
                    className="block text-[13px] uppercase leading-snug tracking-wide text-white"
                    style={poppins}
                  />
                )}
              </div>
              <div className="mb-1 flex h-[44px] w-[120px] items-center justify-center rounded-[12px] bg-surface-page text-[15px] uppercase tracking-wide text-white" style={poppins}>
                {t('common.play')}
              </div>
            </div>
          </div>
        </div>

        {/* Betsson badge — bottom-right on desktop only, event only */}
        {isEventMode && (
          <div
            className="hidden lg:flex absolute bottom-4 right-4 z-20 flex-col items-start rounded-lg px-3 py-1.5"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <span className="text-[8px] font-bold uppercase tracking-wider text-white/60 leading-none">Powered by</span>
            <Image src="/assets/betsson/3.png" alt="Betsson Sport" width={96} height={18} className="h-4 w-auto object-contain mt-0.5" />
          </div>
        )}
      </div>

      {/* ─── 2. Secondary Modes Grid ─── */}
      <div
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
              className="text-[0.95rem] leading-[1.05] uppercase text-white break-words [hyphens:auto] md:text-[clamp(1.5rem,2.4vw,2.25rem)]"
              style={friendlyTitleStyle}
            >
              {t('play.friendlyMatch')}
            </h3>
            <p className="mt-1 text-[10px] md:mt-1.5 md:text-base uppercase text-white" style={poppins}>{t('play.friendlySubtitle')}</p>

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
            <div className="mt-1.5 flex h-[36px] w-full items-center justify-center rounded-[8px] bg-black text-[12px] uppercase tracking-wide text-white lg:hidden" style={poppins}>
              {t('common.play')}
            </div>

            {/* Desktop: bottom-left PLAY */}
            <div className="mt-auto hidden pt-8 lg:block">
              <div className="flex h-[56px] w-[180px] items-center justify-center rounded-[8px] bg-black text-xl uppercase tracking-wide text-white" style={poppins}>
                {t('common.play')}
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
              className="text-[0.95rem] leading-[1.05] uppercase text-black break-words [hyphens:auto] md:text-[clamp(1.5rem,2.4vw,2.25rem)]"
              style={dailyTitleStyle}
            >
              {t('play.dailyChallenge')}
            </h3>
            <p className="mt-1 text-[10px] md:mt-1.5 md:text-base uppercase text-black" style={poppins}>{t('play.dailySubtitle')}</p>

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
            <div className="mt-1.5 flex h-[36px] w-full items-center justify-center rounded-[8px] bg-black text-[12px] uppercase tracking-wide text-white lg:hidden" style={poppins}>
              {t('common.play')}
            </div>

            {/* Desktop: bottom-left PLAY */}
            <div className="mt-auto hidden pt-8 lg:block">
              <div className="flex h-[56px] w-[180px] items-center justify-center rounded-[8px] bg-black text-xl uppercase tracking-wide text-white" style={poppins}>
                {t('common.play')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. Objectives ─── */}
      {objectivesEnabled && (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base text-white uppercase" style={poppins}>
            {t('play.objectivesTitle')}
          </h2>
          <Link
            href="/objectives"
            style={poppins}
            className="flex items-center justify-center w-[120px] h-[40px] rounded-xl border-2 border-brand-green-light text-xs text-white uppercase tracking-wide hover:bg-brand-green-light/10 transition-colors"
          >
            {t('common.viewAll')}
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
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-mode-trough">
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
              <h4 className="text-center text-[11px] leading-tight text-white uppercase" style={poppins}>{t('play.objectivesUnavailable')}</h4>
              <p className="mt-1 text-center text-[10px] leading-tight text-white/75">{t('play.objectivesUnavailableHint')}</p>
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
                <h4 className="text-[10px] leading-tight text-white uppercase truncate" style={poppins}>{getI18nText(objective.title, locale)}</h4>
                <p className="mt-0.5 line-clamp-2 min-h-[22px] text-[9px] leading-tight text-white/80">{getI18nText(objective.description, locale)}</p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-mode-trough">
                  <div className="h-full rounded-full bg-brand-green-light" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px] uppercase" style={poppins}>
                  <span className="text-white">{objective.progress}/{objective.target}</span>
                  <span className="text-white/65">{t('play.objectiveRewardCoins', { count: objective.rewardCoins })}</span>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="hidden lg:flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {objectivesLoading && [0, 1, 2].map((item) => (
            <div
              key={item}
              className="shrink-0 w-[260px] rounded-[10px] bg-surface-mode-card/80 p-4 md:w-[300px]"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="size-12 shrink-0 animate-pulse rounded-[10px] bg-white/10" />
                <div className="min-w-0 flex-1">
                  <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/12" />
                  <div className="mt-2 h-2 w-full animate-pulse rounded-full bg-white/8" />
                </div>
              </div>
              <div className="mb-2.5 h-3 overflow-hidden rounded-full bg-surface-mode-trough-deep">
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
              className="shrink-0 w-[260px] rounded-[10px] bg-surface-mode-card p-4 transition-all hover:bg-surface-mode-card-hover md:w-[300px]"
            >
              <div className="mb-3 flex items-center gap-3">
                <Image src="/assets/obj_icon.png" alt="" width={45} height={44} className="size-12 object-contain" />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm uppercase text-white" style={poppins}>{t('play.objectivesUnavailable')}</h4>
                  <p className="truncate text-[11px] uppercase text-white/60" style={poppins}>{t('play.objectivesUnavailableHint')}</p>
                </div>
              </div>
              <div className="mb-2.5 h-3 overflow-hidden rounded-full bg-surface-mode-trough-deep">
                <div className="h-full w-[8%] rounded-full bg-brand-green-light" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white" style={poppins}>0/1</span>
                <span className="text-xs uppercase text-white" style={poppins}>{t('play.objectiveRewardCoinsAndXp')}</span>
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
                  "shrink-0 w-[260px] rounded-[10px] bg-surface-mode-card p-4 transition-all hover:bg-surface-mode-card-hover md:w-[300px]",
                  objective.completed && "ring-1 ring-brand-green-light/30"
                )}
              >
                <div className="mb-3 flex items-center gap-3">
                  <Image src="/assets/obj_icon.png" alt="" width={45} height={44} className="size-12 object-contain" />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm uppercase text-white" style={poppins}>{getI18nText(objective.title, locale)}</h4>
                    <p className="truncate text-[11px] uppercase text-white/60" style={poppins}>{getI18nText(objective.description, locale)}</p>
                  </div>
                </div>
                <div className="mb-2.5 h-3 overflow-hidden rounded-full bg-surface-mode-trough-deep">
                  <div className="h-full rounded-full bg-brand-green-light" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white" style={poppins}>{objective.progress}/{objective.target}</span>
                  <span className="text-xs uppercase text-white" style={poppins}>{t('play.objectiveRewardCoins', { count: objective.rewardCoins })}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      )}

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
    </motion.div>
  );
}
