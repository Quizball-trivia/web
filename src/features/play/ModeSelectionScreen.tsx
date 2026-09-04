import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ModeConfirmModal } from '@/components/shared/ModeConfirmModal';
import { FriendPlayModal } from '@/components/shared/FriendPlayModal';
import { AuctionModeModal } from '@/features/auction/components/AuctionModeModal';
import { FootballGridModeModal } from '@/features/football-grid/components/FootballGridModeModal';
import { HomeRecentMatches } from '@/components/shared/HomeRecentMatches';
import { AllGamesGrid } from '@/features/play/AllGamesGrid';
import { Bot, MessageCircle } from 'lucide-react';
import { SocialLinks } from '@/components/shared/SocialLinks';
import { ContactModal } from '@/components/shared/ContactModal';
import { useLocale } from '@/contexts/LocaleContext';
import { useTierLabel } from '@/hooks/useTierLabel';
import { getI18nText } from '@/lib/utils/i18n';
import type { MatchStatsSummary } from '@/lib/domain';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';
import { useObjectives } from '@/lib/queries/objectives.queries';
import { useObjectivesEnabled } from '@/lib/hooks/useObjectivesEnabled';
import { useActiveEventMode } from '@/lib/hooks/useActiveEventMode';

import { colors } from '@/lib/colors';
import { isAuctionCardEnabled, isTicTacToeEnabled } from '@/lib/features/playModes';
import { WeekendLeagueProgressExperimentRail } from '@/features/weekend-league/components/WeekendLeagueProgressExperimentRail';
import { trackWlBannerClicked, trackWlBannerViewed } from '@/lib/analytics/game-events';

import { getNextTierBand } from '@/utils/rankedTier';
import { footballGridAssetUrl } from '@/lib/football-grid/assets';
import { useAuthStore } from '@/stores/auth.store';
import { useAuthPromptStore } from '@/stores/authPrompt.store';

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

/** Compact mode card (bottom row): title + subtitle, big pictogram icon
 *  bottom-right, optional NEW pill. The whole card is the tap target. */
function MiniModeCard({
  bg,
  dark = false,
  title,
  subtitle,
  iconSrc,
  badge,
  badge2 = null,
  ctaLabel,
  className,
  href,
  onClick,
}: {
  bg: string;
  /** true = black text (light card colors) */
  dark?: boolean;
  title: string;
  subtitle: string;
  iconSrc: string;
  badge?: string | null;
  /** Second pill next to the first (e.g. NEW + game count). */
  badge2?: string | null;
  ctaLabel: string;
  className?: string;
  /** Route target — renders a real link (a11y, open-in-new-tab). */
  href?: string;
  /** Modal opener — used when there is no href. */
  onClick?: () => void;
}) {
  const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;
  const text = dark ? 'text-black' : 'text-white';
  const cardClassName = cn(
    'relative block h-full min-h-[250px] lg:min-h-[300px] cursor-pointer overflow-hidden rounded-[10px] p-3.5 md:p-6 text-left active:translate-y-[2px] transition-all focus-visible:outline-none focus-visible:ring-2',
    className,
  );
  // Phones: pills sit in flow above the title (Georgian titles are too wide to
  // share the line with a floating badge); desktop keeps them floating.
  const inner = (
    <>
      {(badge || badge2) && (
        <div className="z-20 mb-1.5 flex items-center gap-1.5 md:absolute md:top-4 md:right-4 md:mb-0">
          {badge && (
            <div
              className="rounded-full bg-brand-yellow px-2.5 py-1 text-[8px] uppercase tracking-wide text-black md:text-[11px]"
              style={poppins}
            >
              {badge}
            </div>
          )}
          {badge2 && (
            <div
              className={`rounded-full px-2.5 py-1 text-[8px] md:text-[11px] uppercase tracking-wide ${dark ? 'bg-black text-white' : 'bg-white/20 text-white'}`}
              style={poppins}
            >
              {badge2}
            </div>
          )}
        </div>
      )}
      <div className="relative z-10 flex h-full flex-col">
        {/* keep-all: Georgian has no hyphenation — auto-hyphens split words
            mid-syllable with no visible hyphen ("გამოწვევ/ა"). */}
        <h3
          className={`${badge || badge2 ? 'md:pr-12' : 'pr-1'} text-[1rem] md:text-[clamp(1.4rem,2.2vw,2rem)] leading-[1.12] uppercase [overflow-wrap:normal] [word-break:keep-all] [hyphens:none] ${text}`}
          style={poppins}
        >
          {title}
        </h3>
        <p className={`mt-1.5 text-[10px] uppercase md:text-[14px] ${dark ? 'text-black/70' : 'text-white/80'}`} style={poppins}>
          {subtitle}
        </p>
        <div className="mt-2 flex flex-1 items-center justify-center lg:hidden">
          <Image
            src={iconSrc}
            alt=""
            width={200}
            height={200}
            className="pointer-events-none h-[104px] w-[104px] object-contain opacity-90"
          />
        </div>
        <div
          className="mt-2 flex h-9 w-full items-center justify-center rounded-[8px] bg-black text-[12px] uppercase tracking-wide text-white lg:hidden"
          style={poppins}
        >
          {ctaLabel}
        </div>

        <div className="mt-auto hidden items-end gap-3 pt-6 lg:flex">
          <div
            className="flex h-11 w-[136px] shrink-0 items-center justify-center rounded-[8px] bg-black text-base uppercase tracking-wide text-white"
            style={poppins}
          >
            {ctaLabel}
          </div>
          <div className="flex min-w-0 flex-1 justify-end">
            <Image
              src={iconSrc}
              alt=""
              width={200}
              height={200}
              className="pointer-events-none h-24 w-full max-w-24 object-contain object-right opacity-90"
            />
          </div>
        </div>
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cardClassName} style={{ backgroundColor: bg }}>
        {inner}
      </Link>
    );
  }
  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
      className={cardClassName}
      style={{ backgroundColor: bg }}
    >
      {inner}
    </div>
  );
}

interface ModeSelectionScreenProps {
  onSelectMode: (mode: 'ranked' | 'friendly' | 'solo') => void;
  /** Optional experiment-owned content immediately below the Weekend League rail. */
  playHomeNotice?: React.ReactNode;
  /** Opens the normal confirmation modal immediately for deep-linked flows. */
  initialMode?: 'ranked' | 'friendly' | 'solo';
  /** If provided, called when ranked card is clicked BEFORE the confirm modal opens.
   *  Return `true` to prevent the confirm modal from showing (i.e. the caller handles it). */
  onRankedIntercept?: () => boolean;
  ticketsRemaining?: number;
  matchStatsSummary?: MatchStatsSummary | null;
  rankedProfile: RankedProfileResponse | null;
  rankedProfileLoading?: boolean;
}


// Owner call: Recent Matches is hidden on the Play page for now.
const SHOW_RECENT_MATCHES = false;

export function ModeSelectionScreen({
  onSelectMode,
  playHomeNotice,
  initialMode,
  onRankedIntercept,
  ticketsRemaining = 0,
  matchStatsSummary = null,
  rankedProfile,
  rankedProfileLoading = false,
}: ModeSelectionScreenProps) {
  const { t, locale } = useLocale();
  const tierLabelOf = useTierLabel();

  // Funnel top: the WL rail is above the fold on every /play visit, so a
  // mount IS an impression. Ref-guarded so dev Strict Mode's double-effect
  // doesn't double-count when a dev build points at real analytics.
  const bannerViewedRef = useRef(false);
  useEffect(() => {
    if (bannerViewedRef.current) return;
    bannerViewedRef.current = true;
    trackWlBannerViewed();
  }, []);
  const { isEventMode } = useActiveEventMode();
  // Ranked and Friendly open the shared confirmation modal. Daily and the
  // optional modes navigate directly or open their own modal.
  const [selectedMode, setSelectedMode] = useState<'ranked' | 'friendly' | 'solo' | null>(
    initialMode ?? null,
  );
  const [auctionModalOpen, setAuctionModalOpen] = useState(false);
  const [gridModalOpen, setGridModalOpen] = useState(false);
  const [playEntranceAnimation] = useState(shouldPlayEntranceAnimation);
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
  // Guest mode: signed-out visitors browse the Play page and try demos, but any
  // action that needs an account opens the sign-in dialog instead.
  const isGuest = useAuthStore((state) => state.status) === 'anonymous';
  const openAuthPrompt = useAuthPromptStore((state) => state.open);
  const objectivesEnabled = useObjectivesEnabled();
  const { data: objectivesData, isLoading: objectivesLoading } = useObjectives({ enabled: objectivesEnabled });
  const rankedTitleStyle = {
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
          if (isGuest) { openAuthPrompt(); return; }
          if (onRankedIntercept?.()) return;
          setSelectedMode('ranked');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isGuest) { openAuthPrompt(); return; }
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
          <div className="hidden lg:flex items-stretch gap-6">
            {/* Left: Title + Play. Title is capped at the trophy's left edge
                (~40% of the card) so long locales (e.g. Georgian) wrap onto a
                second line instead of running under the absolute trophy. */}
            <div className="flex flex-1 min-w-0 flex-col">
              <h1
                className="max-w-[20rem] text-[clamp(1.75rem,3vw,2.75rem)] uppercase text-white [overflow-wrap:normal] [word-break:keep-all] [hyphens:none]"
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

              {/* Play sits flush with the card's bottom padding, matching the
                  secondary mode cards. */}
              <div className="mt-auto pt-5">
                <div className="flex h-[56px] w-[180px] items-center justify-center rounded-[8px] bg-surface-page text-xl uppercase tracking-wide text-white" style={poppins}>
                  {t('common.play')}
                </div>
                {/* Guest demo — ranked 1v1 vs AI; stopPropagation so the
                    hero's own onClick (auth prompt) doesn't swallow the tap. */}
                {isGuest && (
                  <Link
                    href="/demos/match?from=/play"
                    onClick={(event) => event.stopPropagation()}
                    className="mt-2 flex h-10 w-[180px] items-center justify-center gap-1.5 rounded-[8px] bg-black/25 text-[13px] uppercase tracking-wide text-white/90 transition-colors hover:bg-black/35"
                    style={poppins}
                  >
                    <Bot className="size-4" strokeWidth={2.5} />
                    {t('play.guestDemoCta')}
                  </Link>
                )}
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
                    ? <>{t('play.rpToTier', { rp: Math.max(0, (nextTierTargetRp ?? 0) - displayRp) })}<span className="text-brand-yellow">{tierLabelOf(nextTierBand.tier)}</span></>
                    : t('play.maxRankReached')}
              </div>
              {/* Betsson badge — in flow below the rank text so it can never
                  cover it, whatever height the text block reaches. */}
              {isEventMode && (
                <div
                  className="mt-2 inline-flex flex-col items-start rounded-lg px-3 py-1.5"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <span className="text-[8px] font-bold uppercase tracking-wider text-white/60 leading-none">Powered by</span>
                  <Image src="/assets/betsson/3.png" alt="Betsson Sport" width={96} height={18} className="h-4 w-auto object-contain mt-0.5" />
                </div>
              )}
            </div>
          </div>

          {/* ── Mobile layout ── */}
          <div className="lg:hidden">
            {/* Top row: title (left) | RP block (right) */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1
                  className="text-[1.55rem] leading-[1.05] uppercase text-white [overflow-wrap:normal] [word-break:keep-all] [hyphens:none]"
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
                      ? <>{t('play.rpToTier', { rp: Math.max(0, (nextTierTargetRp ?? 0) - displayRp) })}<span className="text-brand-yellow">{tierLabelOf(nextTierBand.tier)}</span></>
                      : t('play.maxRankReached')}
                </div>
                {/* Betsson badge — mobile only, below tier label, event only */}
                {isEventMode && (
                  <div
                    className="-mt-0.5 inline-flex flex-col items-end rounded-md px-2 py-1 lg:hidden"
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
              <div className="flex flex-col items-end gap-2">
                <div className="mb-1 flex h-[44px] w-[120px] items-center justify-center rounded-[8px] bg-surface-page text-[15px] uppercase tracking-wide text-white" style={poppins}>
                  {t('common.play')}
                </div>
                {/* Guest demo — ranked 1v1 vs AI (see desktop note). */}
                {isGuest && (
                  <Link
                    href="/demos/match?from=/play"
                    onClick={(event) => event.stopPropagation()}
                    className="flex h-9 w-[120px] items-center justify-center gap-1 rounded-[8px] bg-black/25 text-[11px] uppercase tracking-wide text-white/90 transition-colors hover:bg-black/35"
                    style={poppins}
                  >
                    <Bot className="size-3.5" strokeWidth={2.5} />
                    {t('play.guestDemoCta')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ─── 2. Weekend League — the weekly tournament, right under Ranked ─── */}
      {/* Instrumented at the placement, not inside Rail — the dev gallery
          mounts every Rail variant and would fire an impression per skin. */}
      <div
        onClickCapture={(event) => {
          trackWlBannerClicked();
          if (isGuest) {
            // The rail is a Link to the league tab — guests sign in first.
            event.preventDefault();
            event.stopPropagation();
            openAuthPrompt();
          }
        }}
      >
        <WeekendLeagueProgressExperimentRail />
      </div>

      {playHomeNotice}

      {/* ─── 2. Mode Cards — Auction + Tic-Tac-Toe (owner call: Friendly
          Match and Daily Challenge cards removed; every other game now lives
          in the All Games grid below). */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
        {/* Friendly first (owner call) — the original create/join-room card.
            Spans the mobile row so three cards never leave a dead half-column. */}
        <MiniModeCard
          bg={colors.blue.brand}
          title={t('play.friendlyMatch')}
          subtitle={t('play.friendlySubtitle')}
          iconSrc="/assets/friendly_match-icon.webp"
          ctaLabel={t('common.play')}
          onClick={() => (isGuest ? openAuthPrompt() : setSelectedMode('friendly'))}
          className="col-span-2 lg:col-span-1"
        />
        {/* Friendly / Daily / Auction keep the PROD card design (owner call
            2026-08-28): compact bespoke cards, not the MiniModeCard layout. */}
        {/* Auction (beta) — spans the mobile 2-col row so it never orphans */}
        {isAuctionCardEnabled && (
          <div
            onClick={() => setAuctionModalOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setAuctionModalOpen(true);
              }
            }}
            role="button"
            tabIndex={0}
            className="relative cursor-pointer overflow-hidden rounded-[10px] md:min-h-0 p-3 md:p-6 text-left active:translate-y-[2px] transition-all focus-visible:outline-none focus-visible:ring-2"
            style={{ backgroundColor: '#6B2FB3' }}
          >
            <span className="absolute top-2.5 right-2.5 md:top-4 md:right-4 z-20 rounded-full bg-brand-yellow px-2.5 py-1 text-[8px] md:text-[11px] uppercase tracking-wide text-black" style={poppins}>
              {t('play.auctionNewBadge')}
            </span>
            <Image
              src="/assets/auction-card-icon.webp"
              alt=""
              width={160}
              height={160}
              className="hidden lg:block absolute right-4 bottom-4 h-36 w-36 object-contain opacity-90 pointer-events-none"
            />
            <div className="relative z-10 flex h-full flex-col items-center text-center md:items-start md:text-left">
              <h3
                className="text-[0.95rem] leading-[1.05] uppercase text-white break-words [hyphens:auto] md:text-[clamp(1.5rem,2.4vw,2.25rem)]"
                style={poppins}
              >
                {t('play.auctionTitle')}
              </h3>
              <p className="mt-1 text-[10px] md:mt-1.5 md:text-base uppercase text-white" style={poppins}>{t('play.auctionSubtitle')}</p>
              <div className="mt-1.5 flex flex-1 items-center justify-center lg:hidden">
                <Image
                  src="/assets/auction-card-icon.webp"
                  alt=""
                  width={500}
                  height={500}
                  className="h-[110px] w-[110px] object-contain pointer-events-none"
                />
              </div>
              <div className="mt-1.5 flex h-[36px] w-full items-center justify-center rounded-[8px] bg-black text-[12px] uppercase tracking-wide text-white lg:hidden" style={poppins}>
                {t('common.play')}
              </div>
              <div className="mt-auto hidden pt-8 lg:block">
                <div className="flex h-11 w-[136px] shrink-0 items-center justify-center rounded-[8px] bg-black text-base uppercase tracking-wide text-white" style={poppins}>
                  {t('common.play')}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Tic-Tac-Toe — same compact card family as the row above. */}
        {isTicTacToeEnabled && (
          <div
            onClick={() => setGridModalOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setGridModalOpen(true);
              }
            }}
            role="button"
            tabIndex={0}
            className="relative cursor-pointer overflow-hidden rounded-[10px] md:min-h-0 p-3 md:p-6 text-left active:translate-y-[2px] transition-all focus-visible:outline-none focus-visible:ring-2"
            style={{ backgroundColor: colors.red.mid }}
          >
            <span className="absolute top-2.5 right-2.5 md:top-4 md:right-4 z-20 rounded-full bg-brand-yellow px-2.5 py-1 text-[8px] md:text-[11px] uppercase tracking-wide text-black" style={poppins}>
              {t('play.freeKicksNewBadge')}
            </span>
            <Image
              src={footballGridAssetUrl('/assets/football-grid/card-icon.png')!}
              alt=""
              width={160}
              height={160}
              className="hidden lg:block absolute right-4 bottom-4 h-36 w-36 object-contain opacity-90 pointer-events-none"
            />
            <div className="relative z-10 flex h-full flex-col items-center text-center md:items-start md:text-left">
              <h3
                className="text-[0.95rem] leading-[1.05] uppercase text-white break-words [overflow-wrap:normal] [word-break:keep-all] [hyphens:none] md:text-[clamp(1.5rem,2.4vw,2.25rem)]"
                style={poppins}
              >
                {t('play.footballGridTitle')}
              </h3>
              <p className="mt-1 text-[10px] md:mt-1.5 md:text-base uppercase text-white" style={poppins}>{t('play.footballGridSubtitle')}</p>
              <div className="mt-1.5 flex flex-1 items-center justify-center lg:hidden">
                <Image
                  src={footballGridAssetUrl('/assets/football-grid/card-icon.png')!}
                  alt=""
                  width={500}
                  height={500}
                  className="h-[110px] w-[110px] object-contain pointer-events-none"
                />
              </div>
              <div className="mt-1.5 flex h-[36px] w-full items-center justify-center rounded-[8px] bg-black text-[12px] uppercase tracking-wide text-white lg:hidden" style={poppins}>
                {t('common.play')}
              </div>
              <div className="mt-auto hidden pt-8 lg:block">
                <div className="flex h-11 w-[136px] shrink-0 items-center justify-center rounded-[8px] bg-black text-base uppercase tracking-wide text-white" style={poppins}>
                  {t('common.play')}
                </div>
              </div>
            </div>
          </div>
        )}
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

      {/* ─── 5. All Games — every mode as an artwork card, 3 per row on
              desktop / 2 on mobile (owner call). Sits above Recent Matches. ─── */}
      <div className="mt-6 md:mt-8">
        <AllGamesGrid />
      </div>

      {/* ─── 6. Recent Matches — hidden per owner call; kept mounted behind
              this flag so it can be restored in one line. ─── */}
      {SHOW_RECENT_MATCHES && <HomeRecentMatches collapsedOnly />}

      {/* ─── 5b. Socials + contact (mobile only — desktop uses the top-left
              header cluster in AppShell) ─── */}
      <div className="mt-6 flex flex-col items-center gap-3 border-t border-white/6 pt-6 xl:hidden">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/35">
          {t('welcome.followUs')}
        </p>
        <div className="flex items-center gap-2.5">
          <SocialLinks size="sm" className="gap-2.5" />
          <ContactModal
            trigger={
              <button
                type="button"
                aria-label={t('feedback.contactUs')}
                title={t('feedback.contactUs')}
                className="flex size-9 items-center justify-center rounded-[14px] bg-brand-yellow text-black shadow-[0_4px_0_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <MessageCircle className="size-4" />
              </button>
            }
          />
        </div>
      </div>

      {/* ─── 6. Modals ─── */}
      <ModeConfirmModal
        mode={selectedMode !== 'friendly' ? selectedMode : null}
        isOpen={!!selectedMode && selectedMode !== 'friendly'}
        onOpenChange={(open) => !open && setSelectedMode(null)}
        onConfirm={handleConfirm}
        ticketsRemaining={ticketsRemaining}
      />
      {/* Friendly opens the dedicated create/join-room modal (prod parity). */}
      <FriendPlayModal
        isOpen={selectedMode === 'friendly'}
        onOpenChange={(open) => !open && setSelectedMode(null)}
      />
      <AuctionModeModal
        isOpen={auctionModalOpen}
        onOpenChange={setAuctionModalOpen}
        onCreateRoom={() => {}}
        onFindOnline={() => {
          setAuctionModalOpen(false);
          if (isGuest) {
            openAuthPrompt();
            return;
          }
          router.push('/auction');
        }}
        demoHref={isGuest ? '/demos/auction?from=/play' : undefined}
      />
      <FootballGridModeModal
        isOpen={gridModalOpen}
        onOpenChange={setGridModalOpen}
        onFindOnline={(pack) => {
          setGridModalOpen(false);
          if (isGuest) {
            openAuthPrompt();
            return;
          }
          router.push(`/tic-tac-toe?source=matchmaking&pack=${pack}`);
        }}
        demoHref={isGuest ? '/demos/mini-football-grid?from=/play' : undefined}
      />
      {/* Guest sign-in: mounted only while signed out; every auth-gated tap
          above funnels into it via useAuthPromptStore. */}
    </motion.div>
  );
}
