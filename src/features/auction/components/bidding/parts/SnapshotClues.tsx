'use client';

import { motion } from 'motion/react';
import { Goal, Handshake, Coins, Cake, Trophy, CalendarDays, ShieldCheck, Shield, ArrowRight, TrendingUp } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import type { MessageKey } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';
import { EASE } from '../../../constants/motion';
import type { PositionGroup, SeasonSnapshot } from '../../../types';

const eur = (v: number) =>
  v > 0 && v < 1_000_000 ? `€${Math.round(v / 1_000)}K` : `€${Math.round(v / 1_000_000)}M`;

type Facet = { icon: typeof Goal; labelKey: MessageKey; get: (s: SeasonSnapshot) => string; money?: boolean };

/** Outfield lots reveal goals → assists; keepers reveal clean sheets → conceded.
 *  Both then reveal value → age → league (5 steps, matches SNAPSHOT_STAT_STEPS). */
const OUTFIELD_FACETS: Facet[] = [
  { icon: Goal, labelKey: 'auctionGame.snapGoals', get: (s) => `${s.goals}` },
  { icon: Handshake, labelKey: 'auctionGame.snapAssists', get: (s) => (s.assists != null ? `${s.assists}` : '—') },
  { icon: Coins, labelKey: 'auctionGame.snapMarketValue', get: (s) => eur(s.valueEur), money: true },
  { icon: Cake, labelKey: 'auctionGame.snapAge', get: (s) => (s.age != null ? `${s.age}` : '—') },
  { icon: Trophy, labelKey: 'auctionGame.snapLeague', get: (s) => s.league },
];
const GK_FACETS: Facet[] = [
  { icon: ShieldCheck, labelKey: 'auctionGame.snapCleanSheets', get: (s) => `${s.cleanSheets ?? '—'}` },
  { icon: Shield, labelKey: 'auctionGame.snapConceded', get: (s) => `${s.conceded ?? '—'}` },
  { icon: Coins, labelKey: 'auctionGame.snapMarketValue', get: (s) => eur(s.valueEur), money: true },
  { icon: Cake, labelKey: 'auctionGame.snapAge', get: (s) => (s.age != null ? `${s.age}` : '—') },
  { icon: Trophy, labelKey: 'auctionGame.snapLeague', get: (s) => s.league },
];

/** The scout season = the EARLIEST snapshot. Scoring later uses a LATER season's
 *  value (see getFutureValue), so you're judging who will rise from here. */
function pickSeason(snapshots: SeasonSnapshot[]): SeasonSnapshot {
  return snapshots[0];
}

/**
 * The "scouting" clue format: the game picks one season, then reveals that
 * season's stats one at a time. Locked stats show a skeleton so nothing jumps.
 * The season's market value is a weak proxy for today's scoring value — that
 * gap (and which season was picked) is the bidder's gamble. `variant` swaps the
 * colour scheme (yellow card / dark panel).
 */
// Constant accent for the scout-season header: position colours cycled red /
// green / blue per round, which read as a warning state on red rounds.
const SEASON_ACCENT = '#4ADE80';

export function SnapshotClues({
  snapshots,
  visibleClues,
  variant,
  position,
}: {
  snapshots: SeasonSnapshot[];
  visibleClues: number;
  variant: 'card' | 'panel';
  /** Kept for call-site compatibility; the season accent is fixed green. */
  accent?: string;
  position?: PositionGroup;
}) {
  const accent = SEASON_ACCENT;
  const { t } = useLocale();
  const isCard = variant === 'card';
  const s = pickSeason(snapshots);
  // Scoring uses the LATER season's value (getFutureValue = last snapshot). Show
  // that season's YEAR so the bidder sees the time-gap they're betting on — the
  // value itself stays hidden (that's the gamble).
  const valueSeason = snapshots.at(-1)?.season ?? null;
  const showValueSeason = valueSeason != null && valueSeason !== s.season;
  const FACETS = position === 'GK' ? GK_FACETS : OUTFIELD_FACETS;
  // Both variants sit on the solid brand-blue card now: darkened inset rows,
  // full-white text so labels and numbers stay readable on blue.
  void isCard;
  const rowBg = 'bg-black/25';
  const labelColor = 'text-white/90';
  const valueColor = 'text-white';
  const skeleton = 'bg-white/25';

  return (
    <div className="space-y-1.5">
      {/* Chosen scout season → the season the value (and profit) is judged on.
          Only the value season's YEAR is shown here; its value is hidden. */}
      {/* Single line always: compact sizes + nowrap so the two season groups
          never stack on narrow phones. */}
      <div className="flex flex-nowrap items-center justify-center gap-x-1.5 px-1 pb-0.5">
        <div className="flex min-w-0 items-center gap-1">
          <CalendarDays className="size-3.5 shrink-0" style={{ color: accent }} />
          <span className="shrink-0 font-poppins text-[13px] font-black uppercase tracking-wide" style={{ color: accent }}>
            {s.season}
          </span>
          {/* Full word on desktop, abbreviation on phones (where it truncated). */}
          <span className={cn('truncate font-poppins text-[10px] font-bold uppercase tracking-wide', labelColor)}>
            <span className="sm:hidden">{t('auctionGame.snapCluesLabelShort')}</span>
            <span className="hidden sm:inline">{t('auctionGame.snapCluesLabel')}</span>
          </span>
        </div>
        {showValueSeason && (
          <>
            <ArrowRight className={cn('size-3 shrink-0', 'text-white/60')} />
            <div className="flex min-w-0 items-center gap-1">
              <TrendingUp className={cn('size-3.5 shrink-0', 'text-white/70')} />
              <span className={cn('shrink-0 font-poppins text-[13px] font-black uppercase tracking-wide', valueColor)}>
                {valueSeason}
              </span>
              <span className={cn('truncate font-poppins text-[10px] font-bold uppercase tracking-wide', labelColor)}>
                <span className="sm:hidden">{t('auctionGame.snapValueLabelShort')}</span>
                <span className="hidden sm:inline">{t('auctionGame.snapValueLabel')}</span>
              </span>
            </div>
          </>
        )}
      </div>

      {FACETS.map((f, i) => {
        const revealed = i < visibleClues;
        const Icon = f.icon;
        return (
          <div key={f.labelKey} className={cn('flex items-center gap-3 rounded-xl px-3 py-1.5', rowBg)}>
            <Icon className={cn('size-4 shrink-0', 'text-white/75')} />
            <span className={cn('flex-1 font-poppins text-sm font-bold', labelColor)}>{t(f.labelKey)}</span>
            {revealed ? (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE.smooth }}
                className={cn('font-poppins text-base font-black tabular-nums', f.money ? 'text-brand-yellow' : valueColor)}
              >
                {f.get(s)}
              </motion.span>
            ) : (
              <span className={cn('h-2.5 w-10 rounded-full', skeleton)} aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
