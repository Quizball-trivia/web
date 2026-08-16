'use client';

import { motion } from 'motion/react';
import { Goal, Handshake, Coins, Cake, Trophy, CalendarDays, ShieldCheck, Shield, ArrowRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import type { MessageKey } from '@/lib/i18n/messages';
import { EASE } from '../../../constants/motion';
import type { PositionGroup, SeasonSnapshot } from '../../../types';

const eur = (v: number) => `€${Math.round(v / 1_000_000)}M`;

type Facet = { icon: typeof Goal; labelKey: MessageKey; get: (s: SeasonSnapshot) => string; money?: boolean };

/** Outfield lots reveal goals → assists; keepers reveal clean sheets → conceded.
 *  Both then reveal value → age → league (5 steps, matches SNAPSHOT_STAT_STEPS). */
const OUTFIELD_FACETS: Facet[] = [
  { icon: Goal, labelKey: 'auctionGame.clueGoals', get: (s) => `${s.goals}` },
  { icon: Handshake, labelKey: 'auctionGame.clueAssists', get: (s) => (s.assists != null ? `${s.assists}` : '—') },
  { icon: Coins, labelKey: 'auctionGame.clueMarketValue', get: (s) => eur(s.valueEur), money: true },
  { icon: Cake, labelKey: 'auctionGame.clueAge', get: (s) => `${s.age}` },
  { icon: Trophy, labelKey: 'auctionGame.clueLeague', get: (s) => s.league },
];
const GK_FACETS: Facet[] = [
  { icon: ShieldCheck, labelKey: 'auctionGame.clueCleanSheets', get: (s) => `${s.cleanSheets ?? '—'}` },
  { icon: Shield, labelKey: 'auctionGame.clueConceded', get: (s) => `${s.conceded ?? '—'}` },
  { icon: Coins, labelKey: 'auctionGame.clueMarketValue', get: (s) => eur(s.valueEur), money: true },
  { icon: Cake, labelKey: 'auctionGame.clueAge', get: (s) => `${s.age}` },
  { icon: Trophy, labelKey: 'auctionGame.clueLeague', get: (s) => s.league },
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
export function SnapshotClues({
  snapshots,
  visibleClues,
  variant,
  accent = '#FFE500',
  position,
}: {
  snapshots: SeasonSnapshot[];
  visibleClues: number;
  variant: 'card' | 'panel';
  accent?: string;
  position?: PositionGroup;
}) {
  const { t } = useLocale();
  const isCard = variant === 'card';
  const s = pickSeason(snapshots);
  // Scoring uses the LATER season's value (getFutureValue = last snapshot). Show
  // that season's YEAR so the bidder sees the time-gap they're betting on — the
  // value itself stays hidden (that's the gamble).
  const valueSeason = snapshots.at(-1)?.season ?? null;
  const showValueSeason = valueSeason != null && valueSeason !== s.season;
  const FACETS = position === 'GK' ? GK_FACETS : OUTFIELD_FACETS;
  const rowBg = isCard ? 'bg-black/[0.05]' : 'bg-white/[0.04]';
  const labelColor = isCard ? 'text-black/60' : 'text-white/55';
  const valueColor = isCard ? 'text-black' : 'text-white';
  const skeleton = isCard ? 'bg-black/10' : 'bg-white/10';

  return (
    <div className="space-y-2">
      {/* Chosen scout season → the season the value (and profit) is judged on.
          Only the value season's YEAR is shown here; its value is hidden. */}
      <div className="flex items-center justify-center gap-2 pb-0.5">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-4" style={{ color: accent }} />
          <span className="font-poppins text-sm font-black uppercase tracking-wide" style={{ color: accent }}>
            {s.season}
          </span>
          <span className={cn('font-poppins text-[11px] font-bold uppercase tracking-wide', labelColor)}>{t('auctionGame.scoutCluesLabel')}</span>
        </div>
        {showValueSeason && (
          <>
            <ArrowRight className={cn('size-3.5 shrink-0', isCard ? 'text-black/35' : 'text-white/35')} />
            <div className="flex items-center gap-1.5">
              <TrendingUp className={cn('size-4', isCard ? 'text-black/45' : 'text-white/45')} />
              <span className={cn('font-poppins text-sm font-black uppercase tracking-wide', valueColor)}>
                {valueSeason}
              </span>
              <span className={cn('font-poppins text-[11px] font-bold uppercase tracking-wide', labelColor)}>{t('auctionGame.scoutValueLabel')}</span>
            </div>
          </>
        )}
      </div>

      {FACETS.map((f, i) => {
        const revealed = i < visibleClues;
        const Icon = f.icon;
        return (
          <div key={f.labelKey} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5', rowBg)}>
            <Icon className={cn('size-4 shrink-0', isCard ? 'text-black/45' : 'text-white/40')} />
            <span className={cn('flex-1 font-poppins text-sm font-bold', labelColor)}>{t(f.labelKey)}</span>
            {revealed ? (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE.smooth }}
                className={cn('font-poppins text-base font-black tabular-nums', f.money ? (isCard ? 'text-black' : 'text-brand-yellow') : valueColor)}
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
